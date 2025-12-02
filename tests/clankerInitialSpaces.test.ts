import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createInitialProfileSpaceConfigForFid } from "@/config";

const PORTFOLIO_FIDGET_ID = "Portfolio:cd627e89-d661-4255-8c4c-2242a950e93e";

describe("clanker initial profile space config", () => {
  const originalCommunity = process.env.NEXT_PUBLIC_TEST_COMMUNITY;

  beforeAll(() => {
    process.env.NEXT_PUBLIC_TEST_COMMUNITY = "clanker";
  });

  afterAll(() => {
    if (originalCommunity) {
      process.env.NEXT_PUBLIC_TEST_COMMUNITY = originalCommunity;
    } else {
      delete process.env.NEXT_PUBLIC_TEST_COMMUNITY;
    }
  });

  it("passes the farcaster username to the Portfolio fidget settings", () => {
    const username = "clankerfan";

    const config = createInitialProfileSpaceConfigForFid(123, username);
    const portfolioFidget = config.fidgetInstanceDatums?.[PORTFOLIO_FIDGET_ID];

    expect(portfolioFidget).toBeDefined();
    expect(
      portfolioFidget?.config?.settings?.farcasterUsername,
    ).toBe(username);
  });
});
