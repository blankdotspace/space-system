"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import neynar from "@/common/data/api/neynar";
import {
  CastAddBody,
  FarcasterNetwork,
  makeCastAdd,
} from "@farcaster/core";
import useIsMobile from "@/common/lib/hooks/useIsMobile";

import {
  ModManifest,
  fetchUrlMetadata,
  handleAddEmbed,
  handleOpenFile,
  handleSetInput,
} from "@mod-protocol/core";
import { CreationMod } from "@mod-protocol/react";
import { EditorContent, useEditor } from "@mod-protocol/react-editor";
import { CastLengthUIIndicator } from "@mod-protocol/react-ui-shadcn/dist/components/cast-length-ui-indicator";
import { ChannelList } from "@mod-protocol/react-ui-shadcn/dist/components/channel-list";
import { createRenderMentionsSuggestionConfig } from "@mod-protocol/react-ui-shadcn/dist/lib/mentions";
import { renderers } from "@mod-protocol/react-ui-shadcn/dist/renderers";
import { Button } from "@/common/components/atoms/button";
import { debounce, isEmpty, isUndefined, map } from "lodash";
import { MentionList } from "./mentionList";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/common/components/atoms/popover";
import {
  CastModalInteractiveBranch,
  useCastModalPortalContainer,
} from "@/common/lib/utils/castModalInteractivity";
import { CAST_MODAL_INTERACTIVE_ATTR } from "@/common/components/molecules/CastModalHelpers";
import Spinner from "@/common/components/atoms/spinner";
import { useAppStore } from "@/common/data/stores/app";
import { useBannerStore } from "@/common/stores/bannerStore";
import { CastType, Signer } from "@farcaster/core";
import { PhotoIcon } from "@heroicons/react/20/solid";
import { usePrivy } from "@privy-io/react-auth";
import EmojiPicker, {
  Theme,
  EmojiClickData,
} from "emoji-picker-react";
import { GoSmiley } from "react-icons/go";
import { HiOutlineSparkles } from "react-icons/hi2";
import { Address, formatUnits, zeroAddress } from "viem";
import { base } from "viem/chains";
import { useBalance } from "wagmi";
import { useFarcasterSigner } from "..";
import {
  FarcasterEmbed,
  fetchChannelsByName,
  fetchChannelsForUser,
  isFarcasterUrlEmbed,
  submitCast,
} from "../utils";
import { ChannelPicker } from "./channelPicker";
import { renderEmbedForUrl } from "./Embeds";


import { getSpaceContractAddr } from "@/constants/spaceToken";

// SPACE_CONTRACT_ADDR will be loaded when needed (async)
// For now, we'll use it in a way that handles the Promise

// Fixed missing imports and incorrect object types
const API_URL = process.env.NEXT_PUBLIC_MOD_PROTOCOL_API_URL!;

type FarcasterMention = {
  fid: number;
  display_name: string;
  username: string;
  avatar_url: string;
};

// Module-level cache of resolved usernames → FIDs
const mentionFidCache = new Map<string, string>();

const fetchNeynarMentions = async (
  query: string,
): Promise<FarcasterMention[]> => {
  try {
    if (query == "") return [];

    const res = await fetch(
      `/api/search/users?q=${encodeURIComponent(query)}&limit=10`,
    );
    const data = await res.json();
    const users = data?.value?.users || [];
    return users.map((user: any) => ({
      fid: user.fid,
      username: user.username,
      display_name: user.display_name,
      avatar_url: user.pfp_url,
    }));
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};

const debouncedGetMentions = debounce(fetchNeynarMentions, 200, {
  leading: true,
  trailing: false,
});
const getUrlMetadata = fetchUrlMetadata(API_URL);

const onError = (err) => {
  console.error(err);
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === "development") {
    window.alert(err.message);
  }
};

export type ParentCastIdType = {
  fid: number;
  hash: Uint8Array;
};

export enum DraftStatus {
  writing = "writing",
  publishing = "publishing",
  published = "published",
  removed = "removed",
}

export type DraftType = {
  text: string;
  status: DraftStatus;
  mentionsToFids?: { [key: string]: string };
  embeds?: FarcasterEmbed[];
  parentUrl?: string;
  parentCastId?: ParentCastIdType;
  mentionsPositions?: number[]; // <-- Add this property
};

type CreateCastProps = {
  initialDraft?: Partial<DraftType>;
  afterSubmit?: () => void;
  onShouldConfirmCloseChange?: (shouldConfirm: boolean) => void;
};

const SPARKLES_BANNER_KEY = "sparkles-banner-v1";

const CreateCast: React.FC<CreateCastProps> = ({
  initialDraft,
  afterSubmit = () => {},
  onShouldConfirmCloseChange,
}) => {
  const castModalPortalContainer = useCastModalPortalContainer();
  const isMobile = useIsMobile();
  const [currentMod, setCurrentMod] = useState<ModManifest | null>(null);
  const [initialEmbeds, setInitialEmbeds] = useState<FarcasterEmbed[]>();
  const [draft, setDraft] = useState<DraftType>({
    text: "",
    status: DraftStatus.writing,
    ...initialDraft,
  });
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  const hasEmbeds = draft?.embeds && !!draft.embeds.length;
  const isReply = draft?.parentCastId !== undefined;
  const { signer, isLoadingSigner, fid } = useFarcasterSigner("create-cast");
  const [initialChannels, setInitialChannels] = useState() as any;
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiTriggerRef = useRef<HTMLButtonElement | null>(null);
  const emojiContentRef = useRef<HTMLDivElement | null>(null);

  const isTargetInsideEmojiPicker = useCallback(
    (event?: Event | CustomEvent<{ originalEvent?: Event }>, fallbackTarget?: EventTarget | null) => {
      const isInside = (node?: EventTarget | null) => {
        if (!(node instanceof Node)) {
          return false;
        }

        if (emojiContentRef.current?.contains(node)) {
          return true;
        }

        if (emojiTriggerRef.current?.contains(node)) {
          return true;
        }

        return false;
      };

      if (isInside(fallbackTarget)) {
        return true;
      }

      if (!event) {
        return false;
      }

      const relatedEvents: Event[] = [];

      const originalEvent = (event as CustomEvent<{ originalEvent?: Event }>)
        ?.detail?.originalEvent;

      if (originalEvent) {
        relatedEvents.push(originalEvent);
      }

      if (!relatedEvents.includes(event)) {
        relatedEvents.push(event);
      }

      return relatedEvents.some((currentEvent) => {
        if (isInside(currentEvent.target)) {
          return true;
        }

        const composedPath =
          typeof (currentEvent as any)?.composedPath === "function"
            ? (currentEvent as any).composedPath()
            : [];

        return composedPath.some((node: EventTarget) => isInside(node));
      });
    },
    [],
  );

  const handleEmojiPickerOpenChange = useCallback((nextOpen: boolean) => {
    setIsEmojiPickerOpen(nextOpen);
  }, []);

  const handleEmojiPickerInteraction = useCallback((event: CustomEvent<{ originalEvent?: Event }> | Event) => {
    const originalEvent =
      (event as CustomEvent<{ originalEvent?: Event }>)
        ?.detail?.originalEvent;
    const fallbackTarget =
      originalEvent?.target ??
      ((event as unknown as Event)?.target ?? null);

    if (
      isTargetInsideEmojiPicker(
        event as unknown as Event,
        fallbackTarget,
      )
    ) {
      event.preventDefault();
      return;
    }

    setIsEmojiPickerOpen(false);
  }, []);

  const shouldConfirmClose = useMemo(() => {
    const hasText = (draft.text ?? "").trim().length > 0;
    const hasEmbeds = (draft.embeds?.length ?? 0) > 0;
    const hasMentions = (Object.keys(draft.mentionsToFids ?? {}).length > 0) || 
                       ((draft.mentionsPositions?.length ?? 0) > 0);
    return (hasText || hasEmbeds || hasMentions) && draft.status !== DraftStatus.published;
  }, [draft.text, draft.embeds, draft.mentionsToFids, draft.mentionsPositions, draft.status]);

  useEffect(() => {
    onShouldConfirmCloseChange?.(shouldConfirmClose);
  }, [onShouldConfirmCloseChange, shouldConfirmClose]);


  // Real image upload function for imgBB
  async function uploadImageToImgBB(file: File): Promise<string> {
    const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
    if (!apiKey) throw new Error("imgBB API key not found");

    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch(
      `https://api.imgbb.com/1/upload?key=${apiKey}`,
      {
        method: "POST",
        body: formData,
      },
    );
    const data = await res.json();
    if (!data.success)
      throw new Error(data.error?.message || "Failed to upload to ImgBB");

    return data.data.display_url || data.data.url;
  }

  // Drop handler
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    const file = e.dataTransfer.files[0];
    if (!file.type.startsWith("image/")) return;
    setIsUploadingImage(true);
    try {
      const url = await uploadImageToImgBB(file);
      addEmbed({ url, status: "loaded" });
    } catch (err) {
      alert("Error uploading image: " + (err as Error).message);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Drag over handler
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  // Drag leave handler
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    setIsUploadingImage(true);
    try {
      const url = await uploadImageToImgBB(file);
      addEmbed({ url, status: "loaded" });
    } catch (err) {
      alert("Error uploading image: " + (err as Error).message);
    } finally {
      setIsUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Reference to the EditorContent element to handle paste (Ctrl+V) events
  const editorContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Effect to add/remove the paste event handler on EditorContent
    const el = editorContentRef.current;
    if (!el) return;
    const handler = (e: ClipboardEvent) => {
      if (!e.clipboardData || !e.clipboardData.items) return;
      for (let i = 0; i < e.clipboardData.items.length; i++) {
        const item = e.clipboardData.items[i];
        const file = item.getAsFile();
        console.log('Clipboard item', i, 'type:', item.type, file);
        if (file && file.type.startsWith("image/")) {
          e.preventDefault();
          debouncedPasteUpload(file);
        }
      }
    };
    el.addEventListener("paste", handler as any);
    return () => {
      el.removeEventListener("paste", handler as any);
    };
  }, [editorContentRef.current]);

  const { isBannerClosed, closeBanner } = useBannerStore();
  const sparklesBannerClosed = isBannerClosed(SPARKLES_BANNER_KEY);

  const { user } = usePrivy();
  const [spaceContractAddr, setSpaceContractAddr] = useState<Address | null>(null);
  
  // Load space contract address (async)
  useEffect(() => {
    getSpaceContractAddr().then(addr => setSpaceContractAddr(addr));
  }, []);
  
  const result = useBalance({
    address: (user?.wallet?.address as Address) || zeroAddress,
    token: (spaceContractAddr || zeroAddress) as Address,
    chainId: base.id,
    query: { enabled: !!spaceContractAddr }, // Only query when address is loaded
  });
  const spaceHoldAmount = result?.data
    ? parseInt(formatUnits(result.data.value, result.data.decimals))
    : 0;
  const userHoldEnoughSpace = spaceHoldAmount >= 1111;
  const { hasNogs } = useAppStore((state) => ({
    hasNogs: state.account.hasNogs,
  }));
  const [showEnhanceBanner, setShowEnhanceBanner] = useState(false);

  useEffect(() => {
    const fetchInitialChannels = async () => {
      const initial_channels = await fetchChannelsForUser(fid);
      setInitialChannels(initial_channels);
    };
    fetchInitialChannels();
  }, [fid]);

  const debouncedGetChannels = useCallback(
    debounce(
      async (query: string) => {
        return await fetchChannelsByName(query);
      },
      200,
      { leading: true, trailing: false },
    ),
    [],
  );

  const onSubmitPost = async (): Promise<boolean> => {
    if ((!draft?.text && !draft?.embeds?.length) || isUndefined(signer)) {
      console.error(
        "Submission failed: Missing text or embeds, or signer is undefined.",
        {
          draftText: draft?.text,
          draftEmbedsLength: draft?.embeds?.length,
          signerUndefined: isUndefined(signer),
        },
      );
      return false;
    }

    // Delay submission only if there are mentions and they are not resolved
    if (
      (draft.mentionsPositions?.length || 0) > 0 &&
      Object.keys(draft.mentionsToFids || {}).length === 0
    ) {
      console.error("Mentions not fully resolved yet.", {
        mentionsPositions: draft.mentionsPositions,
        mentionsToFids: draft.mentionsToFids,
      });
      return false;
    }

    try {
      const result = await publishPost(draft, fid, signer);

      if (result.success) {
        setSubmitStatus("success");
        setDraft((prev) => ({ ...prev, status: DraftStatus.published }));
        setTimeout(() => {
          afterSubmit();
        }, 3000);
      } else {
        console.error(
          `Failed to publish post: ${result.message || "Unknown error"}`,
        );
        setSubmitStatus("error");
        setDraft((prev) => ({ ...prev, status: DraftStatus.writing }));
      }

      return result.success;
    } catch (error) {
      console.error(
        "An unexpected error occurred during post submission:",
        error,
      );
      setSubmitStatus("error");
      setDraft((prev) => ({ ...prev, status: DraftStatus.writing }));
      return false;
    }
  };

  const isPublishing = draft?.status === DraftStatus.publishing;
  const isPublished = draft?.status === DraftStatus.published;
  const submissionError = submitStatus === "error";

  const {
    editor,
    getText,
    addEmbed,
    getEmbeds,
    setChannel,
    getChannel,
    handleSubmit,
    setText,
  } = useEditor({
    fetchUrlMetadata: getUrlMetadata,
    onError,
    onSubmit: onSubmitPost,
    linkClassName: "text-blue-800",
    renderChannelsSuggestionConfig: createRenderMentionsSuggestionConfig({
      getResults: debouncedGetChannels,
      RenderList: ChannelList,
    }),
    renderMentionsSuggestionConfig: createRenderMentionsSuggestionConfig({
      getResults: debouncedGetMentions,
      RenderList: MentionList,
    }),
    editorOptions: {
      parseOptions: {
        preserveWhitespace: "full",
      },
    },
  });

  const debouncedPasteUpload = useMemo(
    () =>
      debounce(
        async (file: File) => {
          setIsUploadingImage(true);
          try {
            const url = await uploadImageToImgBB(file);
            addEmbed({ url, status: "loaded" });
          } catch (err) {
            alert("Error uploading image: " + (err as Error).message);
          } finally {
            setIsUploadingImage(false);
          }
        },
        300,
        { leading: true, trailing: false },
      ),
    [addEmbed],
  );

  useEffect(() => {
    if (!text && draft?.text && isEmpty(draft.mentionsToFids)) {
      editor?.commands.setContent(
        `<p>${draft.text.replace(/\n/g, "<br>")}</p>`,
        true,
        {
          preserveWhitespace: "full",
        },
      );
    }

    if (draft?.embeds) {
      setInitialEmbeds(draft.embeds);
    }
  }, [editor]);

  const text = getText();
  const embeds = getEmbeds();
  const channel = getChannel();
  useEffect(() => {
    if (!editor) return;
    if (isPublishing) return;

    const fetchMentionsAndSetDraft = async () => {
      // console.group("Mention Parsing");
      const newEmbeds = initialEmbeds ? [...embeds, ...initialEmbeds] : embeds;

      // Updated regex: supports ENS-style usernames and extra trailing punctuation like . , ! ? ; :
      // Uses lookaheads instead of lookbehinds for better browser compatibility
      const usernamePattern =
        /(?:^|[\s(])@([a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?)(?=[\s.,!?;:)]|$)/g;

      // The working copy of the text for position calculation
      const workingText = text;

      // Extract mentions and their positions from the original text
      const usernamesWithPositions = [
        ...workingText.matchAll(usernamePattern),
      ].map((match) => ({
        username: match[1],
        position: match.index! + match[0].indexOf("@"), // Adjust position to '@'
      }));

      const uniqueUsernames = Array.from(
        new Set(usernamesWithPositions.map((u) => u.username)),
      );

      // console.log("Parsed mentions from text:", usernamesWithPositions);

      const mentionsToFids: { [key: string]: string } = {};
      const mentionsPositions: number[] = [];
      let mentionsText = text; // Initialize mentionsText with current text

      if (uniqueUsernames.length > 0) {
        // Filter out usernames that are already in cache with valid FIDs
        const uncachedUsernames = uniqueUsernames.filter(
          username => !mentionFidCache.has(username) || !mentionFidCache.get(username)
        );

        // Add cached usernames to mentionsToFids only if they have valid FIDs
        uniqueUsernames.forEach(username => {
          const cachedFid = mentionFidCache.get(username);
          if (cachedFid) {
            mentionsToFids[username] = cachedFid;
          }
        });

        // Only make API call if there are uncached usernames
        if (uncachedUsernames.length > 0) {
          try {
            const query = encodeURIComponent(uncachedUsernames.join(","));
            const res = await fetch(`/api/farcaster/neynar/getFids?usernames=${query}`);
            const fetchedMentions = await res.json();

            if (Array.isArray(fetchedMentions)) {
              fetchedMentions.forEach(mention => {
                if (mention && mention.username && mention.fid) {
                  const fid = mention.fid.toString();
                  mentionsToFids[mention.username] = fid;
                  mentionFidCache.set(mention.username, fid);
                }
                // Remove caching of invalid usernames
              });
            }
          } catch (err) {
            console.error("Failed to fetch FIDs in batch:", err);
          }
        }

        let cumulativeOffset = 0;
        const mentionMatches = [...text.matchAll(usernamePattern)];

        for (const match of mentionMatches) {
          const fullMatch = match[0]; // e.g. " @bob"
          const username = match[1];  // "bob"
          const atIndex = match.index! + fullMatch.indexOf("@");

          // Adjust position based on previous removals
          const adjustedPosition = atIndex - cumulativeOffset;

          if (mentionsToFids[username]) {
            mentionsPositions.push(adjustedPosition);

            // Remove `@username` from mentionsText
            mentionsText = mentionsText.slice(0, adjustedPosition) +
              mentionsText.slice(adjustedPosition + username.length + 1); // +1 for "@"

            // Update offset so future positions shift correctly
            cumulativeOffset += username.length + 1;
          }
        }

        if (mentionsPositions.length > 10)
          if (Object.keys(mentionsToFids).length !== mentionsPositions.length) {
            console.error(
              "Mismatch between mentions and their positions:",
              mentionsToFids,
              mentionsPositions,
            );
          }
      }

      // console.groupEnd();

      // Update the draft regardless of mentions
      setDraft((prevDraft) => {
        const updatedDraft = {
          ...prevDraft,
          text: mentionsText,
          embeds: newEmbeds,
          parentUrl: channel?.parent_url || undefined,
          mentionsToFids,
          mentionsPositions,
        };
        // console.log("Updated Draft before posting:", updatedDraft);
        return updatedDraft;
      });
    };

    fetchMentionsAndSetDraft();
  }, [text, embeds, initialEmbeds, channel, isPublishing, editor]);

  async function publishPost(
    draft: DraftType,
    fid: number,
    signer: Signer
  ): Promise<{ success: boolean; message?: string }> {
    if (draft.parentCastId) {
      const { hash } = draft.parentCastId;
      if (hash.length !== 20) {
        return {
          success: false,
          message: "Invalid parent cast ID hash length.",
        };
      }
    }

    const mentions = draft.mentionsToFids
      ? Object.values(draft.mentionsToFids).map(Number)
      : [];
    const mentionsPositions = draft.mentionsPositions || [];

    const castBody: CastAddBody = {
      type: CastType.CAST,
      text: draft.text,
      embeds: draft.embeds || [],
      embedsDeprecated: [],
      parentUrl: draft.parentUrl || undefined,
      parentCastId: draft.parentCastId,
      mentions,
      mentionsPositions,
    };

    const castAddMessageResp = await makeCastAdd(
      castBody,
      { fid, network: FarcasterNetwork.MAINNET },
      signer
    );

    if (!castAddMessageResp.isOk()) {
      return {
        success: false,
        message: "Invalid cast data: " + castAddMessageResp.error.message,
      };
    }

    try {
      const result = await submitCast(castAddMessageResp.value, fid, signer);
      if (result) {
        return { success: true };
      } else {
        return { success: false, message: "Failed to submit cast." };
      }
    } catch (e) {
      return {
        success: false,
        message: "An error occurred while submitting the cast.",
      };
    }
  }


  const getButtonText = () => {
    if (isLoadingSigner) return "Not signed into Farcaster";
    if (isPublishing) return "Publishing...";
    if (submissionError) return "Retry";
    if (isPublished) return "Published!";
    return "Cast";
  };

  const handleEmojiClick = (
    emojiObject: EmojiClickData,
    event: MouseEvent,
  ) => {
    event.stopPropagation();
    editor?.chain().focus().insertContent(emojiObject.emoji).run();
    setIsEmojiPickerOpen(false);
  };

  const handleEnhanceCast = async (text: string) => {
    if (isEnhancing) return;

    if (!sparklesBannerClosed) {
      closeBanner(SPARKLES_BANNER_KEY);
    }

    if (!userHoldEnoughSpace && !hasNogs) {
      setShowEnhanceBanner(true);
      return;
    }

    setIsEnhancing(true);
    try {
      const response = await fetch("/api/venice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, fid }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to enhance text:", errorText);
        throw new Error("Failed to enhance text");
      }

      const result = await response.json();
      setText(result.response);
    } catch (error) {
      console.error("Error enhancing text:", error);
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div
      className="flex flex-col items-start min-w-full w-full h-full"
      tabIndex={-1}
    >
      <form onSubmit={handleSubmit} className="w-full">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        {isPublishing ? (
          <div className="w-full h-full min-h-[150px]">{draft.text}</div>
        ) : (
          <div
            className={`p-2 border-slate-200 rounded-lg border relative ${isDragging ? "ring-2 ring-blue-400 bg-blue-50" : ""}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {isDragging && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-blue-100/80 pointer-events-none rounded-lg">
                <span className="text-blue-700 font-semibold text-lg">Drop the image here…</span>
              </div>
            )}
            {isUploadingImage && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70 pointer-events-none rounded-lg">
                <Spinner style={{ width: "40px", height: "40px" }} />
                <span className="ml-2 text-gray-700 font-medium">Uploading image…</span>
              </div>
            )}
            <EditorContent
              ref={editorContentRef}
              editor={editor}
              autoFocus
              className="w-full h-full min-h-[150px] opacity-80"
              onPaste={(e) => {
                console.log('onPaste fired', e);
                if (!e.clipboardData || !e.clipboardData.items) return;
                for (let i = 0; i < e.clipboardData.items.length; i++) {
                  const item = e.clipboardData.items[i];
                  const file = item.getAsFile();
                  console.log('Clipboard item', i, 'type:', item.type, file);
                  if (file && file.type.startsWith("image/")) {
                    e.preventDefault();
                    debouncedPasteUpload(file);
                  }
                }
              }}
            />
          </div>
        )}

        {submitStatus === "error" && (
          <div className="mt-2 p-2 bg-red-100 text-red-800 rounded">
            An error occurred while submitting the cast.
          </div>
        )}

        <div className={isMobile ? "flex flex-col pt-2 gap-2" : "flex flex-row pt-2 gap-1"}>
          {/* First row for mobile: Channel picker + icon buttons */}
          <div className={isMobile ? "flex flex-row justify-between w-full" : "flex flex-row gap-1 md:justify-start"}>
            {/* Left side: Channel picker and Add media button for mobile */}
            <div className={isMobile ? "flex flex-row gap-1" : ""}>
              {!isReply && (
                <div className="opacity-80">
                  {isPublishing || isLoadingSigner ? (
                    channel?.name
                  ) : (
                    <ChannelPicker
                      getChannels={debouncedGetChannels}
                      onSelect={(selectedChannel) => {
                        setChannel(selectedChannel);
                      }}
                      value={channel}
                      initialChannels={initialChannels}
                    />
                  )}
                </div>
              )}

              {/* Add media button moved to left side on mobile */}
              {isMobile && (
                <Button
                  className="h-10"
                  type="button"
                  variant="outline"
                  disabled={isPublishing}
                  onClick={handleFileButtonClick}
                >
                  <PhotoIcon className="mr-1 w-5 h-5" />
                  Add
                </Button>
              )}
            </div>

            {/* Right side: Other action buttons */}
            <div className={isMobile ? "flex flex-row gap-1" : ""}>
              {/* Only show Add button here for desktop */}
              {!isMobile && (
                <Button
                  className="h-10"
                  type="button"
                  variant="outline"
                  disabled={isPublishing}
                  onClick={handleFileButtonClick}
                >
                  <PhotoIcon className="mr-1 w-5 h-5" />
                  Add
                </Button>
              )}

              <Button
                className="h-10"
                type="button"
                variant="ghost"
                disabled={isPublishing}
                onClick={() => handleEnhanceCast(text)}
              >
                {isEnhancing ? (
                  <Spinner style={{ width: "30px", height: "30px" }} />
                ) : (
                  <HiOutlineSparkles size={20} />
                )}
              </Button>

              <Popover
                open={isEmojiPickerOpen}
                onOpenChange={handleEmojiPickerOpenChange}
              >
                <PopoverTrigger asChild>
                  <Button
                    ref={emojiTriggerRef}
                    className="h-10"
                    type="button"
                    variant="ghost"
                    disabled={isPublishing}
                    aria-expanded={isEmojiPickerOpen}
                  >
                    <GoSmiley size={20} />
                  </Button>
                </PopoverTrigger>
                <CastModalInteractiveBranch asChild>
                  <PopoverContent
                    ref={emojiContentRef}
                    container={castModalPortalContainer ?? undefined}
                    side="top"
                    align="end"
                    sideOffset={8}
                    className="z-[60] w-auto border-none bg-transparent p-0 shadow-none"
                    {...{ [CAST_MODAL_INTERACTIVE_ATTR]: "true" }}
                    onInteractOutside={handleEmojiPickerInteraction}
                    onPointerDownOutside={handleEmojiPickerInteraction}
                    onEscapeKeyDown={() => setIsEmojiPickerOpen(false)}
                  >
                    <EmojiPicker
                      theme={"light" as Theme}
                      onEmojiClick={handleEmojiClick}
                      open={isEmojiPickerOpen}
                    />
                  </PopoverContent>
                </CastModalInteractiveBranch>
              </Popover>
            </div>
          </div>

          {/* Cast button row for mobile */}
          {isMobile && (
            <div className="flex flex-row pt-2 justify-center w-full">
              <Button
                size="lg"
                type="submit"
                className="line-clamp-1 w-full"
                disabled={isPublishing || isLoadingSigner}
              >
                {getButtonText()}
              </Button>
            </div>
          )}

          <Popover
            open={!!currentMod}
            onOpenChange={(op: boolean) => {
              if (!op) setCurrentMod(null);
            }}
          >
            <PopoverTrigger></PopoverTrigger>
            <PopoverContent
              container={castModalPortalContainer ?? undefined}
              className="w-[300px]"
            >
              <div className="space-y-4">
                <h4 className="font-medium leading-none">{currentMod?.name}</h4>
                <hr />
                <CreationMod
                  input={text}
                  embeds={embeds}
                  api={API_URL}
                  variant="creation"
                  manifest={currentMod!}
                  renderers={renderers}
                  onOpenFileAction={handleOpenFile}
                  onExitAction={() => setCurrentMod(null)}
                  onSetInputAction={handleSetInput(setText)}
                  onAddEmbedAction={handleAddEmbed(addEmbed)}
                />
              </div>
            </PopoverContent>
          </Popover>

          {/* Desktop cast button */}
          {!isMobile && (
            <>
              <CastLengthUIIndicator getText={getText} />
              <div className="grow"></div>
              <div className="flex flex-row pt-0 justify-end">
                <Button
                  size="lg"
                  variant="primary"
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white line-clamp-1 min-w-40 max-w-xs truncate"
                  disabled={isPublishing || isLoadingSigner}
                >
                  {getButtonText()}
                </Button>
              </div>
            </>
          )}
        </div>
      </form>

      {!sparklesBannerClosed && !showEnhanceBanner && (
        <div className="flex justify-center items-center w-full gap-1 text-orange-600 bg-orange-100 rounded-md p-2 text-sm font-medium mt-2 -mb-4">
          <p>
            Click the <b>sparkles</b> to enhance a draft cast or generate one
            from scratch.
          </p>
        </div>
      )}

      {showEnhanceBanner && (
        <div className="flex justify-center gap-1 w-full items-center text-red-600 bg-red-100 rounded-md p-2 text-sm font-medium mt-2 -mb-4">
          <p>
            Hold at least 1,111{" "}
            <a
              target="_blank"
              rel="noreferrer"
              href="https://www.nounspace.com/t/base/0x48C6740BcF807d6C47C864FaEEA15Ed4dA3910Ab"
              className="font-bold underline"
            >
              $SPACE
            </a>{" "}
            or 1{" "}
            <a
              target="_blank"
              rel="noreferrer"
              href="https://highlight.xyz/mint/base:0xD094D5D45c06c1581f5f429462eE7cCe72215616"
              className="font-bold underline"
            >
              nOGs
            </a>{" "}
            to unlock generation
          </p>
        </div>
      )}

      {hasEmbeds && (
        <div className="mt-8 rounded-md bg-muted p-2 w-full break-all">
          {map(draft.embeds, (embed) => (
            <div
              key={`cast-embed-${isFarcasterUrlEmbed(embed) ? embed.url : (typeof embed.castId?.hash === 'string' ? embed.castId.hash : Array.from(embed.castId?.hash || []).join('-'))}`}
            >
              {renderEmbedForUrl(embed, true)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CreateCast;