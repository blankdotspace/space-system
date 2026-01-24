import { NextApiRequest, NextApiResponse } from "next/types";
import { isAxiosError } from "axios";
import { z, ZodSchema } from "zod";
import requestHandler, {
  BlankspaceResponse,
} from "@/common/data/api/requestHandler";
import neynar from "@/common/data/api/neynar";
import { User } from "@neynar/nodejs-sdk/build/api";
import { flatMap } from "lodash";

const QuerySchema = z.object({
  // q is a string of max length 20, or an address
  q: z.string().max(20).or(z.string().startsWith("0x").length(42)),
  limit: z.coerce.number().int().positive().max(10).default(10),
  cursor: z.string().optional(),
  viewerFid: z.coerce.number().int().optional(),
});

const _validateQueryParams = <T extends ZodSchema>(
  req: NextApiRequest,
  schema: T,
): [z.infer<T> | null, string | null] => {
  const parseResult = schema.safeParse(req.query);

  if (parseResult.success) {
    return [parseResult.data, null];
  }

  const error = parseResult.error.errors[0];
  const errorMessage = `${error.message} (${error.path.join(".")})`;
  return [null, errorMessage];
};

const _isMaybeFid = (q: string): boolean => {
  return /^-?\d+$/.test(q);
};

const _isMaybeAddress = (q: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(q);
};

type UserSearchResult = {
  users: User[];
  cursor?: string | null;
};

const _fetchAndFormat = async (
  _fetch: () => Promise<UserSearchResult>,
): Promise<[statusCode: number, data: BlankspaceResponse<UserSearchResult>]> => {
  try {
    const value = await _fetch();
    return [
      200,
      {
        result: "success",
        value: value,
      },
    ];
  } catch (e) {
    const _isAxiosError = isAxiosError(e);
    const status = (_isAxiosError && e.response!.data.status) || 500;
    const message =
      (_isAxiosError && e.response!.data.message) ||
      "An unknown error occurred";
    return [
      status,
      {
        result: "error",
        error: { message },
      },
    ];
  }
};

const _searchUsersByUsername =
  (params: z.infer<typeof QuerySchema>) =>
  async (): Promise<UserSearchResult> => {
    const response = await neynar.searchUser({ 
      q:params!.q, 
      viewerFid:params!.viewerFid, 
      limit: params!.limit,
      cursor: params!.cursor,
    });
    return {
      users: response.result.users,
      cursor: response.result.next?.cursor,
    };
  };

const _searchUsersByFids =
  (params: z.infer<typeof QuerySchema>) =>
  async (): Promise<UserSearchResult> => {
    const fids = [Number.parseInt(params!.q)];
    const response = await neynar.fetchBulkUsers({fids});
    return {
      users: response.users,
      cursor: null,
    };
  };

const _searchUsersByAddr =
  (params: z.infer<typeof QuerySchema>) =>
  async (): Promise<UserSearchResult> => {
    const response = await neynar.fetchBulkUsersByEthOrSolAddress({addresses: [params!.q]});
    return {
      users: flatMap(response, (x) => x),
      cursor: null,
    };
  };

const get = async (req: NextApiRequest, res: NextApiResponse) => {
  const [params, errorMessage] = _validateQueryParams(req, QuerySchema);

  if (errorMessage) {
    return res.status(400).json({
      result: "error",
      error: { message: errorMessage },
    });
  }

  const isFirstPage = !params!.cursor;
  const shouldSearchFids = isFirstPage && _isMaybeFid(params!.q);
  const shouldSearchAddr = isFirstPage && _isMaybeAddress(params!.q);

  const searchQueries = [
    !shouldSearchAddr && _searchUsersByUsername(params!),
    shouldSearchFids && _searchUsersByFids(params!),
    shouldSearchAddr && _searchUsersByAddr(params!),
  ].filter((f) => f) as (() => Promise<UserSearchResult>)[];

  const searchResponses = await Promise.all(
    searchQueries.map((fn) => _fetchAndFormat(fn)),
  );
  const searchSuccessResponses = searchResponses.filter(
    ([statusCode, result]) => statusCode === 200,
  );
  const searchErrorResponses = searchResponses.filter(
    ([statusCode, result]) => statusCode !== 200,
  );

  if (searchSuccessResponses.length > 0) {
    const combinedUserResults = flatMap(
      searchSuccessResponses,
      (r) => r[1].value!.users,
    );
    const cursor = searchSuccessResponses[0][1].value!.cursor || null;

    return res.status(200).json({
      result: "success",
      value: {
        users: combinedUserResults,
        cursor: cursor,
      },
    });
  } else {
    const [errorStatus, errorData] = searchErrorResponses[0];
    return res.status(errorStatus).json(errorData);
  }
};

export default requestHandler({
  get: get,
});

export { QuerySchema, _isMaybeFid, _isMaybeAddress, _validateQueryParams };
