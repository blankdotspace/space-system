import { describe, expect, it, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";

import {
  FARCASTER_EMBED_LIMIT,
  sanitizeFarcasterEmbeds,
  validateFarcasterEmbeds,
} from "@/fidgets/farcaster/utils/embedNormalization";
import publishMessageHandler from "@/pages/api/farcaster/neynar/publishMessage";

describe("farcaster embed normalization", () => {
  it("deduplicates and enforces embed limit", () => {
    const embeds = [
      { url: "https://example.com/one" },
      { url: "https://example.com/one" },
      { url: "https://example.com/two" },
      { url: "https://example.com/three" },
    ];

    const normalized = sanitizeFarcasterEmbeds(embeds);

    expect(normalized).toHaveLength(FARCASTER_EMBED_LIMIT);
    expect(normalized[0]).toEqual({ url: "https://example.com/one" });
    expect(normalized[1]).toEqual({ url: "https://example.com/two" });
  });

  it("marks invalid castId hashes as invalid", () => {
    const { invalid, normalized } = validateFarcasterEmbeds([
      { castId: { fid: 1, hash: new Uint8Array([1, 2, 3]) } },
      { url: "https://valid.example" },
    ]);

    expect(normalized).toHaveLength(1);
    expect(invalid).toHaveLength(1);
  });
});

describe("publishMessage validation", () => {
  it("rejects unexpected embed shapes", async () => {
    const status = vi.fn().mockReturnThis();
    const json = vi.fn();

    const req = {
      method: "POST",
      body: {
        embeds: [{ foo: "bar" }],
      },
    } as unknown as NextApiRequest;

    const res = {
      status,
      json,
    } as unknown as NextApiResponse;

    await publishMessageHandler(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Invalid embeds",
        invalid: 1,
      }),
    );
  });
});
