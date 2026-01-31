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

export type NounspaceDeveloperManagedSignerData =
  FarcasterSignerAuthenticatorData & {
    publicKeyHex?: string;
    privateKeyHex?: string;
    accountType?: FarcasterRegistrationType;
    status?: SignerStatus;
    signerUrl?: string;
  };

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
    const newPrivKey = ed25519.utils.randomPrivateKey();
    const publicKeyHex = `0x${bytesToHex(ed25519.getPublicKey(newPrivKey))}`;
    saveData({
      ...data,
      status: "completed",
      accountFid: Number(devFid),
      accountType: "account",
      publicKeyHex,
      privateKeyHex: `0x${bytesToHex(newPrivKey)}`,
    });
    done();
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
