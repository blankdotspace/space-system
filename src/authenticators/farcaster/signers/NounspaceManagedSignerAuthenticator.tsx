import React, { useEffect, useRef, useState } from "react";
import {
  AuthenticatorInitializer,
  createAuthenticator,
  makeAuthenticatorMethods,
} from "@/authenticators/index";
import {
  FarcasterSignerAuthenticatorData,
  FarcasterSignerAuthenticatorMethods,
  FarcasterRegistrationType,
  SignerStatus,
} from ".";
import { isEqual, isUndefined, replace, startsWith } from "lodash";
import { ed25519 } from "@noble/curves/ed25519";
import { bytesToHex, hexToBytes } from "@noble/ciphers/utils";
import axiosBackend from "@/common/data/api/backend";
import { AxiosResponse } from "axios";
import { Button } from "@/common/components/atoms/button";
import Spinner from "@/common/components/atoms/spinner";
import {
  SignedKeyRequestResponse,
  SignerResponse,
} from "@/pages/api/signerRequests";
import QRCode from "@/common/components/atoms/qr-code";
import { SignatureScheme } from "@farcaster/core";
import { FaRedo } from "react-icons/fa";
import TextInput from "@/common/components/molecules/TextInput";
import { useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "@wagmi/core";
import { optimism } from "viem/chains";
import { KEY_GATEWAY_ADDRESS, keyGatewayABI } from "@farcaster/hub-web";
import {
  getSignedKeyRequestMetadataFromAppAccount,
  getDeadline,
} from "@/fidgets/farcaster/utils";
import { APP_FID } from "@/constants/app";
import { wagmiConfig } from "@/common/providers/Wagmi";

export type NounspaceDeveloperManagedSignerData =
  FarcasterSignerAuthenticatorData & {
    publicKeyHex?: string;
    privateKeyHex?: string;
    accountType?: FarcasterRegistrationType;
    status?: SignerStatus;
    signerUrl?: string;
  };

type WalletAuthState =
  | "idle"
  | "checking"
  | "signing"
  | "confirming"
  | "done"
  | "error";

const BACKEND_POLL_FREQUENCY = 1000;

class SignerNotProperlyInitializedError extends Error {
  constructor(message = "Signer not properly initialized", ...args) {
    super(message, ...args);
  }
}

function isDataInitialized(
  data: NounspaceDeveloperManagedSignerData,
  error = false,
) {
  if (
    isUndefined(data.privateKeyHex) ||
    isUndefined(data.publicKeyHex) ||
    isUndefined(data.accountType)
  ) {
    if (error) {
      throw new SignerNotProperlyInitializedError();
    }
    return false;
  }
  return true;
}

const retrieveSignerData = (data) => {
  return async () => {
    const resp: AxiosResponse<SignerResponse<SignedKeyRequestResponse>> =
      await axiosBackend.get("/api/signerRequests", {
        params: {
          token: data.token,
        },
      });
    return resp.data.value!;
  };
};

function stripKeyOhEx(key: string) {
  if (startsWith(key, "0x")) {
    return key.slice(2);
  }
  return key;
}

const methods: FarcasterSignerAuthenticatorMethods<NounspaceDeveloperManagedSignerData> =
  {
    isReady: (data) => {
      return async () => {
        return (
          data.status === "completed" &&
          !isUndefined(data.publicKeyHex) &&
          !isUndefined(data.privateKeyHex)
        );
      };
    },
    getSignerScheme: () => {
      return async () => {
        return SignatureScheme.ED25519;
      };
    },
    signMessage: (data) => {
      return async (messageHash: Uint8Array) => {
        if (isUndefined(data.publicKeyHex) || isUndefined(data.privateKeyHex)) {
          throw new SignerNotProperlyInitializedError();
        }

        return ed25519.sign(messageHash, stripKeyOhEx(data.privateKeyHex));
      };
    },
    getSignerPublicKey: (data) => {
      return async () => {
        isDataInitialized(data, true);
        return hexToBytes(stripKeyOhEx(data.publicKeyHex!));
      };
    },
    getSignerStatus: (data) => {
      return async () => {
        isDataInitialized(data, true);
        if (data.accountType === "account") {
          return "completed";
        }
        return (await retrieveSignerData(data)()).state;
      };
    },
    updateSignerInfo: (data, saveData) => {
      return async () => {
        if (!isDataInitialized(data)) {
          return;
        }
        const resp = await retrieveSignerData(data)();
        const newData = {
          ...data,
          signerFid: resp.requestFid || data.signerFid,
          accountFid: resp.userFid || data.accountFid,
          status: resp.state || data.status || "pending",
          signerUrl: resp.deeplinkUrl || data.signerUrl,
        };
        if (!isEqual(newData, data)) await saveData(newData);
      };
    },
    createNewSigner: (data, saveData) => {
      return async () => {
        const newPrivKey = ed25519.utils.randomPrivateKey();
        const publicKeyHex = `0x${bytesToHex(ed25519.getPublicKey(newPrivKey))}`;
        const resp: AxiosResponse<SignerResponse<SignedKeyRequestResponse>> =
          await axiosBackend.post("/api/signerRequests", {
            publicKey: publicKeyHex,
            requestingWallet: data.currentWalletAddress,
          });
        const signerData = resp.data.value!;
        await saveData({
          ...data,
          accountType: "signer",
          publicKeyHex: publicKeyHex,
          privateKeyHex: `0x${bytesToHex(newPrivKey)}`,
          signerFid: signerData.requestFid,
          status: signerData.state || "pending",
          signerUrl: signerData.deeplinkUrl,
          token: signerData.token,
          accountFid: signerData.userFid,
        });
        return signerData.deeplinkUrl;
      };
    },
    createNewAccount: (_data, _saveData) => {
      return () => {
        throw new Error("Function not implemented.");
      };
    },
    getSignerFid: (data) => {
      return async () => {
        isDataInitialized(data, true);
        if (data.accountType == "account") {
          return data.accountFid!;
        } else {
          return data.signerFid!;
        }
      };
    },
    getAccountFid: (data) => {
      return async () => {
        isDataInitialized(data, true);
        return data.accountFid!;
      };
    },
    getRegistrationType: (data) => {
      return async () => {
        isDataInitialized(data, true);
        return data.accountType!;
      };
    },
  };

function AuthorizeWithWalletButton({
  data,
  saveData,
  done,
}: {
  data: NounspaceDeveloperManagedSignerData;
  saveData: (data: NounspaceDeveloperManagedSignerData) => Promise<void>;
  done: () => void;
}) {
  const [walletAuthState, setWalletAuthState] =
    useState<WalletAuthState>("idle");
  const [walletAuthError, setWalletAuthError] = useState<string | undefined>(
    undefined,
  );
  const { writeContractAsync } = useWriteContract();

  async function authorizeWithWallet() {
    setWalletAuthState("checking");
    setWalletAuthError(undefined);

    try {
      const walletAddress = data.currentWalletAddress as
        | `0x${string}`
        | undefined;
      if (!walletAddress) {
        throw new Error("No wallet connected");
      }

      // Look up FID via Neynar backend API (avoids direct RPC/CORS issues)
      const resp = await axiosBackend.get("/api/farcaster/neynar/bulk-address", {
        params: { "addresses[]": walletAddress },
      });
      const neynarData = resp.data;
      const users = neynarData?.[walletAddress.toLowerCase()];
      const fid = Array.isArray(users) && users.length > 0 ? users[0].fid : undefined;
      if (!fid) {
        throw new Error(
          "No Farcaster ID found for your connected wallet. Please use a wallet that is registered as a Farcaster custody address.",
        );
      }

      const newPrivKey = ed25519.utils.randomPrivateKey();
      const publicKeyBytes = ed25519.getPublicKey(newPrivKey);
      const publicKeyHex = `0x${bytesToHex(publicKeyBytes)}` as `0x${string}`;
      const privateKeyHex = `0x${bytesToHex(newPrivKey)}`;

      const deadline = getDeadline();
      const metadata = await getSignedKeyRequestMetadataFromAppAccount(
        10, // Optimism chain ID
        publicKeyHex,
        deadline,
      );

      setWalletAuthState("signing");

      const txHash = await writeContractAsync({
        chain: optimism,
        address: KEY_GATEWAY_ADDRESS,
        abi: keyGatewayABI,
        functionName: "add",
        args: [1, publicKeyHex, 1, metadata],
      });

      setWalletAuthState("confirming");

      await waitForTransactionReceipt(wagmiConfig, {
        hash: txHash,
        chainId: optimism.id,
      });

      await saveData({
        ...data,
        accountType: "signer",
        publicKeyHex,
        privateKeyHex,
        accountFid: Number(fid),
        signerFid: APP_FID,
        status: "completed",
      });

      setWalletAuthState("done");
      done();
    } catch (e: any) {
      setWalletAuthState("error");
      if (e?.message?.includes("User rejected")) {
        setWalletAuthError("Transaction was rejected.");
      } else if (e?.message?.includes("insufficient funds")) {
        setWalletAuthError(
          "Insufficient funds for gas on Optimism.",
        );
      } else {
        setWalletAuthError(e?.message || "An unexpected error occurred.");
      }
    }
  }

  const statusMessages: Record<WalletAuthState, string> = {
    idle: "",
    checking: "Checking wallet...",
    signing: "Please confirm the transaction in your wallet...",
    confirming: "Waiting for transaction confirmation...",
    done: "Authorization complete!",
    error: "",
  };

  if (walletAuthState !== "idle" && walletAuthState !== "error") {
    return (
      <div className="flex flex-col items-center gap-2 mt-4">
        <Spinner />
        <p className="text-sm text-gray-500">
          {statusMessages[walletAuthState]}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center mt-4">
      <div className="flex items-center gap-3 w-full my-2">
        <div className="flex-1 h-px bg-gray-300" />
        <span className="text-sm text-gray-400">or</span>
        <div className="flex-1 h-px bg-gray-300" />
      </div>
      <Button
        variant="outline"
        className="mt-2 border-gray-400 text-gray-700 hover:bg-gray-100"
        onClick={authorizeWithWallet}
      >
        Authorize with Wallet
      </Button>
      {walletAuthState === "error" && walletAuthError && (
        <p className="text-sm text-red-500 mt-2 text-center max-w-xs">
          {walletAuthError}
        </p>
      )}
    </div>
  );
}

const initializer: AuthenticatorInitializer<
  NounspaceDeveloperManagedSignerData
> = ({ data, saveData, done }) => {
  const self = makeAuthenticatorMethods(methods, { data, saveData }, true);
  const [loading, setLoading] = useState(false);
  const pollInterval = useRef<NodeJS.Timeout | undefined>(undefined);
  const doneInterval = useRef<NodeJS.Timeout | undefined>(undefined);
  const [devFid, setDevFid] = useState("");

  function createSigner() {
    self.createNewSigner();
    startPolling();
  }

  function startPolling() {
    setLoading(true);
    pollInterval.current = setInterval(
      self.updateSignerInfo,
      BACKEND_POLL_FREQUENCY,
    );
    doneInterval.current = setInterval(() => {
      if (data.status === "completed") {
        done();
      }
    }, BACKEND_POLL_FREQUENCY);
  }

  useEffect(() => {
    if (isDataInitialized(data)) {
      startPolling();
    }
    return () => {
      clearInterval(pollInterval.current);
      clearInterval(doneInterval.current);
    };
  });

  function devSignin() {
    // In development, generate test signing keys so Quick Auth can work
    // These are random keys - not linked to a real Farcaster account
    const newPrivKey = ed25519.utils.randomPrivateKey();
    const publicKeyHex = `0x${bytesToHex(ed25519.getPublicKey(newPrivKey))}`;
    const privateKeyHex = `0x${bytesToHex(newPrivKey)}`;

    saveData({
      ...data,
      status: "completed",
      accountFid: Number(devFid),
      accountType: "signer", // Use signer type so keys are available
      publicKeyHex: publicKeyHex,
      privateKeyHex: privateKeyHex,
    });
  }

  const warpcastSignerUrl = data.signerUrl
    ? replace(data.signerUrl, "farcaster://", "https://warpcast.com/")
    : undefined;

  return (
    <div className="flex flex-col justify-center items-center align-center">
      <h1 className="text-4xl font-extrabold justify-start">
        Connect Farcaster
      </h1>
      {isUndefined(data.status) ||
      !isDataInitialized(data) ||
      data.status === "revoked" ? (
        <>
          <p className="text-lg text-gray-500 mt-4">
            Click the button below to connect your Farcaster account.
          </p>
          <Button
            style={{
              backgroundColor: "#7a5fbb",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginTop: "2em",
            }}
            className="px-10"
            onClick={createSigner}
          >
            <span>Sign in with</span>
            <img
              src="/fidgets/farcaster_nude.png"
              alt="Icon"
              style={{ width: "22px", height: "22px" }}
            />
          </Button>
          <AuthorizeWithWalletButton
            data={data}
            saveData={saveData}
            done={done}
          />
        </>
      ) : loading && warpcastSignerUrl ? (
        <>
          <div className="text-center mt-4">
            {process.env.NEXT_PUBLIC_VERCEL_ENV === "development" ? (
              <>
                <TextInput value={devFid} onChange={setDevFid}></TextInput>
                <Button withIcon variant="outline" onClick={devSignin}>
                  <p className="font-bold text-lg text-gray-500">
                    Skip Check and add use FID
                  </p>
                </Button>
              </>
            ) : null}
            <div className="m-20 mt-5 mb-5 border border-gray-200 p-1 rounded-sm">
              <QRCode
                value={String(warpcastSignerUrl) || "https://x.com"}
                size={256}
                bgColor="#ffffff"
                fgColor="#000000"
                level="Q"
                className="rounded-sm"
              />
            </div>
            <p className="text-xl text-gray-500 m-5">
              Scan the QR code with your phone camera <br /> or tap the button below
              if you&apos;re already on mobile.
            </p>
          </div>
          <div className="flex flex-col text-center mt-4">
            <center>
              <Button
                variant="outline"
                size="sm"
                className="border-gray-500 text-black bg-gray-200 border-none hover:bg-gray-300 hover:text-black rounded-full"
                style={{ width: "150px" }}
                asChild
              >
                <a
                  href={data.signerUrl ?? ""}
                  className="font-bold text-lg text-gray-500"
                >
                  On Mobile? Tap here
                </a>
              </Button>
            </center>
            <AuthorizeWithWalletButton
              data={data}
              saveData={saveData}
              done={done}
            />
            <Button
              withIcon
              size="md"
              className="border-none text-gray-400 bg-white hover:bg-white hover:text-purple-500 mt-20"
              onClick={createSigner}
            >
              <FaRedo color="gray.400" />
              Having trouble? Reset the QR
            </Button>
          </div>
        </>
      ) : (
        <center>
          <Spinner />
        </center>
      )}
    </div>
  );
};
initializer.displayName = "NounspaceDeveloperManagedSignerInitializer";

const auth = createAuthenticator<
  NounspaceDeveloperManagedSignerData,
  FarcasterSignerAuthenticatorMethods<NounspaceDeveloperManagedSignerData>
>("Nounspace Managed Farcaster Signer", methods, initializer);

export default auth;
