import React from "react";

interface SpotifyEmbedProps {
  url: string;
}

const SpotifyEmbed: React.FC<SpotifyEmbedProps> = ({ url }) => {
  // Extracts the song ID from the link.
  const match = url.match(/track\/([a-zA-Z0-9]+)/);
  const trackId = match ? match[1] : null;

  if (!trackId) return null;

  return (
    <iframe
      data-testid="embed-iframe"
      style={{ borderRadius: "12px" }}
      src={`https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`}
      width="100%"
      height="352"
      allowFullScreen
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
      title={`Spotify Player - Track ${trackId}`}
    />
  );
};

export default SpotifyEmbed;
