"use client";
import React from "react";

import { resolveIpfsUrl } from "@/common/lib/utils/url";

type MarkdownProps = {
  node?: any;
  alt?: any;
  src?: any;
  title?: any;
};

type RendererProps = MarkdownProps & {
  children?: React.ReactNode;
  ordered?: any;
  href?: any;
};

export const MarkdownRenderers = (linkColor?: string) => ({
  img: ({ alt, src, title, ...props }: RendererProps) => (
    <span
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
      }}
    >
      <img
        {...props}
        alt={alt}
        src={resolveIpfsUrl(src)}
        title={title}
        style={{
          display: "inline-block",
          maxWidth: "100%",
          height: "auto",
          maxHeight: "345px",
          borderRadius: "10px",
          marginTop: "20px",
          marginBottom: "20px",
          objectFit: "contain",
        }}
      />
    </span>
  ),
  p: ({ children, ...props }: RendererProps) => (
    <div {...props} style={{ fontSize: "18px", paddingBottom: "15px" }}>
      {children}
    </div>
  ),
  a: ({ href, children, ...props }: RendererProps) => {
    const isPrettyLink = href !== children;

    const style: React.CSSProperties = isPrettyLink
      ? { color: linkColor, wordBreak: "keep-all", overflowWrap: "normal" }
      : {
          color: linkColor,
          wordBreak: "break-all",
          overflowWrap: "break-word",
        };

    return (
      <a
        href={href}
        style={style}
        {...props}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    );
  },

  h1: ({ children, ...props }: RendererProps) => (
    <h1
      {...props}
      style={{
        fontWeight: "bold",
        fontSize: "28px",
        paddingBottom: "10px",
        paddingTop: "10px",
      }}
    >
      {children}
    </h1>
  ),
  h3: ({ children, ...props }: RendererProps) => (
    <h3
      {...props}
      style={{
        fontWeight: "bold",
        fontSize: "24px",
        paddingBottom: "6px",
        paddingTop: "12px",
      }}
    >
      {children}
    </h3>
  ),
  h2: ({ children, ...props }: RendererProps) => (
    <h2
      {...props}
      style={{
        fontWeight: "bold",
        fontSize: "26px",
        paddingBottom: "8px",
        paddingTop: "10px",
      }}
    >
      {children}
    </h2>
  ),
  h4: ({ children, ...props }: RendererProps) => (
    <h4
      {...props}
      style={{
        fontWeight: "bold",
        fontSize: "22px",
        paddingBottom: "6px",
        paddingTop: "12px",
      }}
    >
      {children}
    </h4>
  ),
  ol: ({ ordered, children, ...props }: RendererProps) => {
    const listType = ordered ? "1" : "decimal";
    return (
      <ol {...props} style={{ listStyleType: listType, paddingLeft: "30px" }}>
        {children}
      </ol>
    );
  },
  ul: ({ ordered, children, ...props }: RendererProps) => {
    return (
      <ul
        {...props}
        style={{ padding: "5px", paddingLeft: "30px", color: "black" }}
      >
        {children}
      </ul>
    );
  },
  sub: ({ children, ...props }: RendererProps) => (
    <sub {...props} style={{ color: "gray" }}>
      {children}
    </sub>
  ),

  br: ({ children, ...props }: RendererProps) => (
    <br {...props} style={{ paddingBottom: "20px" }}>
      {children}
    </br>
  ),
  pre: ({ children, ...props }: RendererProps) => (
    <div
      style={{
        backgroundColor: "#1E1E1E",
        padding: "16px",
        borderRadius: "8px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.2)",
        overflowX: "auto",
      }}
    >
      <center>
        <code
          {...props}
          style={{
            color: "red",
            fontFamily: "monospace",
            fontSize: "14px",
            lineHeight: "1.5",
          }}
        >
          {children}
        </code>
      </center>
    </div>
  ),
  iframe: ({ src, ...props }: RendererProps) => (
    <center>
      <iframe
        {...props}
        src={src}
        style={{
          borderRadius: "10px",
          marginBottom: "10px",
          maxWidth: "100%",
          minWidth: "100%",
          aspectRatio: "16/9",
          height: "100%",
          border: "2px grey solid",
        }}
      />
    </center>
  ),
  table: ({ children, ...props }: RendererProps) => (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        border: "1px solid none",
        borderRadius: "10px",
        padding: "10px",
        overflowX: "auto",
      }}
    >
      <table
        {...props}
        style={{
          border: "1px solid transparent",
          borderCollapse: "collapse",
          margin: "0 auto",
          width: "100%",
          maxWidth: "100%",
        }}
      >
        {children}
      </table>
    </div>
  ),
  tbody: ({ children, ...props }: RendererProps) => (
    <tbody {...props}>{children}</tbody>
  ),
  tr: ({ children, ...props }: RendererProps) => <tr {...props}>{children}</tr>,
  th: ({ children, ...props }: RendererProps) => (
    <th
      {...props}
      style={{
        border: "1px solid black",
        padding: "8px",
        fontWeight: "bold",
        textAlign: "left",
        color: "black",
      }}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }: RendererProps) => (
    <td
      {...props}
      style={{
        border: "1px solid black",
        backgroundColor: "",
        padding: "8px",
        textAlign: "left",
      }}
    >
      {children}
    </td>
  ),
  strong: ({ children, ...props }: RendererProps) => (
    <strong {...props}>{children}</strong>
  ),
  code: ({ children, ...props }: RendererProps) => (
    <code
      {...props}
      style={{
        backgroundColor: "#001a09",
        padding: "2px",
        borderRadius: "4px",
      }}
    >
      {children}
    </code>
  ),
});
