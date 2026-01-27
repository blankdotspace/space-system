import { describe, expect, it, vi, beforeEach } from "vitest";

import { fetchDirectoryData } from "@/pages/api/token/directory";
import { fetchTokenData } from "@/common/lib/utils/fetchTokenData";

vi.mock("@/common/lib/utils/fetchTokenData", () => ({
  fetchTokenData: vi.fn(async () => ({ decimals: 0 })),
}));

const mockedFetchTokenData = vi.mocked(fetchTokenData);

describe("token directory API", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY = "test-key";
    process.env.MORALIS_API_KEY = "test-moralis-key";
    process.env.NEYNAR_API_KEY = "test-neynar-key";
    vi.resetAllMocks();
  });

  it("aggregates NFT owners with neynar profiles", async () => {
    const fetchMock = vi.fn(async (input: any, init?: any) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("deep-index.moralis.io")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            result: [
              {
                address: "0x000000000000000000000000000000000000abcd",
                balance: "723",
                decimals: 0,
                symbol: "NFTEST",
              },
            ],
            decimals: 0,
            symbol: "NFTEST",
          }),
        } as any;
      }
      // web3.bio primary API
      if (url.startsWith("https://api.web3.bio/")) {
        return {
          ok: true,
          status: 200,
          json: async () => [],
        } as any;
      }
      // enstate.rs fallback
      if (url.startsWith("https://enstate.rs")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ response: [] }),
        } as any;
      }
      throw new Error(`Unexpected fetch call: ${url}`);
    });

    const neynarMock = {
      fetchBulkUsersByEthOrSolAddress: vi.fn().mockResolvedValue({
        "0x000000000000000000000000000000000000abcd": [
          {
            fid: 123,
            username: "alice",
            display_name: "Alice",
            follower_count: 321,
            pfp_url: "https://example.com/alice.png",
          },
        ],
      }),
    };

    const result = await fetchDirectoryData(
      {
        network: "base",
        contractAddress: "0x000000000000000000000000000000000000ABCD",
        pageSize: 10,
        assetType: "token",
      },
      {
        fetchFn: fetchMock,
        neynarClient: neynarMock as any,
      },
    );

    // 3 calls: moralis, web3.bio, enstate.rs fallback
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const [moralisCall] = fetchMock.mock.calls;
    expect(moralisCall[0]).toContain(
      "https://deep-index.moralis.io/api/v2.2/erc20/0x000000000000000000000000000000000000ABCD/owners",
    );
    expect(moralisCall[1]).toMatchObject({
      method: "GET",
      headers: expect.objectContaining({
        Accept: "application/json",
        "X-API-Key": "test-moralis-key",
      }),
      cache: "no-store",
    });
    // Verify web3.bio was called
    const web3bioCalls = fetchMock.mock.calls.filter(([url]) =>
      (typeof url === "string" ? url : url.toString()).includes("api.web3.bio"),
    );
    expect(web3bioCalls).toHaveLength(1);
    expect(neynarMock.fetchBulkUsersByEthOrSolAddress).toHaveBeenCalledWith({
      addresses: ["0x000000000000000000000000000000000000abcd"],
    });
    expect(result.tokenSymbol).toBe("NFTEST");
    expect(result.tokenDecimals).toBe(0);
    expect(result.members).toHaveLength(1);
    expect(result.members[0]).toMatchObject({
      address: "fc_fid_123",
      primaryAddress: "0x000000000000000000000000000000000000abcd",
      etherscanUrl: "https://etherscan.io/address/0x000000000000000000000000000000000000abcd",
      balanceFormatted: "723",
      balanceRaw: "723",
      followers: 321,
      username: "alice",
      displayName: "Alice",
      pfpUrl: "https://example.com/alice.png",
      lastTransferAt: null,
      ensName: null,
      ensAvatarUrl: null,
    });
    expect(mockedFetchTokenData).not.toHaveBeenCalled();
  });

  it("paginates through NFT owners until page size reached", async () => {
    const alchemyResponses = [
      {
        ok: true,
        status: 200,
        json: async () => ({
          owners: [
            {
              address: "0x000000000000000000000000000000000000aaaa",
              tokenBalances: [{ balance: "2" }],
            },
          ],
          pageKey: "next-page",
          contractMetadata: {
            symbol: "NFTEST",
          },
        }),
      },
      {
        ok: true,
        status: 200,
        json: async () => ({
          owners: [
            {
              address: "0x000000000000000000000000000000000000bbbb",
              tokenBalances: [{ balance: "1" }],
            },
          ],
        }),
      },
    ];

    const fetchMock = vi.fn(async (input: any, init?: any) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("alchemy.com") && url.includes("getOwnersForContract")) {
        const response = alchemyResponses.shift();
        if (!response) {
          throw new Error("Unexpected extra Alchemy request");
        }
        return response as any;
      }
      // web3.bio primary API - return ENS data for one address
      if (url.startsWith("https://api.web3.bio/")) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              address: "0x000000000000000000000000000000000000aaaa",
              identity: "example.eth",
              platform: "ens",
              avatar: null,
            },
          ],
        } as any;
      }
      // enstate.rs fallback for addresses not resolved by web3.bio
      if (url.startsWith("https://enstate.rs")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ response: [] }),
        } as any;
      }
      throw new Error(`Unexpected fetch call: ${url}`);
    });

    const neynarMock = {
      fetchBulkUsersByEthOrSolAddress: vi.fn().mockResolvedValue({}),
    };

    const result = await fetchDirectoryData(
      {
        network: "mainnet",
        contractAddress: "0x000000000000000000000000000000000000aaaa",
        pageSize: 2,
        assetType: "nft",
      },
      {
        fetchFn: fetchMock,
        neynarClient: neynarMock as any,
      },
    );

    // 4 calls: 2 alchemy, 1 web3.bio, 1 enstate.rs fallback
    expect(fetchMock).toHaveBeenCalledTimes(4);
    const alchemyCalls = fetchMock.mock.calls.filter(([url]) =>
      (typeof url === "string" ? url : url.toString()).includes("alchemy.com"),
    );
    expect(alchemyCalls).toHaveLength(2);
    expect((alchemyCalls[0][0] as string).toLowerCase()).toContain(
      "getownersforcontract?contractaddress=0x000000000000000000000000000000000000aaaa",
    );
    expect((alchemyCalls[1][0] as string).toLowerCase()).toContain("pagekey=next-page");

    expect(result.members).toHaveLength(2);
    // ENS data comes from web3.bio mock; enstate.rs fallback returns empty
    expect(result.members[0]).toMatchObject({
      address: "0x000000000000000000000000000000000000aaaa",
      balanceRaw: "2",
      balanceFormatted: "2",
      ensName: "example.eth",
      ensAvatarUrl: null, // No avatar from enstate.rs mock response
    });
    expect(result.members[1]).toMatchObject({
      address: "0x000000000000000000000000000000000000bbbb",
      balanceRaw: "1",
      balanceFormatted: "1",
      ensName: null,
      ensAvatarUrl: null,
    });
    expect(result.tokenSymbol).toBe("NFTEST");
    expect(mockedFetchTokenData).not.toHaveBeenCalled();
    expect(neynarMock.fetchBulkUsersByEthOrSolAddress).toHaveBeenCalledWith({
      addresses: [
        "0x000000000000000000000000000000000000aaaa",
        "0x000000000000000000000000000000000000bbbb",
      ],
    });
  });

  it("uses Alchemy for Base NFT owner lookups", async () => {
    const fetchMock = vi.fn(async (input: any) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("alchemy.com") && url.includes("getOwnersForContract")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            owners: [
              {
                address: "0x0000000000000000000000000000000000001111",
                tokenBalances: [{ balance: "5" }],
              },
              {
                address: "0x0000000000000000000000000000000000002222",
                tokenBalances: [{ balance: "1" }],
              },
            ],
            contractMetadata: {
              symbol: "BASENFT",
            },
          }),
        } as any;
      }
      // web3.bio primary API - return ENS data for one address
      if (url.startsWith("https://api.web3.bio/")) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              address: "0x0000000000000000000000000000000000001111",
              identity: "basefan.eth",
              platform: "ens",
              avatar: null,
            },
          ],
        } as any;
      }
      // enstate.rs fallback for addresses not resolved by web3.bio
      if (url.startsWith("https://enstate.rs")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ response: [] }),
        } as any;
      }
      throw new Error(`Unexpected fetch call: ${url}`);
    });

    const neynarMock = {
      fetchBulkUsersByEthOrSolAddress: vi.fn().mockResolvedValue({}),
    };

    const result = await fetchDirectoryData(
      {
        network: "base",
        contractAddress: "0x0000000000000000000000000000000000009999",
        pageSize: 2,
        assetType: "nft",
      },
      {
        fetchFn: fetchMock,
        neynarClient: neynarMock as any,
      },
    );

    const alchemyCalls = fetchMock.mock.calls.filter(([url]) =>
      (typeof url === "string" ? url : url.toString()).includes("alchemy.com"),
    );
    expect(alchemyCalls).toHaveLength(1);
    const moralisCalls = fetchMock.mock.calls.filter(([url]) =>
      (typeof url === "string" ? url : url.toString()).includes(
        "deep-index.moralis.io",
      ),
    );
    expect(moralisCalls).toHaveLength(0);
    expect(result.tokenSymbol).toBe("BASENFT");
    expect(result.tokenDecimals).toBe(0);
    expect(result.members).toHaveLength(2);
    expect(result.members[0]).toMatchObject({
      address: "0x0000000000000000000000000000000000001111",
      balanceRaw: "5",
      balanceFormatted: "5",
      ensName: "basefan.eth",
    });
    expect(result.members[1]).toMatchObject({
      address: "0x0000000000000000000000000000000000002222",
      balanceRaw: "1",
      balanceFormatted: "1",
    });
    expect(neynarMock.fetchBulkUsersByEthOrSolAddress).toHaveBeenCalledWith({
      addresses: [
        "0x0000000000000000000000000000000000001111",
        "0x0000000000000000000000000000000000002222",
      ],
    });
  });
});
