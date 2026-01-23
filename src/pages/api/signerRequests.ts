import requestHandler, {
  BlankspaceResponse,
} from "@/common/data/api/requestHandler";
import { APP_FID } from "@/constants/app";
import { AppSigner } from "@/constants/appServerSide";
import { WARPCAST_API } from "@/constants/urls";
import {
  SIGNED_KEY_REQUEST_TYPE,
  SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_DOMAIN,
} from "@farcaster/core";
import axios from "axios";
import { isArray, isUndefined } from "lodash";
import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Defines an API endpoint to manage the creation of signers from Warpcast
 *
 * This file is based on the guide offered by Warpcast
 * https://warpcast.notion.site/Signer-Request-API-Migration-Guide-Public-9e74827f9070442fb6f2a7ffe7226b3c
 *
 * Rough flow:
 * GET ->
 *   - takes in a given token (as returned by the POST method)
 *   - looks up the data from the warpcast API about the state of that token
 *   - returns the data or an error if the token is invalid or not provided
 * POST ->
 *   - takes in the Public key of the signer that is being created
 *   - builds a signer request object that is signed by the Nounspace account
 *   - adds a sponsorship field if the user is nOG holder (TO DO: change this as we leave alpha)
 *   - returns data about the new signer, including reference token and deeplinkUrl
 *   - errors if the public key is not provided
 */

type CreateSignerRequest = {
  publicKey: `0x${string}`;
  requestingWallet?: `0x${string}`;
};

export type SignerResponse<D> = BlankspaceResponse<D>;

type SignedKeyRequestSponsorship = {
  sponsorFid: number;
  signature: string; // sponsorship signature by sponsorFid
};

type SignedKeyRequestBody = {
  key: string;
  requestFid: number;
  deadline: number;
  signature: string; // key request signature by requestFid
  sponsorship?: SignedKeyRequestSponsorship;
};

export type SignedKeyRequestResponse = {
  token: string;
  deeplinkUrl: string;
  isSponsored: boolean;
  key: `0x${string}`;
  state: "pending" | "completed" | "approved";
  requestFid: number;
  userFid?: number;
};

type SignedKeyRequestResponseBody = {
  result: {
    signedKeyRequest: SignedKeyRequestResponse;
  };
};

export type AlchemyIsHolderOfContract = {
  isHolderOfContract: boolean;
};

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<SignerResponse<SignedKeyRequestResponse>>,
) {
  const { publicKey } = req.body as CreateSignerRequest;

  if (isUndefined(publicKey)) {
    return res.status(400).json({
      result: "error",
      error: {
        message: "No Public Key Provided",
      },
    });
  }

  const deadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
  const signature = await AppSigner.signTypedData({
    domain: SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_DOMAIN,
    types: {
      SignedKeyRequest: SIGNED_KEY_REQUEST_TYPE,
    },
    primaryType: "SignedKeyRequest",
    message: {
      requestFid: BigInt(APP_FID!),
      key: publicKey,
      deadline: BigInt(deadline),
    },
  });

  // We are sponsoring everything for now, set to false and uncomment below to token Gate
  const shouldSponsor = true; // let shouldSponsor = false;
  // if (!isUndefined(requestingWallet)) {
  //   try {
  //     const { data } = await axios.get<AlchemyIsHolderOfContract>(
  //       `${ALCHEMY_API("base")}nft/v3/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}/isHolderOfContract`,
  //       {
  //         params: {
  //           wallet: requestingWallet,
  //           contractAddress: NOGS_CONTRACT_ADDR,
  //         },
  //       },
  //     );
  //     shouldSponsor = data.isHolderOfContract
  //   } catch (e) {
  //     console.error(e);
  //   }
  // }

  let sponsorship: SignedKeyRequestSponsorship | undefined = undefined;
  if (shouldSponsor) {
    sponsorship = {
      sponsorFid: APP_FID!,
      signature: await AppSigner.signMessage({ message: { raw: signature } }),
    };
  }

  try {
    const requestArgs: SignedKeyRequestBody = {
      key: publicKey,
      requestFid: APP_FID!,
      signature,
      deadline,
      sponsorship,
    };
    const { data } = await axios.post<SignedKeyRequestResponseBody>(
      `${WARPCAST_API}/v2/signed-key-requests`,
      requestArgs,
    );

    return res.status(200).json({
      result: "success",
      value: data.result.signedKeyRequest,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      result: "error",
      error: {
        message: "An error occurred registering the signer",
      },
    });
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<SignerResponse<SignedKeyRequestResponse>>,
) {
  const token = req.query.token;

  if (isUndefined(token)) {
    return res.status(400).json({
      result: "error",
      error: {
        message: "No token Provided",
      },
    });
  }

  if (isArray(token)) {
    return res.status(400).json({
      result: "error",
      error: {
        message: "Only provide a single token",
      },
    });
  }

  try {
    const { data } = await axios.get<SignedKeyRequestResponseBody>(
      `${WARPCAST_API}/v2/signed-key-request`,
      {
        params: {
          token,
        },
      },
    );

    const value: SignedKeyRequestResponse = data.result.signedKeyRequest;

    return res.status(200).json({
      result: "success",
      value,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      result: "error",
      error: {
        message: "An error occurred registering the signer",
      },
    });
  }
}

export default requestHandler({
  post: handlePost,
  get: handleGet,
});
