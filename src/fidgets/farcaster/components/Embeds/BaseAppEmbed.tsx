
import React from "react";

interface BaseAppEmbedProps {
  url: string;
}

const MAX_EMBED_HEIGHT = 600;
const MAX_EMBED_WIDTH = 500;

const BaseAppEmbed: React.FC<BaseAppEmbedProps> = ({ url }) => {
  return (
    <div
      className="baseapp-embed-card w-full max-w-full max-w-2xl mx-auto rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden flex flex-col items-center p-0"
      style={{ minHeight: MAX_EMBED_HEIGHT }}
    >
      {/* Only the iframe of the post, without top preview, larger height */}
      <div className="w-full flex flex-col items-center px-0 py-8" style={{ minHeight: MAX_EMBED_HEIGHT }}>
        <div className="w-full rounded-lg overflow-hidden border bg-gray-50">
          <iframe
            src={url}
            title="Base App Preview"
            className="w-full h-full"
            style={{ border: "none", minHeight: MAX_EMBED_HEIGHT, width: MAX_EMBED_WIDTH }}
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </div>
    </div>
  );
};

export default BaseAppEmbed;
