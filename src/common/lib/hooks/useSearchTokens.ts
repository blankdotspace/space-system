import { useState, useEffect, useCallback, useRef } from "react";
import { debounce } from "lodash";
import axios, { CancelTokenSource, isAxiosError } from "axios";
import axiosBackend from "@/common/data/api/backend";
import { BlankspaceResponse } from "@/common/data/api/requestHandler";

export type TokenResult = {
  id: string;
  name: string;
  symbol: string;
  image: string | null;
  contractAddress: string;
  network: string;
};

export type TokenSearchReturnValue = {
  tokens: TokenResult[];
  loading: boolean;
  error: string | null;
};

const useSearchTokens = (
  query: string | null,
  debounceMs: number = 300,
): TokenSearchReturnValue => {
  const [results, setResults] = useState<TokenResult[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRequest = useRef<CancelTokenSource | null>(null);

  const fetchResults = useCallback(
    debounce(async (q: string) => {
      if (cancelRequest.current) {
        cancelRequest.current.cancel("New search initiated");
      }

      cancelRequest.current = axios.CancelToken.source();

      try {
        const response = await axiosBackend.get<
          BlankspaceResponse<{ tokens: TokenResult[] }>
        >("/api/search/tokens", {
          params: {
            q,
            limit: 5,
          },
          cancelToken: cancelRequest.current.token,
        });
        setResults(response.data.value?.tokens || []);
        setLoading(false);
        setError(null);
      } catch (err) {
        if (!axios.isCancel(err)) {
          const errMsg = isAxiosError(err)
            ? err.response?.data?.error?.message
            : null;
          setError(errMsg || "An error occurred while searching");
          setLoading(false);
        }
      }
    }, debounceMs),
    [],
  );
  useEffect(() => {
    setError(null);
    if (query) {
      setLoading(true);
      fetchResults(query);
    }

    return () => {
      cancelRequest.current?.cancel("component unmounted");
      fetchResults.cancel(); // lodash debounce helper
    };
  }, [query]);

  return {
    tokens: (query && results) || [],
    loading: loading,
    error: error,
  };
};
export default useSearchTokens;
