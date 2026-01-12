"use client";

import React, { ReactNode } from "react";

import { ErrorBoundary } from "@sentry/react";
import Linkify from "linkify-react";
import Link from "next/link";

import { registerPlugin } from "linkifyjs";
import {
  mentionPlugin,
  cashtagPlugin,
  channelPlugin,
  hashtagPlugin,
} from "@/common/lib/utils/linkify";

registerPlugin("mention", mentionPlugin);
registerPlugin("cashtag", cashtagPlugin);
registerPlugin("channel", channelPlugin);
registerPlugin("hashtag", hashtagPlugin);

type RenderFunctionArgs = {
  content: string;
  attributes?: any;
};

const renderMention = ({ content }: RenderFunctionArgs) => {
  const handleWithoutAt = content.slice(1);
  return (
    <Link
      className="cursor-pointer text-blue-500 text-font-medium hover:underline hover:text-blue-500/70"
      href={`/s/${handleWithoutAt}`}
    >
      {content}
    </Link>
  );
};

const renderLink = ({ attributes, content }: RenderFunctionArgs) => {
  const { href } = attributes;
  return (
    <span
      className="cursor-pointer text-blue-500 text-font-medium hover:underline hover:text-blue-500/70"
      onClick={(event) => {
        event.stopPropagation();
        window.open(href, "_blank");
      }}
      rel="noopener noreferrer"
    >
      {content}
    </span>
  );
};

const renderChannel = ({ content }: RenderFunctionArgs) => {
  return (
    <span
      className="cursor-pointer text-blue-500 text-font-medium hover:underline hover:text-blue-500/70"
      onClick={(event) => {
        event.stopPropagation();
      }}
      rel="noopener noreferrer"
    >
      {content}
    </span>
  );
};

const renderCashtag = ({ content }: RenderFunctionArgs) => {
  if (!content || content.length < 3) {
    return content;
  }

  const tokenSymbol = content.slice(1);
  if (tokenSymbol === "usd") return null;

  return (
    <span
      className="cursor-pointer text-blue-500 text-font-medium hover:underline hover:text-blue-500/70"
      onClick={(event) => {
        event.stopPropagation();
      }}
      rel="noopener noreferrer"
    >
      {content}
    </span>
  );
};

const renderHashtag = ({ content }: RenderFunctionArgs) => {
  return (
    <span
      className="font-medium"
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      {content}
    </span>
  );
};

const linkifyOptions = {
  render: {
    url: renderLink,
    mention: renderMention,
    cashtag: renderCashtag,
    channel: renderChannel,
    hashtag: renderHashtag,
  },
  truncate: 42,
};

export default function FarcasterLinkify({
  children,
  attributes,
}: {
  children?: ReactNode;
  attributes?: any;
}) {
  return (
    <ErrorBoundary>
      <Linkify
        as="span"
        options={{
          ...linkifyOptions,
          attributes,
        }}
      >
        {children}{" "}
      </Linkify>
    </ErrorBoundary>
  );
}
