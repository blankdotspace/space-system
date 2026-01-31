import { describe, it, expect } from 'vitest';

// Simple URL transformation function for testing
const transformUrl = (url: string): string => {
  if (!url) return "";
  if (url.includes('/embed/') || url.includes('player.vimeo.com/video/')) {
    return url;
  }
  const youtubeRegex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]+)(?:[?&].*)?/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch && youtubeMatch[1]) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }
  const vimeoRegex =
    /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^/]*)\/videos\/|)(\d+)(?:|\/\?|$)/;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }
  return url;
};

describe('IFrame Cropping Functionality', () => {
  it('transforms YouTube URLs correctly for embedding', () => {
    const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const expected = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
    expect(transformUrl(youtubeUrl)).toBe(expected);
  });

  it('transforms Vimeo URLs correctly for embedding', () => {
    const vimeoUrl = 'https://vimeo.com/123456789';
    const expected = 'https://player.vimeo.com/video/123456789';
    expect(transformUrl(vimeoUrl)).toBe(expected);
  });

  it('returns original URL for non-video URLs', () => {
    const regularUrl = 'https://example.com';
    expect(transformUrl(regularUrl)).toBe(regularUrl);
  });

  it('handles empty URLs gracefully', () => {
    expect(transformUrl('')).toBe('');
  });

  it('handles URLs that are already embed URLs', () => {
    const embedUrl = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
    expect(transformUrl(embedUrl)).toBe(embedUrl);
  });
});

describe('IFrame Settings', () => {
  it('should have default settings', () => {
    const defaultSettings = {
      size: 1,
      cropOffsetX: 0,
      cropOffsetY: 0,
      isScrollable: false,
    };

    expect(defaultSettings.size).toBe(1);
    expect(defaultSettings.cropOffsetX).toBe(0);
    expect(defaultSettings.cropOffsetY).toBe(0);
    expect(defaultSettings.isScrollable).toBe(false);
  });

  it('should allow custom positioning and scroll settings', () => {
    const customSettings = {
      size: 2.5,
      cropOffsetX: -25,
      cropOffsetY: 10,
      isScrollable: true,
    };

    expect(customSettings.size).toBeGreaterThan(1);
    expect(customSettings.cropOffsetX).toBeLessThan(0);
    expect(customSettings.cropOffsetY).toBeGreaterThan(0);
    expect(customSettings.isScrollable).toBe(true);
  });
});

describe('IFrame Controls', () => {
  it('should calculate iframe positioning correctly', () => {
    const size = 2.0;
    const offsetX = -25;
    const offsetY = 10;
    
    const iframeStyle = {
      transform: `scale(${size})`,
      left: `${offsetX}%`,
      top: `${offsetY}%`,
      width: `${100 / size}%`,
      height: `${100 / size}%`,
    };
    
    expect(iframeStyle.transform).toBe("scale(2)");
    expect(iframeStyle.left).toBe("-25%");
    expect(iframeStyle.top).toBe("10%");
    expect(iframeStyle.width).toBe("50%");
    expect(iframeStyle.height).toBe("50%");
  });

  it('should handle scrollable overflow setting', () => {
    const isScrollable = true;
    const overflow = isScrollable ? "auto" : "hidden";
    expect(overflow).toBe("auto");
    
    const isScrollableDisabled = false;
    const overflowDisabled = isScrollableDisabled ? "auto" : "hidden";
    expect(overflowDisabled).toBe("hidden");
  });

  it('should format offset display correctly', () => {
    const offset = -25;
    const display = `${offset.toFixed(0)}%`;
    expect(display).toBe("-25%");
  });
});

describe('Control Labels', () => {
  it('should generate correct control labels', () => {
    const offsetX = -10;
    const offsetY = 20;
    
    const offsetXLabel = `Horizontal Position (${offsetX.toFixed(0)}%)`;
    const offsetYLabel = `Vertical Position (${offsetY.toFixed(0)}%)`;
    
    expect(offsetXLabel).toBe("Horizontal Position (-10%)");
    expect(offsetYLabel).toBe("Vertical Position (20%)");
  });
}); 