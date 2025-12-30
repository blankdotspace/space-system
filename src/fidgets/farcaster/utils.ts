import axios, { isAxiosError } from "axios";
import {
  ID_REGISTRY_ADDRESS,
  KEY_GATEWAY_ADDRESS,
  SIGNED_KEY_REQUEST_TYPE,
  SIGNED_KEY_REQUEST_VALIDATOR_ADDRESS,
  SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_DOMAIN,
  Signer,
  UserDataType,
  idRegistryABI,
  keyGatewayABI,
  makeUserDataAdd,
  signedKeyRequestValidatorABI,
  FarcasterNetwork,
} from "@farcaster/hub-web";
import {
  LinkBody,
  makeLinkAdd,
  makeLinkRemove,
  makeReactionAdd,
  makeReactionRemove,
  Message,
  ReactionBody,
} from "@farcaster/core";
import { Address, encodeAbiParameters } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { optimismChaninClient } from "@/constants/optimismChainClient";
import axiosBackend from "@/common/data/api/backend";
import { type Channel } from "@mod-protocol/farcaster";
import { type FarcasterEmbed, isFarcasterUrlEmbed } from "./utils/embedTypes";

export const WARPCAST_RECOVERY_PROXY: `0x${string}` =
  "0x00000000FcB080a4D6c39a9354dA9EB9bC104cd7";

async function submitMessageToBackend(message: Message) {
  try {
    await axiosBackend.post(
      "/api/farcaster/neynar/publishMessage",
      Message.toJSON(message),
    );
    return true;
  } catch (e) {
    if (isAxiosError(e)) {
      return false;
    } else {
      throw e;
    }
  }
}

type ReactionParams = {
  authorFid: number;
  signer: Signer;
  reaction: ReactionBody;
};

const getDataOptions = (fid: number) => ({
  fid: fid,
  network: 1,
});

export const removeReaction = async ({
  authorFid,
  signer,
  reaction,
}: ReactionParams) => {
  const msg = await makeReactionRemove(
    reaction,
    { fid: authorFid, network: FarcasterNetwork.MAINNET },
    signer,
  );
  if (msg.isOk()) {
    return await submitMessageToBackend(msg.value);
  }
  return false;
};

export const publishReaction = async ({
  authorFid,
  signer,
  reaction,
}: ReactionParams) => {
  const msg = await makeReactionAdd(
    reaction,
    { fid: authorFid, network: FarcasterNetwork.MAINNET },
    signer,
  );
  if (msg.isOk()) {
    return await submitMessageToBackend(msg.value);
  }
  return false;
};

export const followUser = async (
  targetFid: number,
  fid: number,
  signer: Signer,
) => {
  const linkBody: LinkBody = {
    type: "follow",
    targetFid,
  };
  const msg = await makeLinkAdd(
    linkBody,
    { fid, network: FarcasterNetwork.MAINNET },
    signer,
  );
  if (msg.isOk()) {
    return await submitMessageToBackend(msg.value);
  }
  return false;
};

export const unfollowUser = async (
  targetFid: number,
  fid: number,
  signer: Signer,
) => {
  const linkBody: LinkBody = {
    type: "follow",
    targetFid,
  };
  const msg = await makeLinkRemove(
    linkBody,
    { fid, network: FarcasterNetwork.MAINNET },
    signer,
  );
  if (msg.isOk()) {
    return await submitMessageToBackend(msg.value);
  }
  return false;
};

export const submitCast = async (
  signedCastMessage: Message,
  fid: number,
  signer: Signer,
) => {
  try {
    const backendResponse = await submitMessageToBackend(signedCastMessage);
    if (!backendResponse) {
      console.error("submitMessageToBackend failed");
      return false;
    }
    return backendResponse;
  } catch (error) {
    console.error("Error in submitCast:", error);
    return false;
  }
};

export const getDeadline = (): bigint => {
  const now = Math.floor(Date.now() / 1000);
  const oneHour = 60 * 60;
  return BigInt(now + oneHour);
};

export const getTimestamp = (): number => {
  return Math.floor(Date.now() / 1000);
};

export const readNoncesFromKeyGateway = async (account: `0x${string}`) => {
  return await optimismChaninClient.readContract({
    abi: keyGatewayABI,
    address: KEY_GATEWAY_ADDRESS,
    functionName: "nonces",
    args: [account],
  });
};

export async function isValidSignedKeyRequest(
  fid: bigint,
  key: `0x${string}`,
  signedKeyRequest: `0x${string}`,
): Promise<boolean> {
  const res = await optimismChaninClient.readContract({
    address: SIGNED_KEY_REQUEST_VALIDATOR_ADDRESS,
    abi: signedKeyRequestValidatorABI,
    functionName: "validate",
    args: [fid, key, signedKeyRequest],
  });
  return res;
}

export const getSignedKeyRequestMetadataFromAppAccount = async (
  chainId: number,
  signerPublicKey: `0x${string}`,
  deadline: bigint | number,
) => {
  const appAccount = mnemonicToAccount(process.env.NEXT_PUBLIC_APP_MNEMONIC!);
  const fid = BigInt(process.env.NEXT_PUBLIC_APP_FID!);

  const signature = await appAccount.signTypedData({
    domain: {
      ...SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_DOMAIN,
      chainId,
    },
    types: {
      SignedKeyRequest: SIGNED_KEY_REQUEST_TYPE,
    },
    primaryType: "SignedKeyRequest",
    message: {
      requestFid: fid,
      key: signerPublicKey,
      deadline: BigInt(deadline),
    },
  });

  return encodeAbiParameters(
    [
      {
        components: [
          {
            name: "requestFid",
            type: "uint256",
          },
          {
            name: "requestSigner",
            type: "address",
          },
          {
            name: "signature",
            type: "bytes",
          },
          {
            name: "deadline",
            type: "uint256",
          },
        ],
        type: "tuple",
      },
    ],
    [
      {
        requestFid: fid,
        requestSigner: appAccount.address,
        deadline: BigInt(deadline),
        signature,
      },
    ],
  );
};

const IdContract = {
  abi: idRegistryABI,
  address: ID_REGISTRY_ADDRESS,
  chain: 10,
};

export const getFidForAddress = async (
  address: `0x${string}`,
): Promise<bigint | undefined> => {
  if (!address) return;

  const client = optimismChaninClient;

  return await client.readContract({
    ...IdContract,
    functionName: "idOf",
    args: [address],
  });
};

const FARCASTER_FNAME_ENDPOINT = "https://fnames.farcaster.xyz/transfers";

// example implementation here:
// https://github.com/us3r-network/u3/blob/a6910b01fa0cf5cdba384f935544c6ba94dc7d64/apps/u3/src/components/social/farcaster/signupv2/FnameRegister.tsx

export const validateUsernameIsAvailable = async (username: string) => {
  const response = await axios.get(
    `${FARCASTER_FNAME_ENDPOINT}?name=${username}`,
  );
  if (response.status !== 200) {
    throw new Error("Failed to validate username");
  }

  const transfers = response.data.transfers;
  return transfers.length === 0;
};

export const getUsernameForFid = async (fid: number) => {
  const response = await axios.get(`${FARCASTER_FNAME_ENDPOINT}?fid=${fid}`);
  if (response.status !== 200) {
    throw new Error("Failed to get username for fid");
  }

  const transfers = response.data.transfers.filter((t) => t.to === fid);
  if (transfers.length === 0) {
    return undefined;
  } else {
    return transfers[transfers.length - 1].username;
  }
};

type UpdateUsernameParams = {
  fid: string;
  username: string;
  timestamp: number;
  owner: `0x${string}`;
  signature: `0x${string}`;
  toFid?: string;
  fromFid?: string;
};

export const updateUsernameOffchain = async ({
  fid,
  fromFid,
  toFid,
  username,
  timestamp,
  owner,
  signature,
}: UpdateUsernameParams) => {
  if (!fromFid && !toFid) {
    throw new Error("fromFid or toFid must be provided");
  }
  // {
  //   "name": "hubble", // Name to register
  //   "from": 0,  // Fid to transfer from (0 for a new registration)
  //   "to": 123, // Fid to transfer to (0 to unregister)
  //   "fid": 123, // Fid making the request (must match from or to)
  //   "owner": "0x...", // Custody address of fid making the request
  //   "timestamp": 1641234567,  // Current timestamp in seconds
  //   "signature": "0x..."  // EIP-712 signature signed by the custody address of the fid
  // }
  try {
    const payload = {
      name: username,
      fid: Number(fid),
      to: Number(toFid),
      from: Number(fromFid),
      owner,
      timestamp,
      signature,
    };

    const res = await axios.post(FARCASTER_FNAME_ENDPOINT, payload);

    return res.data;
  } catch (e: any) {
    console.error("updateUsername error", e);
    if (e.response.data.code === "THROTTLED")
      throw new Error("You can only change your username every 28 days.");
    else
      throw new Error(
        "Failed to register current username: " +
        e.response.data?.error +
        " " +
        e.response.data?.code,
      );
  }
};

export const setUserDataInProtocol = async (
  signer: Signer,
  fid: number,
  type: UserDataType,
  value: string,
) => {
  const dataOptions = getDataOptions(fid);

  const msg = await makeUserDataAdd({ type, value }, dataOptions, signer);

  if (msg.isErr()) {
    throw msg.error;
  } else {
    return await submitMessageToBackend(msg.value);
  }
};

const EIP_712_USERNAME_PROOF = [
  { name: "name", type: "string" },
  { name: "timestamp", type: "uint256" },
  { name: "owner", type: "address" },
];

const EIP_712_USERNAME_DOMAIN = {
  name: "Farcaster name verification",
  version: "1",
  chainId: 1,
  verifyingContract: "0xe3Be01D99bAa8dB9905b33a3cA391238234B79D1" as Address,
};

const USERNAME_PROOF_EIP_712_TYPES = {
  domain: EIP_712_USERNAME_DOMAIN,
  types: { UserNameProof: EIP_712_USERNAME_PROOF },
};

export const getSignatureForUsernameProof = async (
  client,
  address,
  message: {
    name: string;
    owner: string;
    timestamp: bigint;
  },
): Promise<`0x${string}` | undefined> => {
  if (!address || !client) return;

  const signature = await client.signTypedData({
    ...USERNAME_PROOF_EIP_712_TYPES,
    account: address,
    primaryType: "UserNameProof",
    message: message,
  });
  return signature;
};

export async function fetchChannelsForUser(
  fid: number,
  limit: number = 20,
): Promise<Channel[]> {
  try {
    const channelsResponse = await axiosBackend.get(
      `/api/farcaster/neynar/active-channels/?limit=${limit}&fid=${fid}`,
    );
    return channelsResponse.data.channels as Channel[];
  } catch (e) {
    return [] as Channel[];
  }
}

export async function fetchChannelsByName(
  query: string,
  limit: number = 20,
): Promise<Channel[]> {
  try {
    const channelsResponse = await axiosBackend.get(
      `/api/farcaster/neynar/search-channels?limit=${limit}&q=${query}`,
    );
    return channelsResponse.data.channels as Channel[];
  } catch (e) {
    return [] as Channel[];
  }
}
