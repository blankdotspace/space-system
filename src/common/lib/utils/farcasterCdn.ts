export const toFarcasterCdnUrl = (
  url: string,
  params = 'anim=false,fit=contain,f=auto,w=576',
): string => {
  if (!url) return url;
  try {
    const u = new URL(url);

    // Respect already-proxied Warpcast CDN URLs
    if (
      (u.hostname === 'wrpcd.net' || u.hostname.endsWith('.wrpcd.net')) &&
      (u.pathname.startsWith('/cdn-cgi/image/') ||
        u.pathname.startsWith('/cdn-cgi/imagedelivery/'))
    ) {
      return url;
    }

    const isHttp = u.protocol === 'http:' || u.protocol === 'https:';
    if (!isHttp) return url; // don't touch data:, blob:, etc.

    // Special handling for Cloudflare Images (imagedelivery.net)
    if (u.hostname.endsWith('imagedelivery.net')) {
      // Expected path: /<account_hash>/<image_id>/<variant?>
      const segments = u.pathname.split('/').filter(Boolean);
      const account = segments[0];
      const imageId = segments[1];
      const variant = segments[2];
      if (account && imageId) {
        const transformation = variant || (params && params.length > 0 ? params : "");
        const wrpcdBase = `https://wrpcd.net/cdn-cgi/imagedelivery/${account}/${imageId}`;
        return transformation ? `${wrpcdBase}/${transformation}` : wrpcdBase;
      }
      // Fallback to the generic proxy so we still serve the asset through Warpcast CDN
      return `https://wrpcd.net/cdn-cgi/image/${params}/${encodeURIComponent(url)}`;
    }

    // Generic image proxy via Warpcast CDN
    return `https://wrpcd.net/cdn-cgi/image/${params}/${encodeURIComponent(url)}`;
  } catch (_err) {
    return url;
  }
};

export default toFarcasterCdnUrl;
