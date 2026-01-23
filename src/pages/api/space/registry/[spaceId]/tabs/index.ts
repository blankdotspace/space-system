// Create new tab
import requestHandler, {
  BlankspaceResponse,
} from "@/common/data/api/requestHandler";
import createSupabaseServerClient from "@/common/data/database/supabase/clients/server";
import {
  isSignable,
  Signable,
  SignedFile,
  validateSignable,
} from "@/common/lib/signedFiles";
import { NextApiRequest, NextApiResponse } from "next/types";
import { identityCanModifySpace } from "./[tabId]";
import stringify from "fast-json-stable-stringify";
import { INITIAL_SPACE_CONFIG_EMPTY } from "@/config";
import moment from "moment";
import { isNull } from "lodash";

export type RegisterNewSpaceTabResponse = BlankspaceResponse<string>;

export type UnsignedSpaceTabRegistration = {
  identityPublicKey: string;
  timestamp: string;
  spaceId: string;
  tabName: string;
  initialConfig?: any;
  network?: string;
};

export type SpaceTabRegistration = UnsignedSpaceTabRegistration & Signable;

function isSpaceTabRegistration(thing: unknown): thing is SpaceTabRegistration {
  return (
    isSignable(thing, "identityPublicKey") &&
    typeof thing["identityPublicKey"] === "string" &&
    typeof thing["timestamp"] === "string" &&
    typeof thing["tabName"] === "string" &&
    typeof thing["spaceId"] === "string"
  );
}

// Handles the registration of a new space tab to requesting identity
async function registerNewSpaceTab(
  req: NextApiRequest,
  res: NextApiResponse<RegisterNewSpaceTabResponse>,
) {
  const registration = req.body;
  if (!isSpaceTabRegistration(registration)) {
    console.error("Invalid registration:", registration);
    res.status(400).json({
      result: "error",
      error: {
        message:
          "Registration of a new tab requires identityPublicKey, timestamp, spaceId, tabName, and signature",
      },
    });
    return;
  }
  if (registration.spaceId !== req.query.spaceId) {
    console.error(
      "Space ID mismatch:",
      registration.spaceId,
      req.query.spaceId,
    );
    res.status(400).json({
      result: "error",
      error: {
        message: "Space ID in url must match one in request",
      },
    });
    return;
  }
  // TODO: check that timestamp is recent (1 minute? 5 minutes?)
  if (!validateSignable(registration, "identityPublicKey")) {
    console.error("Invalid signature:", registration);
    res.status(400).json({
      result: "error",
      error: {
        message: "Invalid signature",
      },
    });
    return;
  }
  if (
    !(await identityCanModifySpace(
      registration.identityPublicKey,
      registration.spaceId,
      registration.network,
    ))
  ) {
    console.error(
      "Identity cannot manage space:",
      registration.identityPublicKey,
      registration.spaceId,
    );
    res.status(400).json({
      result: "error",
      error: {
        message: `Identity ${registration.identityPublicKey} cannot manage space ${registration.spaceId}`,
      },
    });
    return;
  }
  // TO DO: Check that the user can register more tabs
  // Currently we are allowing unlimited files on server side

  // console.log(
  //   "registerNewSpaceTab called on registry/[spaceId]/tabs with",
  //   registration,
  // );

  const uploadedFile: SignedFile = registration?.initialConfig
    ? (registration as any)
    : {
      fileData: stringify(INITIAL_SPACE_CONFIG_EMPTY),
      fileType: "json",
      isEncrypted: false,
      timestamp: moment().toISOString(),
      // TO DO: Create a Nounspace signer and use it verify our files
      // This will allow us to do client side validation better
      // Current this is insecure to a man in the middle attack
      publicKey: "nounspace",
      signature: "not applicable, machine generated file",
    };
  const { error, data } = await createSupabaseServerClient()
    .storage
    .from("spaces")
    .upload(
      `${registration.spaceId}/tabs/${registration.tabName}`,
      new Blob([stringify(uploadedFile)], { type: "application/json" }),
      { upsert: true },
    );
  
  // console.log("[registry space] Tab Registration Response:", {
  //   data,
  //   error: error ? error.message : null,
  //   spaceId: registration.spaceId,
  //   tabName: registration.tabName
  // });

  if (!isNull(error)) {
    console.error("Error uploading file:", error);
    res.status(500).json({
      result: "error",
      error: {
        message: error.message,
      },
    });
    return;
  }

  if (!data) {
    console.error("No data returned from Supabase upload");
    res.status(500).json({
      result: "error",
      error: {
        message: "Failed to upload tab configuration",
      },
    });
    return;
  }

  res.status(200).json({
    result: "success",
    value: registration.tabName,
  });
}

export default requestHandler({
  post: registerNewSpaceTab,
});
