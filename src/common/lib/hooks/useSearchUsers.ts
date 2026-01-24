import { useState, useEffect, useCallback, useRef } from "react";
import { debounce } from "lodash";
import axios, { CancelTokenSource, isAxiosError } from "axios";
import axiosBackend from "@/common/data/api/backend";
import { BlankspaceResponse } from "@/common/data/api/requestHandler";
import { User } from "@neynar/nodejs-sdk/build/api";

type UserSearchResult = {
  users: User[];
  cursor?: string | null;
};

export type UserSearchReturnValue = {
  users: User[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
};

const useSearchUsers = (
  query: string | null,
  debounceMs: number = 300,
): UserSearchReturnValue => {
  const [results, setResults] = useState<UserSearchResult | null | undefined>(
    null,
  );
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
          BlankspaceResponse<UserSearchResult>
        >("/api/search/users", {
          params: {
            q,
            limit: 5,
          },
          cancelToken: cancelRequest.current.token,
        });
        setResults(response.data.value);
        setLoading(false);
        setError(null);
      } catch (err) {
        if (axios.isCancel(err)) {
          // console.log("Search request cancelled");
        } else {
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
  }, [query]);

  return {
    users: (query && results?.users) || [],
    loading: loading,
    error: error,
    hasMore: !!results?.cursor,
  };
};

export default useSearchUsers;
