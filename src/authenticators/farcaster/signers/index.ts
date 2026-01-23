import { SignatureScheme } from "@farcaster/core";
import {
  AuthenticatorData,
  AuthenticatorMethodWrapper,
  AuthenticatorMethods,
} from "../..";
import BlankspaceFarcasterAuthenticator from "./BlankspaceManagedSignerAuthenticator";

export type SignerStatus = "pending" | "approved" | "revoked" | "completed";
export type FarcasterRegistrationType = "account" | "signer";

export interface FarcasterSignerAuthenticatorData extends AuthenticatorData {
  accountFid?: number;
  signerFid?: number;
  token?: string;
}

export interface FarcasterSignerAuthenticatorMethods<
  D extends FarcasterSignerAuthenticatorData,
> extends AuthenticatorMethods<D> {
  signMessage: AuthenticatorMethodWrapper<
    (messageHash: Uint8Array) => Promise<Uint8Array>,
    D
  >;
  // Same as the account's public key for account type
  getSignerPublicKey: AuthenticatorMethodWrapper<() => Promise<Uint8Array>, D>;
  // Returns the signature scheme
  getSignerScheme: AuthenticatorMethodWrapper<
    () => Promise<SignatureScheme>,
    D
  >;
  // Always returns "approved" for "account"
  getSignerStatus: AuthenticatorMethodWrapper<() => Promise<SignerStatus>, D>;
  // Returns the URL for the user to auth
  createNewSigner: AuthenticatorMethodWrapper<
    () => Promise<string | undefined>,
    D
  >;
  // Returns the FID of the new account that is created
  createNewAccount: AuthenticatorMethodWrapper<() => Promise<number>, D>;
  // FID of the account that requested the signer -- same as Account FID for accounts
  getSignerFid: AuthenticatorMethodWrapper<() => Promise<number>, D>;
  // FID of the account that the signer signs on behalf of
  getAccountFid: AuthenticatorMethodWrapper<() => Promise<number>, D>;
  // Says if the Authenticator is a signer or an account
  getRegistrationType: AuthenticatorMethodWrapper<
    () => Promise<FarcasterRegistrationType>,
    D
  >;
  // Pull recent data about the signer if it exists
  updateSignerInfo: AuthenticatorMethodWrapper<() => Promise<void>, D>;
}

export default {
  blankspace: BlankspaceFarcasterAuthenticator,
};
