import { isArray, find, isUndefined, isNull, findIndex } from "lodash";
import { Wallet, ConnectedWallet } from "@privy-io/react-auth";
import { ed25519 } from "@noble/curves/ed25519";
import { xchacha20poly1305 } from "@noble/ciphers/chacha";
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha256";
import { managedNonce, randomBytes } from "@noble/ciphers/webcrypto";
import {
  bytesToHex,
  bytesToUtf8,
  hexToBytes,
  utf8ToBytes,
} from "@noble/ciphers/utils";
import { StoreGet, StoreSet } from "../../createStore";
import { AppStore } from "..";
import { createClient } from "../../../database/supabase/clients/component";
import axiosBackend from "../../../api/backend";
import {
  IdentityRequest,
  IdentityResponse,
  UnsignedIdentityRequest,
} from "@/pages/api/space/identities";
import { SignMessageFunctionSignature } from "./privyStore";
import { rootKeyPath } from "@/constants/supabase";
import stringify from "fast-json-stable-stringify";
import moment from "moment";
import axios from "axios";
import {
  SignedFile,
  UnsignedFile,
  hashObject,
  signSignable,
} from "@/common/lib/signedFiles";
import { PreSpaceKeys } from "./prekeyStore";
import { AnalyticsEvent } from "@/common/constants/analyticsEvents";
import { analytics } from "@/common/providers/AnalyticsProvider";
export interface SpaceKeys {
  publicKey: string;
  privateKey: string;
}

type RootSpaceKeys = SpaceKeys & {
  type: "root";
  salt: string;
};

export interface SpaceIdentity {
  rootKeys: RootSpaceKeys;
  preKeys: PreSpaceKeys[];
  associatedFids: number[];
}

interface IdentityState {
  currentSpaceIdentityPublicKey?: string;
  spaceIdentities: SpaceIdentity[];
  walletIdentities: {
    [key: string]: IdentityRequest[];
  };
}

interface IdentityActions {
  loadIdentitiesForWallet: (wallet: Wallet) => Promise<IdentityRequest[]>;
  decryptIdentityKeys: (
    signMessage: SignMessageFunctionSignature,
    wallet: Wallet,
    identityPublicKey: string,
  ) => Promise<void>;
  createIdentityForWallet: (
    signMessage: SignMessageFunctionSignature,
    wallet: Wallet,
  ) => Promise<string>;
  setCurrentIdentity: (publicKey: string) => void;
  getCurrentIdentity: () => SpaceIdentity | undefined;
  getCurrentIdentityIndex: () => number;
  getIdentitiesForWallet: (wallet: Wallet) => IdentityRequest[];
  resetIdenities: () => void;
}

export type IdentityStore = IdentityState & IdentityActions;

export const identityDefault: IdentityState = {
  currentSpaceIdentityPublicKey: "",
  spaceIdentities: [],
  walletIdentities: {},
};

class IdentitytDecryptError extends Error {
  constructor(
    identityPublicKey: string,
    walletAddress: string,
    message: string = "",
    ...args
  ) {
    super(
      `Unable to decrypt identity ${identityPublicKey} for wallet ${walletAddress}: ${message}`,
      ...args,
    );
  }
}

const moreInfo = "For more info: https://nounspace.com/signatures/";
const identityMessaage = "SPACE Identity:";

function randomNonce(length = 32) {
  return bytesToHex(randomBytes(length));
}

function generateMessage(nonce) {
  return `${identityMessaage}\n${nonce}\n${moreInfo}`;
}

export function stringToCipherKey(str: string): Uint8Array {
  return hkdf(sha256, str, "salt", "", 32);
}

async function decryptKeyFile(
  signMessage: SignMessageFunctionSignature,
  wallet: Wallet,
  nonce: string,
  encryptedBlob: Uint8Array,
): Promise<RootSpaceKeys | PreSpaceKeys> {
  // Ensure wallet has required properties for signing
  if (!wallet.address) {
    throw new Error("Wallet must have an address to sign messages");
  }
  
  const signature = await signMessage(
    wallet as Partial<ConnectedWallet>,
    generateMessage(nonce)
  );
  const cipher = managedNonce(xchacha20poly1305)(stringToCipherKey(signature));
  return JSON.parse(bytesToUtf8(cipher.decrypt(encryptedBlob))) as
    | RootSpaceKeys
    | PreSpaceKeys;
}

async function encryptKeyFile(
  signMessage: SignMessageFunctionSignature,
  wallet: Wallet,
  nonce: string,
  keysToEncrypt: RootSpaceKeys | PreSpaceKeys,
): Promise<Uint8Array> {
  // Ensure wallet has required properties for signing
  if (!wallet.address) {
    throw new Error("Wallet must have an address to sign messages");
  }
  
  const signature = await signMessage(
    wallet as Partial<ConnectedWallet>,
    generateMessage(nonce)
  );
  const cipher = managedNonce(xchacha20poly1305)(stringToCipherKey(signature));
  return cipher.encrypt(utf8ToBytes(stringify(keysToEncrypt)));
}

export const identityStore = (
  set: StoreSet<AppStore>,
  get: StoreGet<AppStore>,
): IdentityStore => ({
  ...identityDefault,
  resetIdenities: () => {
    set(
      (draft) => {
        draft.account.currentSpaceIdentityPublicKey = "";
        draft.account.spaceIdentities = [];
        draft.account.walletIdentities = {};
      },
      "resetIdenities",
      true,
    );
  },
  getCurrentIdentity: () => {
    const state = get();
    return find(state.account.spaceIdentities, {
      rootKeys: { publicKey: state.account.currentSpaceIdentityPublicKey },
    });
  },
  getCurrentIdentityIndex: () => {
    const state = get();
    return findIndex(state.account.spaceIdentities, {
      rootKeys: { publicKey: state.account.currentSpaceIdentityPublicKey },
    });
  },
  setCurrentIdentity: (publicKey: string) => {
    set((draft) => {
      draft.account.currentSpaceIdentityPublicKey = publicKey;
    }, "setCurrentIdentity");
  },
  loadIdentitiesForWallet: async (wallet: Wallet) => {
    // Load Identity + Nonce + Wallet address info from DB
    const { data }: { data: IdentityResponse } = await axiosBackend.get(
      "/api/space/identities",
      {
        params: {
          address: wallet.address,
        },
      },
    );
    const walletIdentities = data.value
      ? isArray(data.value)
        ? data.value
        : [data.value]
      : [];
    set((draft) => {
      draft.account.walletIdentities[wallet.address] = walletIdentities;
    }, "loadIdentitiesForWallet");
    return walletIdentities;
  },
  getIdentitiesForWallet: (wallet: Wallet) => {
    return get().account.walletIdentities[wallet.address] || [];
  },
  decryptIdentityKeys: async (
    signMessage: SignMessageFunctionSignature,
    wallet: Wallet,
    identityPublicKey: string,
  ) => {
    const supabase = createClient();
    const walletIdentityInfo = find(
      get().account.walletIdentities[wallet.address],
      {
        identityPublicKey: identityPublicKey,
      },
    );
    if (isUndefined(walletIdentityInfo)) {
      throw new IdentitytDecryptError(
        identityPublicKey,
        wallet.address,
        "Nonce not found",
      );
    }
    const {
      data: { publicUrl },
    } = await supabase.storage
      .from("private")
      .getPublicUrl(rootKeyPath(identityPublicKey, wallet.address));
    if (!publicUrl) {
      throw new IdentitytDecryptError(
        identityPublicKey,
        wallet.address,
        "Blob not found",
      );
    }
    const { data }: { data: Blob } = await axios.get(publicUrl, {
      responseType: "blob",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
    if (isNull(data)) {
      throw new IdentitytDecryptError(
        identityPublicKey,
        wallet.address,
        "Blob not found",
      );
    }
    const fileData = JSON.parse(await data.text()) as SignedFile;
    let keys: RootSpaceKeys;
    if (fileData.isEncrypted === false) {
      // Key file from edge function (e.g. agent registration) is stored unencrypted
      keys = JSON.parse(
        bytesToUtf8(hexToBytes(fileData.fileData)),
      ) as RootSpaceKeys;
    } else {
      keys = (await decryptKeyFile(
        signMessage,
        wallet,
        walletIdentityInfo.nonce,
        hexToBytes(fileData.fileData),
      )) as RootSpaceKeys;
    }
    set((draft) => {
      draft.account.spaceIdentities.push({
        rootKeys: keys,
        preKeys: [],
        associatedFids: [],
      });
    }, "decryptIdentityKeys");
  },
  createIdentityForWallet: async (
    signMessage: SignMessageFunctionSignature,
    wallet: Wallet,
  ) => {
    const privateKey = ed25519.utils.randomPrivateKey();
    const publicKey = ed25519.getPublicKey(privateKey);
    const identityKeys: RootSpaceKeys = {
      publicKey: bytesToHex(publicKey),
      privateKey: bytesToHex(privateKey),
      type: "root",
      salt: randomNonce(32),
    };
    const nonce = randomNonce();
    const keyFile: UnsignedFile = {
      publicKey: bytesToHex(publicKey),
      fileData: bytesToHex(
        await encryptKeyFile(signMessage, wallet, nonce, identityKeys),
      ),
      fileType: "json",
      isEncrypted: true,
      timestamp: moment().toISOString(),
    };
    const signedKeyFile = signSignable(keyFile, privateKey);
    const identityRequestUnsigned: UnsignedIdentityRequest = {
      type: "Create",
      identityPublicKey: bytesToHex(publicKey),
      walletAddress: wallet.address,
      nonce,
      timestamp: moment().toISOString(),
    };
    const identityRequest: IdentityRequest = {
      ...identityRequestUnsigned,
      signature: bytesToHex(
        ed25519.sign(hashObject(identityRequestUnsigned), privateKey),
      ),
    };
    const postData = {
      file: signedKeyFile,
      identityRequest,
    };
    await axiosBackend.post("/api/space/identities", postData, {
      headers: { "Content-Type": "application/json" },
    });
    analytics.track(AnalyticsEvent.SIGN_UP);
    set((draft) => {
      draft.account.spaceIdentities.push({
        rootKeys: identityKeys,
        preKeys: [],
        associatedFids: [],
      });
    }, "createIdentityForWallet");
    return identityKeys.publicKey;
  },
});

export const partializedIdentityStore = (state: AppStore) => ({
  currentSpaceIdentityPublicKey: state.account.currentSpaceIdentityPublicKey,
  spaceIdentities: state.account.spaceIdentities,
  walletIdentities: state.account.walletIdentities,
});
