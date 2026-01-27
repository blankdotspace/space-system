import { useQuery } from "@tanstack/react-query";
import TextInput from "@/common/components/molecules/TextInput";
import React, { useMemo } from "react";
import { FidgetArgs, FidgetModule, FidgetProperties } from "@/common/fidgets";
import { isWebUrl } from "@/common/lib/utils/urls";
import axiosBackend from "@/common/data/api/backend";
import {
  FilterType,
  ChannelResponse,
  FeedResponse,
} from "@neynar/nodejs-sdk/build/api";

// TO DO: Make this into a Feed that is configured to filter to a specific channel that is selectable in settings

export const useLookupChannel = (channel: string) => {
  return useQuery({
    queryKey: ["lookupChannel", channel],
    staleTime: 1000 * 60 * 1,
    queryFn: async () => {
      const { data } = await axiosBackend.get<ChannelResponse>(
        "/api/farcaster/neynar/channels",
        {
          params: {
            id: channel,
          },
        },
      );

      return data;
    },
  });
};

export const useGetChannelCasts = (channel: string) => {
  return useQuery({
    queryKey: ["channelCasts", channel],
    staleTime: 1000 * 60 * 1,
    queryFn: async () => {
      const { data } = await axiosBackend.get<FeedResponse>(
        "/api/farcaster/neynar/feed",
        {
          params: {
            channelId: channel,
            filterType: FilterType.ChannelId,
          },
        },
      );

      return data;
    },
  });
};

export type ChannelFidgetSettings = {
  channel: string;
};

const channelFidgetProperties: FidgetProperties = {
  fidgetName: "Farcaster Channels",
  fields: [
    {
      fieldName: "channel",
      displayName: "Channel Feed",
      default: "A channel Feed!",
      required: true,
      inputSelector: TextInput,
    },
  ],
  size: {
    maxHeight: 2,
    minHeight: 2,
    maxWidth: 2,
    minWidth: 2,
  },
  icon: 0x1f4c1,
};

const Channel: React.FC<FidgetArgs<ChannelFidgetSettings>> = ({
  settings: { channel },
}) => {
  const { data: channelCasts, isLoading: castsLoading } =
    useGetChannelCasts(channel);
  const { data: channelInfo, isLoading: channelInfoLoading } =
    useLookupChannel(channel);

  const isLoading = useMemo(() => {
    return castsLoading || channelInfoLoading;
  }, [castsLoading, channelInfoLoading]);

  if (isLoading) {
    return (
      <div className="bg-black w-full h-full flex items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  if (!channelInfo || !channelCasts) {
    return (
      <div className="bg-black w-full h-full flex items-center justify-center">
        <p className="text-white">No channel data found</p>
      </div>
    );
  }

  return (
    <div className="bg-black w-full h-full">
      <div className="flex w-full items-center h-1/6 gap-2 p-4">
        <img
          src={channelInfo.channel?.image_url ?? ""}
          className="h-[50px] w-[50px]"
        />
        <div className="flex flex-col items-start justify-center">
          <p className="text-white text-base">/{channelInfo.channel?.id}</p>
          <p className="text-white text-sm">
            {channelInfo.channel?.description}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-start overflow-scroll w-full h-5/6 p-4">
        {channelCasts.casts
          .filter((cast) => !isWebUrl(cast.text))
          .filter((item) => item.text !== "")
          .map((item) => (
            // TO DO: Insert a cast row here
            <></>
          ))}
      </div>
    </div>
  );
};

const mod: FidgetModule<FidgetArgs<ChannelFidgetSettings>> = {
  fidget: Channel,
  properties: channelFidgetProperties,
};

export default mod;
