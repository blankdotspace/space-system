import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  normalizeToFarcasterEmbeds,
  validateEmbedPayload,
} from "@/fidgets/farcaster/embedNormalization";
import { publishMessageHandler } from "@/pages/api/farcaster/neynar/publishMessage";
import { submitCast } from "@/fidgets/farcaster/utils";
import axiosBackend from "@/common/data/api/backend";
import { Message } from "@farcaster/core";

vi.mock("@/common/data/api/backend", () => ({
  __esModule: true,
  default: { post: vi.fn().mockResolvedValue({}) },
}));

vi.mock("@/common/data/api/neynar", () => ({
  __esModule: true,
  default: {
    publishMessageToFarcaster: vi
      .fn()
      .mockResolvedValue({ result: "ok" }),
  },
}));

vi.mock("@farcaster/hub-web", () => ({
  __esModule: true,
  ID_REGISTRY_ADDRESS: "",
  KEY_GATEWAY_ADDRESS: "",
  SIGNED_KEY_REQUEST_TYPE: [],
  SIGNED_KEY_REQUEST_VALIDATOR_ADDRESS: "",
  SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_DOMAIN: {},
  Signer: class {},
  UserDataType: {},
  idRegistryABI: [],
  keyGatewayABI: [],
  makeUserDataAdd: vi.fn(),
  signedKeyRequestValidatorABI: [],
  FarcasterNetwork: { MAINNET: 1 },
}));

vi.mock("@farcaster/core", async () => {
  const actual = await vi.importActual<any>("@farcaster/core");
  return {
    ...actual,
    Message: {
      toJSON: vi.fn((msg) => msg),
    },
    makeReactionAdd: vi.fn(),
    makeReactionRemove: vi.fn(),
    makeLinkAdd: vi.fn(),
    makeLinkRemove: vi.fn(),
  };
});

describe("embed normalization", () => {
  it("filters invalid embeds and normalizes castId hashes", () => {
    const raw = [
      { url: "https://example.com/image.png", status: "loaded" },
      { castId: { fid: 2, hash: "0x001122" } },
      { malformed: true },
    ];

    const inspections = [
      { url: "https://example.com/image.png", type: "image" },
    ];

    const result = normalizeToFarcasterEmbeds(raw as any[], inspections as any);
    expect(result).toEqual([
      { url: "https://example.com/image.png" },
      { castId: { fid: 2, hash: new Uint8Array([0, 17, 34]) } },
    ]);
  });

  it("validates payloads", () => {
    expect(validateEmbedPayload([{ url: "https://site.com" }])).toBe(true);
    expect(
      validateEmbedPayload([{ castId: { fid: 1, hash: new Uint8Array([1, 2]) } }]),
    ).toBe(true);
    expect(validateEmbedPayload([{ url: 123 } as any])).toBe(false);
    expect(validateEmbedPayload("bad" as any)).toBe(false);
  });
});

describe("publishMessageHandler embed validation", () => {
  const createResponse = () => {
    const json = vi.fn();
    const res = {
      status: vi.fn().mockReturnThis(),
      json,
    } as any;
    return { res, json };
  };

  it("rejects invalid embed payloads", async () => {
    const { res, json } = createResponse();
    const req = {
      body: { embeds: [{ invalid: true }] },
    } as any;

    await publishMessageHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalled();
  });

  it("passes through valid embeds", async () => {
    const { res, json } = createResponse();
    const req = {
      body: { embeds: [{ url: "https://example.com" }], text: "hello" },
    } as any;

    await publishMessageHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ result: "ok" });
  });
});

describe("submitCast pipeline", () => {
  beforeEach(() => {
    axiosBackend.post.mockClear();
    Message.toJSON.mockClear();
  });

  it("sends signed messages with embeds unchanged", async () => {
    const signedMessage = { data: { embeds: [{ url: "https://video.com" }] } };

    const result = await submitCast(signedMessage as any, 1, {} as any);

    expect(result).toBe(true);
    expect(Message.toJSON).toHaveBeenCalledWith(signedMessage);
    expect(axiosBackend.post).toHaveBeenCalledWith(
      "/api/farcaster/neynar/publishMessage",
      signedMessage,
    );
  });

  it("returns false when backend rejects", async () => {
    axiosBackend.post.mockRejectedValueOnce(new Error("fail"));
    const result = await submitCast({ data: {} } as any, 1, {} as any);
    expect(result).toBe(false);
  });
});
