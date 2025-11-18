
import React from "react";

interface BaseAppEmbedProps {
  url: string;
  key?: string;
}

const BaseAppEmbed: React.FC<BaseAppEmbedProps> = ({ url, key }) => {
  return (
    <div
      key={key}
      className="baseapp-embed-card w-full max-w-full sm:max-w-lg mx-auto rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden flex flex-col items-center p-0"
      style={{ minHeight: 640 }}
    >
      {/* Apenas o iframe do post, sem preview superior, altura maior */}
      <div className="w-full flex flex-col items-center px-0 py-8">
        <div className="w-full rounded-lg overflow-hidden border bg-gray-50" style={{ height: 700 }}>
          <iframe
            src={url}
            title="Base App Preview"
            className="w-full h-full"
            style={{ border: "none", minHeight: 700, width: '500px' }}
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        </div>
      </div>
    </div>
  );
};

export default BaseAppEmbed;
