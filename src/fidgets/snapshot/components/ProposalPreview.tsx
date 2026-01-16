import React, { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { MarkdownRenderers } from "@/common/lib/utils/markdownRenderers";

interface ProposalPreviewProps {
  body: string;
}

const ProposalPreview: React.FC<ProposalPreviewProps> = memo(({ body }) => {
  const markdownComponents = useMemo(() => MarkdownRenderers(), []);

  // Create a strict sanitization schema, memoized to avoid recreation on every render
  const sanitizeSchema = useMemo(
    () => ({
      ...defaultSchema,
      attributes: {
        ...defaultSchema.attributes,
        // Merge with default global attributes instead of replacing them
        "*": [...(defaultSchema.attributes?.["*"] || []), "className", "id"],
      },
      tagNames: [
        // Allow only safe HTML tags
        "p",
        "br",
        "strong",
        "em",
        "u",
        "s",
        "del",
        "ins",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "ul",
        "ol",
        "li",
        "blockquote",
        "pre",
        "code",
        "a",
        "img",
        "table",
        "thead",
        "tbody",
        "tr",
        "th",
        "td",
      ],
      protocols: {
        href: ["http", "https", "mailto", "ipfs"],
        src: ["http", "https", "ipfs"],
      },
    }),
    []
  );

  return (
    <ReactMarkdown
      rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
      remarkPlugins={[remarkGfm]}
      components={markdownComponents}
    >
      {body}
    </ReactMarkdown>
  );
});

ProposalPreview.displayName = "ProposalPreview";

export default ProposalPreview;
