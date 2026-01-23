import { isUndefined, keys, map } from "lodash";
import { NextApiRequest, NextApiResponse } from "next/types";

type ResponseError = {
  message?: string;
  [key: string]: any;
};

export type BlankspaceResponse<
  D = any,
  E extends ResponseError = ResponseError,
> = {
  result: "success" | "error";
  error?: E;
  value?: D;
};

type HandlerFunction<R extends BlankspaceResponse = BlankspaceResponse> = (
  req: NextApiRequest,
  res: NextApiResponse<R>,
) => Promise<void>;

type RequestHandlerArgs = {
  get?: HandlerFunction;
  post?: HandlerFunction;
  patch?: HandlerFunction;
  delete?: HandlerFunction;
  put?: HandlerFunction;
};

export default function requestHandler(args: RequestHandlerArgs) {
  const allowedMethods = map(keys(args), (m) => m.toUpperCase());

  return async (
    req: NextApiRequest,
    res: NextApiResponse<BlankspaceResponse>,
  ) => {
    const method = req.method ? args[req.method.toLowerCase()] : undefined;

    if (!isUndefined(method)) {
      return method(req, res);
    } else {
      res.status(405).json({
        result: "error",
        error: {
          message: `Allowed methods: ${allowedMethods}`,
        },
      });
    }
  };
}
