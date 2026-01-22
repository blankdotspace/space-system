"use client";

import React from "react";
import { useMiniAppContext } from "@/common/providers/MiniAppContextProvider";
import { useMiniAppSdk } from "@/common/lib/hooks/useMiniAppSdk";

export function ContextDebugger() {
  const { combinedContext, hostContext, nounspaceContext } = useMiniAppContext();
  const { context: sdkContext, featuresContext, isReady, error } = useMiniAppSdk();

  // Only show in development
  if (process.env.NODE_ENV !== "development") return null;

  return (
    <div
      className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg max-w-md max-h-96 overflow-auto text-xs z-50 border border-gray-700 shadow-2xl"
      data-context-debugger
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm">Context Debugger</h3>
        <button
          onClick={() => {
            const el = document.querySelector('[data-context-debugger]');
            if (el) {
              el.classList.toggle('hidden');
            }
          }}
          className="text-gray-400 hover:text-white text-lg leading-none"
          aria-label="Toggle debugger visibility"
        >
          &times;
        </button>
      </div>
      <div className="space-y-2">
        <p>
          <strong>SDK Status:</strong> Ready: {isReady ? "✅" : "❌"}{" "}
          {error && (
            <span className="text-red-400">Error: {error.message}</span>
          )}
        </p>

        <div className="bg-gray-800 p-2 rounded">
          <h4 className="font-semibold text-gray-300">SDK Context (Raw)</h4>
          <pre className="whitespace-pre-wrap break-all">
            {JSON.stringify(sdkContext, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-800 p-2 rounded">
          <h4 className="font-semibold text-gray-300">Features Context</h4>
          <pre className="whitespace-pre-wrap break-all">
            {JSON.stringify(featuresContext, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-800 p-2 rounded">
          <h4 className="font-semibold text-gray-300">
            Host Context (from MiniAppSdkProvider)
          </h4>
          <pre className="whitespace-pre-wrap break-all">
            {JSON.stringify(hostContext, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-800 p-2 rounded">
          <h4 className="font-semibold text-gray-300">Nounspace Context</h4>
          <pre className="whitespace-pre-wrap break-all">
            {JSON.stringify(nounspaceContext, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-800 p-2 rounded">
          <h4 className="font-semibold text-gray-300">Combined Context</h4>
          <pre className="whitespace-pre-wrap break-all">
            {JSON.stringify(combinedContext, null, 2)}
          </pre>
        </div>

        {combinedContext?.location && (
          <div className="bg-gray-800 p-2 rounded">
            <h4 className="font-semibold text-gray-300">Location Details</h4>
            <p>
              <strong>Type:</strong> {combinedContext.location.type}
            </p>
            <pre className="whitespace-pre-wrap break-all">
              {JSON.stringify(combinedContext.location, null, 2)}
            </pre>
          </div>
        )}
      </div>
      <div className="mt-3 pt-2 border-t border-gray-700 text-gray-400">
        <p>
          <strong>User FID:</strong> {combinedContext?.user?.fid || "N/A"}
        </p>
        <p>
          <strong>Space ID:</strong>{" "}
          {combinedContext?.nounspace?.spaceContext?.spaceId || "N/A"}
        </p>
        <p>
          <strong>Tab:</strong>{" "}
          {combinedContext?.nounspace?.spaceContext?.tabName || "N/A"}
        </p>
        <p>
          <strong>Location Type:</strong>{" "}
          {combinedContext?.location?.type || "N/A"}
        </p>
        <p>
          <strong>Platform:</strong>{" "}
          {combinedContext?.client?.platformType || "N/A"}
        </p>
      </div>
    </div>
  );
}

