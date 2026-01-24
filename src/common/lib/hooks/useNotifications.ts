import { useCallback } from "react";
import { NotificationsResponse } from "@neynar/nodejs-sdk/build/api";
import { useInfiniteQuery, keepPreviousData } from "@tanstack/react-query";
import { BlankspaceResponse } from "@/common/data/api/requestHandler";
import axiosBackend from "@/common/data/api/backend";

export const useNotifications = (fid?: number | null, limit: number = 25) => {
  const fetchNotificationsPage = useCallback(
    async ({ pageParam: cursor }): Promise<NotificationsResponse> => {
      if (!fid) {
        throw new Error("You must be logged in to view notifications.");
      }
      const { data } = await axiosBackend.get<
        BlankspaceResponse<NotificationsResponse>
      >("/api/notifications", {
        params: {
          fid,
          limit,
          cursor,
        },
      });

      if (data.result === "error") {
        throw new Error(data.error?.message);
      }

      return data.value!;
    },
    [fid, limit],
  );

  return useInfiniteQuery<NotificationsResponse>({
    queryKey: ["notifications", fid, limit],
    queryFn: fetchNotificationsPage,
    initialPageParam: null,
    staleTime: 1000 * 10,
    getNextPageParam: (lastPage) => lastPage?.next?.cursor,
    placeholderData: keepPreviousData,
  });
};

export default useNotifications;
