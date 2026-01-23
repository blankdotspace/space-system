import requestHandler, {
  BlankspaceResponse,
} from "@/common/data/api/requestHandler";
import { validateSignable, Signable } from "@/common/lib/signedFiles";
import { NextApiRequest, NextApiResponse } from "next/types";
import createSupabaseServerClient from "@/common/data/database/supabase/clients/server";
import {
  first,
  fromPairs,
  includes,
  isArray,
  isNil,
  isNull,
  isObject,
  isUndefined,
  map,
} from "lodash";
import moment from "moment";

export type SpaceOrder = {
  spaceId: string;
  name: string;
}[];
export type UpdateSpaceOrderResponse = BlankspaceResponse<SpaceOrder>;
export type UnsignedUpdateSpaceOrderRequest = {
  identityPublicKey: string;
  timestamp: string;
  ordering: string[];
  fid: number;
};
export type UpdateSpaceOrderRequest = UnsignedUpdateSpaceOrderRequest &
  Signable;

function isUpdateSpaceOrderRequest(
  maybe: unknown,
): maybe is UpdateSpaceOrderRequest {
  return (
    isObject(maybe) &&
    typeof maybe["identityPublicKey"] === "string" &&
    typeof maybe["signature"] === "string" &&
    typeof maybe["timestamp"] === "string" &&
    typeof maybe["fid"] === "number" &&
    isArray(maybe["ordering"])
  );
}

async function getSpaceOrder(
  req: NextApiRequest,
  res: NextApiResponse<UpdateSpaceOrderResponse>,
) {
  const fid = req.query.fid;
  if (isUndefined(fid) || isArray(fid)) {
    res.status(400).json({
      result: "error",
      error: {
        message: "fid must be provided as a single query argument",
      },
    });
    return;
  }
  const { data: orders, error } = await createSupabaseServerClient()
    .from("spaceOrderings")
    .select("ordering")
    .eq("fid", +fid);
  if (isNull(orders)) {
    res.status(500).json({
      result: "error",
      error: {
        message: error?.message || "an unknown error occurred",
      },
    });
    return;
  }
  const order = first(orders);
  if (isUndefined(order)) {
    res.status(200).json({
      result: "success",
      value: [],
    });
    return;
  }
  const { data: spacesForOrdering, error: spacesForOrderingError } =
    await createSupabaseServerClient()
      .from("spaceRegistrations")
      .select("spaceId, spaceName")
      .eq("fid", +fid)
      .in("spaceId", order.ordering);
  if (spacesForOrderingError) {
    res.status(500).json({
      result: "error",
      error: {
        message: spacesForOrderingError.message,
      },
    });
    return;
  }
  if (isNull(spacesForOrdering)) {
    res.status(500).json({
      result: "error",
      error: {
        message: "Query returned no data",
      },
    });
    return;
  }
  const namesForIds = fromPairs(
    map(spacesForOrdering, (s) => [s.spaceId, s.spaceName]),
  );
  res.status(200).json({
    result: "success",
    value: map(order.ordering, (spaceId) => ({
      spaceId,
      name: namesForIds[spaceId],
    })),
  });
}

async function updateSpaceOrder(
  req: NextApiRequest,
  res: NextApiResponse<UpdateSpaceOrderResponse>,
) {
  const updateOrderReq: UpdateSpaceOrderRequest = req.body;
  if (!isUpdateSpaceOrderRequest(updateOrderReq)) {
    res.status(400).json({
      result: "error",
      error: {
        message:
          "Config must contain identityPublicKey, fileData, fileType, isEncrypted, and timestamp",
      },
    });
    return;
  }
  if (!validateSignable(updateOrderReq, "identityPublicKey")) {
    res.status(400).json({
      result: "error",
      error: {
        message: "Invalid signature",
      },
    });
    return;
  }
  const { data: fidsForPublicKey, error: fidLookupError } = await createSupabaseServerClient()
    .from("fidRegistrations")
    .select("fid")
    .eq("identityPublicKey", updateOrderReq.identityPublicKey);
  if (fidLookupError) {
    res.status(500).json({
      result: "error",
      error: {
        message: fidLookupError.message,
      },
    });
    return;
  }
  if (isNull(fidsForPublicKey)) {
    res.status(500).json({
      result: "error",
      error: {
        message: "Query returned no data",
      },
    });
    return;
  }
  if (
    !includes(
      map(fidsForPublicKey, (d) => d.fid),
      updateOrderReq.fid,
    )
  ) {
    res.status(400).json({
      result: "error",
      error: {
        message: "Space ID cannot edit that FID",
      },
    });
    return;
  }
  const { data: currentRecords, error: currentRecordLookupError } =
    await createSupabaseServerClient()
      .from("spaceOrderings")
      .select("timestamp")
      .eq("fid", updateOrderReq.fid);
  if (currentRecordLookupError) {
    res.status(500).json({
      result: "error",
      error: {
        message: currentRecordLookupError.message,
      },
    });
    return;
  }
  if (isNull(fidsForPublicKey)) {
    res.status(500).json({
      result: "error",
      error: {
        message: "Query returned no data",
      },
    });
    return;
  }
  const currentRecord = first(currentRecords);
  if (
    !isNil(currentRecord) &&
    moment(currentRecord.timestamp).isAfter(moment(updateOrderReq.timestamp))
  ) {
    res.status(400).json({
      result: "error",
      error: {
        message: "Timestamp for request is older than current record",
      },
    });
    return;
  }
  const { data: spacesForOrdering, error: spacesForOrderingError } =
    await createSupabaseServerClient()
      .from("spaceRegistrations")
      .select("spaceId, spaceName")
      .eq("fid", updateOrderReq.fid)
      .in("spaceId", updateOrderReq.ordering);
  if (spacesForOrderingError) {
    res.status(500).json({
      result: "error",
      error: {
        message: spacesForOrderingError.message,
      },
    });
    return;
  }
  if (isNull(spacesForOrdering)) {
    res.status(500).json({
      result: "error",
      error: {
        message: "Query returned no data",
      },
    });
    return;
  }
  if (spacesForOrdering.length !== updateOrderReq.ordering.length) {
    res.status(400).json({
      result: "error",
      error: {
        message:
          "Space Ids provided are not all associated with the fid provided",
      },
    });
    return;
  }
  const { error } = await createSupabaseServerClient()
    .from("spaceOrderings")
    .upsert(updateOrderReq, { onConflict: "fid" })
    .select();
  if (error) {
    res.status(500).json({
      result: "error",
      error: {
        message: error.message,
      },
    });
    return;
  }
  const namesForIds = fromPairs(
    map(spacesForOrdering, (s) => [s.spaceId, s.spaceName]),
  );
  res.status(200).json({
    result: "success",
    value: map(updateOrderReq.ordering, (spaceId) => ({
      spaceId,
      name: namesForIds[spaceId],
    })),
  });
}

export default requestHandler({
  post: updateSpaceOrder,
  get: getSpaceOrder,
});
