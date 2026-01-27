"use client";

import * as React from "react";
import { CaretDownIcon } from "@radix-ui/react-icons";
import { Button } from "@/common/components/atoms/button";
import {
  Command,
  CommandInput,
  CommandItem,
  CommandEmpty,
  CommandList,
} from "@/common/components/atoms/command"; // Adjust the import paths if needed
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/common/components/atoms/popover"; // Adjust the import paths if needed
import {
  CastModalInteractiveBranch,
  useCastModalPortalContainer,
} from "@/common/lib/utils/castModalInteractivity";
import { CAST_MODAL_INTERACTIVE_ATTR } from "@/common/components/molecules/CastModalHelpers";
import { Channel } from "@mod-protocol/farcaster"; // Assuming this is your type

type Props = {
  getChannels: (query: string) => Promise<Channel[]>;
  onSelect: (value: Channel) => void;
  value: Channel;
  initialChannels?: Channel[];
};

export function ChannelPicker(props: Props) {
  const { onSelect, value } = props;
  // Store the latest getChannels callback in a ref so the effect
  // doesn't re-run when the function identity changes
  const getChannelsRef = React.useRef(props.getChannels);
  React.useEffect(() => {
    getChannelsRef.current = props.getChannels;
  }, [props.getChannels]);
  const [open, setOpen] = React.useState(false);
  const [channelResults, setChannelResults] = React.useState<Channel[]>(
    props.initialChannels ?? [],
  );
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    async function fetchChannels() {
      const channels = await getChannelsRef.current(query);
      setChannelResults(channels);
    }

    if (query !== "") {
      fetchChannels();
    } else {
      setChannelResults(props.initialChannels ?? []);
    }
  }, [query, props.initialChannels]);

  const handleSelect = React.useCallback(
    (channel: Channel) => {
      setOpen(false);
      onSelect(channel);
    },
    [onSelect],
  );

  const castModalPortalContainer = useCastModalPortalContainer();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="flex items-center px-4 py-2 border-[rgba(128,128,128,0.2)]"
        >
          <img
            src={value?.image_url ?? ""}
            alt={value?.name ?? ""}
            width={24}
            height={24}
            className="mr-2 -ml-2"
          />
          {value?.name ?? "Home"}
          <CaretDownIcon className="-mr-2 ml-2" />
        </Button>
      </PopoverTrigger>
      <CastModalInteractiveBranch asChild>
        <PopoverContent
          container={castModalPortalContainer ?? undefined}
          className="w-[400px] p-0"
          align="start"
          {...{ [CAST_MODAL_INTERACTIVE_ATTR]: "true" }}
        >
          <Command {...{ [CAST_MODAL_INTERACTIVE_ATTR]: "true" }}>
            <CommandInput
              placeholder="Search Channels"
              value={query}
              onValueChange={setQuery} // Update query state on input change
            />
            <CommandList {...{ [CAST_MODAL_INTERACTIVE_ATTR]: "true" }}>
              {channelResults.length === 0 ? (
                <CommandEmpty>No channels found.</CommandEmpty>
              ) : (
                channelResults
                  .filter((channel): channel is Channel => channel != null)
                  .map((channel) => (
                    <CommandItem
                      key={channel.parent_url || "home"}
                      value={channel.name || "home"}
                      className="cursor-pointer flex items-center px-4 py-2 hover:bg-gray-100"
                      {...{ [CAST_MODAL_INTERACTIVE_ATTR]: "true" }}
                      onSelect={() => handleSelect(channel)}
                    >
                      <img
                        src={channel.image_url ?? ""}
                        alt={channel.name ?? ""}
                        width={24}
                        height={24}
                        className="mr-2"
                      />
                      {channel.name}
                    </CommandItem>
                  ))
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </CastModalInteractiveBranch>
    </Popover>
  );
}
