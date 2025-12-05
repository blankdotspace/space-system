export const WEBSITE_URL =
  process.env.NEXT_PUBLIC_VERCEL_ENV === "preview"
    ? typeof window !== "undefined"
      ? window.location.origin
      : `https://${process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL}`
    : process.env.NEXT_PUBLIC_URL || "https://nounspace.com";

export const APP_FID = process.env.NEXT_PUBLIC_APP_FID
  ? Number(process.env.NEXT_PUBLIC_APP_FID)
  : undefined;
