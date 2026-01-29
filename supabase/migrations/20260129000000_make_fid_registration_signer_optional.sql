-- Allow linking an identity to an inferred FID without requiring a Farcaster signer.
-- Signer-related fields remain nullable until the user authorizes Nounspace as a signer.

alter table public."fidRegistrations"
  alter column "signature" drop not null,
  alter column "signingPublicKey" drop not null,
  alter column "signingKeyLastValidatedAt" drop not null;

alter table public."fidRegistrations"
  alter column "isSigningKeyValid" set default false;

