import {
  FidLinkToIdentityRequest,
  FidLinkToIdentityResponse,
  FidsLinkedToIdentityResponse,
} from "@/pages/api/fid-link";
import { AppStore } from "..";
import { StoreGet, StoreSet } from "../../createStore";
import axiosBackend from "../../../api/backend";
import { concat, isUndefined } from "lodash";
import { hashObject } from "@/common/lib/signedFiles";
import moment from "moment";
import { bytesToHex } from "@noble/ciphers/utils";
import { AnalyticsEvent } from "@/common/constants/analyticsEvents";
import { analytics } from "@/common/providers/AnalyticsProvider";

type FarcasterActions = {
  getFidsForCurrentIdentity: () => Promise<void>;
  registerFidForCurrentIdentity: (
    fid: number,
    signingKey?: string,
    // Takes in signMessage as it is a method
    // of the Authenticator and client doesn't
    // have direct access to the keys
    signMessage?: (messageHash: Uint8Array) => Promise<Uint8Array>,
  ) => Promise<void>;
  setFidsForCurrentIdentity: (fids: number[]) => void;
  addFidToCurrentIdentity: (fid: number) => void;
};

export type FarcasterStore = FarcasterActions;

export const farcasterStore = (
  set: StoreSet<AppStore>,
  get: StoreGet<AppStore>,
): FarcasterStore => ({
  addFidToCurrentIdentity: (fid) => {
    const currentFids =
      get().account.getCurrentIdentity()?.associatedFids || [];
    get().account.setFidsForCurrentIdentity(concat(currentFids, [fid]));
  },
  setFidsForCurrentIdentity: (fids) => {
    set((draft) => {
      const currentIndex = draft.account.getCurrentIdentityIndex();
      if (currentIndex >= 0 && draft.account.spaceIdentities[currentIndex]) {
        draft.account.spaceIdentities[currentIndex].associatedFids = fids;
      }
    }, "setFidsForCurrentIdentity");
  },
  getFidsForCurrentIdentity: async () => {
    const identityPublicKey = get().account.currentSpaceIdentityPublicKey;
    if (!identityPublicKey) {
      console.warn("[farcasterStore] getFidsForCurrentIdentity: No identity, skipping");
      return;
    }
    try {
      const { data } = await axiosBackend.get<FidsLinkedToIdentityResponse>(
        "/api/fid-link",
        {
          params: {
            identityPublicKey,
          },
        },
      );
      if (!isUndefined(data.value)) {
        get().account.setFidsForCurrentIdentity(data.value!.fids);
      }
    } catch (error) {
      console.error("[farcasterStore] Failed to fetch FIDs:", error);
    }
  },
  registerFidForCurrentIdentity: async (fid, signingKey, signMessage) => {
    if (!get().account.currentSpaceIdentityPublicKey) {
      throw new Error("No current identity loaded, cannot register FID");
    }
    if (signingKey && !signMessage) {
      throw new Error("signMessage is required when signingKey is provided");
    }
    const baseRequest: FidLinkToIdentityRequest = {
      fid,
      identityPublicKey: get().account.currentSpaceIdentityPublicKey!,
      timestamp: moment().toISOString(),
      signingPublicKey: signingKey ?? null,
      signature: null,
    };
    const signedRequest: FidLinkToIdentityRequest = signingKey
      ? {
          ...baseRequest,
          signature: bytesToHex(
            await signMessage!(
              hashObject({
                fid: baseRequest.fid,
                identityPublicKey: baseRequest.identityPublicKey,
                timestamp: baseRequest.timestamp,
                signingPublicKey: baseRequest.signingPublicKey,
              })
            )
          ),
        }
      : baseRequest;
    const { data } = await axiosBackend.post<FidLinkToIdentityResponse>(
      "/api/fid-link",
      signedRequest,
    );
    if (!isUndefined(data.value)) {
      get().account.addFidToCurrentIdentity(data.value!.fid);
      analytics.track(AnalyticsEvent.LINK_FID, { fid });
    }
  },
});