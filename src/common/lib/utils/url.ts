export const resolveIpfsUrl = (url: string): string => {
  if (!url) return url;
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }
  return url;
};

export const isValidUrl = (url: string): boolean => {
  try {
    return Boolean(new URL(url));
  } catch (error) {
    return false;
  }
};

export const isValidHttpUrl = (url: string): boolean => {
  try {
    const { protocol, hostname } = new URL(url);

    const hasValidProtocol = protocol === "http:" || protocol === "https:";
    const hasValidHost = hostname.includes(".") && hostname.split(".").pop()!.length > 1;

    return hasValidProtocol && hasValidHost;
  } catch (error) {
    return false;
  }
};
