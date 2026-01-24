import neynar from "@/common/data/api/neynar";
import requestHandler from "@/common/data/api/requestHandler";
import { BlankspaceResponse } from "@/common/data/api/requestHandler";
import {
  NotificationType,
  NotificationsResponse,
} from "@neynar/nodejs-sdk/build/api";
import { isAxiosError } from "axios";
import { isString } from "lodash";
import { NextApiRequest, NextApiResponse } from "next/types";
import { z, ZodSchema } from "zod";

const QuerySchema = z.object({
  fid: z.coerce.number().int(),
  limit: z.coerce.number().int().positive().max(25).default(15),
  cursor: z.string().optional(),
});

const _validateQueryParams = <T extends ZodSchema>(
  req: NextApiRequest,
  schema: T,
): [z.infer<T>, null | string] => {
  const parseResult = schema.safeParse(req.query);

  if (parseResult.success) {
    return [parseResult.data, null];
  }

  const error = parseResult.error.errors[0];
  const errorMessage = `${error.message} (${error.path.join(".")})`;
  return [parseResult.data, errorMessage];
};

const get = async (
  req: NextApiRequest,
  res: NextApiResponse<BlankspaceResponse<NotificationsResponse>>,
) => {
  const [{ fid, limit, cursor }, errorMessage] = _validateQueryParams(
    req,
    QuerySchema,
  );

  if (isString(errorMessage)) {
    return res.status(400).json({
      result: "error",
      error: { message: errorMessage },
    });
  }

  try {
    const data = await neynar.fetchAllNotifications({
      fid,
      limit,
      cursor,
      type: [
        NotificationType.Follows,
        NotificationType.Recasts,
        NotificationType.Likes,
        NotificationType.Mentions,
        NotificationType.Replies,
        NotificationType.Quotes,
      ],
    });

    res.status(200).json({
      result: "success",
      value: data,
    });
  } catch (e) {
    const _isAxiosError = isAxiosError(e);
    const status = (_isAxiosError && e.response!.data.status) || 500;
    const message =
      (_isAxiosError && e.response!.data.message) ||
      "An unknown error occurred";

    return res.status(status).json({
      result: "error",
      error: { message },
    });
  }
};

export default requestHandler({
  get: get,
});
