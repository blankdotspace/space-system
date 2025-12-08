alter table "public"."fidRegistrations"
  alter column "signature" drop not null,
  alter column "signingPublicKey" drop not null,
  alter column "signingKeyLastValidatedAt" drop not null,
  alter column "isSigningKeyValid" set default false;
