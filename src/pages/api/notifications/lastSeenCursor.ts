import requestHandler from "@/common/data/api/requestHandler";
import { BlankspaceResponse } from "@/common/data/api/requestHandler";
import { NextApiRequest, NextApiResponse } from "next/types";
import { validateSignable, isSignable } from "@/common/lib/signedFiles";
import createSupabaseServerClient from "@/common/data/database/supabase/clients/server";
import type { Tables } from "@/supabase/database";
import { z, ZodSchema } from "zod";

export const PostRequestSchema = z.object({
  fid: z.number().int(),
  identityPublicKey: z.string(),
  lastSeenTimestamp: z.string().datetime({ offset: true }),
  signature: z.string(),
});

export const GetRequestSchema = z.object({
  fid: z.coerce.number().int(),
  identityPublicKey: z.string(),
});

export type PostLastSeenNotificationCursorResponse = BlankspaceResponse<{
  lastSeenTimestamp: null | string;
}>;

export type GetLastSeenNotificationCursorResponse = BlankspaceResponse<{
  lastSeenTimestamp: null | string;
}>;

const _validateRequestData = <T extends ZodSchema>(
  _data: any,
  schema: T,
): [z.infer<T>, null | string] => {
  const parseResult = schema.safeParse(_data);

  if (!parseResult.success) {
    const error = parseResult.error.errors[0];
    const errorMessage = `${error.message} (${error.path.join(".")})`;
    return [parseResult.data, errorMessage];
  }

  return [parseResult.data, null];
};

const _identityExists = async (
  fid: number,
  identityPublicKey: string,
): Promise<boolean> => {
  const { count, error } = await createSupabaseServerClient()
    .from("fidRegistrations")
    .select("*", { count: "exact", head: true })
    .eq("fid", fid)
    .eq("identityPublicKey", identityPublicKey);
  if (error) {
    console.error(error);
    throw new Error("Database error");
  }
  return typeof count === "number" && count >= 1;
};

const _createOrUpdateNotificationCursor = async (
  fid: number,
  identityPublicKey: string,
  lastSeenTimestamp: string,
): Promise<Tables<"lastSeenNotificationCursors">> => {
  const { data, error } = await createSupabaseServerClient()
    .from("lastSeenNotificationCursors")
    .upsert(
      { fid, identityPublicKey, lastSeenTimestamp },
      {
        onConflict: "fid,identityPublicKey",
      },
    )
    .select()
    .single();
  if (error) {
    console.error(error);
    throw new Error("Database error");
  }
  return data;
};

const post = async (
  req: NextApiRequest,
  res: NextApiResponse<PostLastSeenNotificationCursorResponse>,
) => {
  const [data, errorMessage] = _validateRequestData(
    req.body,
    PostRequestSchema,
  );

  if (errorMessage) {
    return res.status(400).json({
      result: "error",
      error: {
        message: errorMessage,
      },
    });
  }

  if (!isSignable(data, "identityPublicKey")) {
    return res.status(400).json({
      result: "error",
      error: {
        message: "Invalid request data",
      },
    });
  }

  if (!validateSignable(data, "identityPublicKey")) {
    return res.status(400).json({
      result: "error",
      error: {
        message: "Invalid signature",
      },
    });
  }

  const { fid, identityPublicKey, lastSeenTimestamp } = data;

  try {
    const userExists = await _identityExists(data.fid, data.identityPublicKey);

    if (!userExists) {
      return res.status(400).json({
        result: "error",
        error: {
          message: "User not found",
        },
      });
    }

    const updateResult = await _createOrUpdateNotificationCursor(
      fid,
      identityPublicKey,
      lastSeenTimestamp,
    );

    return res.status(200).json({
      result: "success",
      value: {
        lastSeenTimestamp: updateResult.lastSeenTimestamp,
      },
    });
  } catch (e) {
    return res.status(500).json({
      result: "error",
      error: {
        message: (e as Error)?.message || "An unknown error occurred",
      },
    });
  }
};

const get = async (
  req: NextApiRequest,
  res: NextApiResponse<GetLastSeenNotificationCursorResponse>,
) => {
  const [params, errorMessage] = _validateRequestData(
    req.query,
    GetRequestSchema,
  );

  if (errorMessage) {
    return res.status(400).json({
      result: "error",
      error: {
        message: errorMessage,
      },
    });
  }

  try {
    const { data, error } = await createSupabaseServerClient()
      .from("lastSeenNotificationCursors")
      .select("lastSeenTimestamp")
      .eq("fid", params.fid)
      .eq("identityPublicKey", params.identityPublicKey)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return res.status(200).json({
      result: "success",
      value: {
        lastSeenTimestamp: data?.lastSeenTimestamp || null,
      },
    });
  } catch (e) {
    return res.status(500).json({
      result: "error",
      error: {
        message: (e as Error)?.message || "An unknown error occurred",
      },
    });
  }
};

export default requestHandler({
  post: post,
  get: get,
});
