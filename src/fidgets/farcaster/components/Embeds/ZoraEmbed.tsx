import React from "react";
import { parseZoraUrl } from "./zoraUtils";

interface ZoraEmbedProps {
  url: string;
}

const ZoraEmbed: React.FC<ZoraEmbedProps> = ({ url }) => {
  const parsed = parseZoraUrl(url);
  const tradeUrl = parsed?.pageUrl ?? url;

  return (
    <a
      href={tradeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-gray-500 text-sm"
      aria-label="View on Zora"
    >
      View on Zora
    </a>
  );
};

export default ZoraEmbed;
