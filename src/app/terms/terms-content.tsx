"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { MarkdownRenderers } from "@/common/lib/utils/markdownRenderers";
import { AdminList } from "@/common/components/molecules/AdminList";
import type { CommunityAdminProfile } from "@/common/lib/utils/loadCommunityAdminProfiles";

type TermsContentProps = {
  communityId: string;
  adminProfiles: CommunityAdminProfile[];
};

const getTermsIntro = (communityId: string) => String.raw`
## **Introduction**

Welcome to **${communityId}** – a community-managed social space system built on top of **blank.space**, an open-source platform for launching and customizing decentralized social applications on the Farcaster network [GitHub](https://github.com/farcasterxyz/protocol/blob/48e64b81dec992bee0728764d3743975d1f4ff08/README.md#L7-L8).

The **${communityId} space system** is configured and managed by its respective community administrators (listed below), while **blank.space** is developed and maintained by **FrFr LLC**. By using this space system, you agree to the following Terms and Conditions, written in plain language for clarity and intended to align with United States law while remaining understandable to users worldwide.

> **Important:** Much like WordPress provides software but does not control the websites built with it, **blank.space does not control how individual communities configure or operate their space systems**. Responsibility for customization, moderation decisions, token-gating, pricing, and integrations rests with the community administrators of **${communityId}**.

## **Space System Administrators**

The following identities are the publicly declared administrators of the **${communityId}** space system:
`;

const getTermsAdminOutro = (communityId: string) => String.raw`

These administrators are responsible for how this space system is configured and managed.

## **Access and Features**

**Beta Access:** Space systems built on blank.space are currently available during a beta period. During this time, access may be provided free of charge.

**Future Access & Pricing:** While blank.space currently provides the underlying platform at no cost during beta, **FrFr LLC and/or the community administrators of ${communityId} may choose to introduce paid access, subscriptions, or token-gated entry in the future**. Any such changes will be communicated by the relevant administrators.

**Token-Gated Features:** Some features within this space system may be token-gated. Token requirements, thresholds, and accepted assets are determined **entirely by the community administrators** of ${communityId} and may change over time.

## **Critical Wallet & Security Notice**

This space system may prompt you to **connect a wallet, sign messages, or initiate transactions**.

**You must exercise extreme caution at all times.**

* Never enter seed phrases, private keys, or sensitive information.
* Always verify what you are signing and why.
* Do not assume that prompts, transactions, or links are safe simply because they appear inside a space system.
* **Don’t trust — verify.**

Neither blank.space nor FrFr LLC can verify or guarantee the safety of customizations, integrations, or token logic implemented by community administrators. **You are solely responsible for your on-chain actions.**

## **Content and Spaces**

**Content Permanence (No Deletions):**
This space system operates on top of decentralized social infrastructure. Posts, identities, and interactions may be permanent and irreversible. Think carefully before publishing content.

**Spaces and Moderation:**
Community administrators may configure, curate, or moderate custom spaces, themes, tabs, or fidgets within ${communityId}. blank.space does not control or pre-approve these decisions.

## **Community Guidelines (User Conduct)**

We want ${communityId} to be a welcoming and inclusive environment. By using this space system, you agree to follow these guidelines:

* **Be Respectful and Inclusive**
* **No Harassment or Hate**
* **No Trolling or Abuse**
* **Appropriate Content Only**
* **Respect Privacy (No Doxxing)**
* **No Spam or Malicious Activity**
* **Follow the Law**

**Enforcement:**
Enforcement actions may be taken by community administrators and/or by the operators of blank.space where technically necessary. Actions may include moderation of spaces or revocation of access to custom features.

## **Data Storage and Privacy**

**Public Configuration Data:**
Public space configuration (themes, layouts, settings) may be stored to ensure the space system functions as intended.

**Encrypted Personal Data:**
Personal dashboards or “homebase” configurations may be stored in encrypted form, accessible only via your wallet.

blank.space minimizes centralized data storage and does not custody user keys or wallets.

## **Open-Source License and Forking**

The blank.space platform (including the software used to power this space system) is released under the **GNU General Public License v3 (GPLv3)** [GitHub](https://github.com/blankdotspace/space-system/blob/6164dc24ca058866aba9e3a94ddfe48f36bd7696/LICENSE#L1-L5).

You are free to fork, modify, and reuse the code under the terms of that license, provided derivative works remain open-source.

## **Disclaimer of Warranties**

**As-Is, No Warranty:**
This space system and the blank.space platform are provided **“as is”**, without warranties of any kind.

**Use at Your Own Risk:**
Neither FrFr LLC nor blank.space nor the community administrators of ${communityId} guarantee availability, security, correctness, or fitness for any purpose.

## **Limitation of Liability**

To the maximum extent permitted by law:

* **FrFr LLC** and **blank.space** are not liable for damages arising from use of this space system.
* **Community administrators** are not liable for user losses resulting from configuration choices, token gates, or integrations.
* User-generated and third-party content is the sole responsibility of its creators.

You agree to indemnify FrFr LLC and blank.space against claims arising from your misuse of the platform.

## **Governing Law and Dispute Resolution**

These Terms are governed by **United States law**.

**Arbitration:**
Disputes must be resolved through binding arbitration in the United States, on an individual basis, except where small-claims court applies.

**Equitable Relief:**
We reserve the right to seek injunctive relief for urgent or irreparable harm.

## **Changes to These Terms**

These Terms may be updated from time to time. Continued use of ${communityId} after changes constitutes acceptance of the updated Terms.

## **Contact and Support**

Support channels may vary by space system. Common avenues include:

* **Discord**
* **GitHub**
* **Community-provided contact methods**

For issues related to the underlying platform, blank.space may be contacted through its official channels on [Discord](https://discord.gg/TAqsDAp3XW) and [Github](https://github.com/blankdotspace/space-system)

---

**By using ${communityId}, you acknowledge that you understand this is a community-managed space system built on blank.space and that you accept all risks associated with decentralized, wallet-based applications.**
`;

const TermsContent = ({ communityId, adminProfiles }: TermsContentProps) => {
  return (
    <div className="max-w-screen-md mx-auto space-y-6 p-8">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={MarkdownRenderers()}
      >
        {getTermsIntro(communityId)}
      </ReactMarkdown>
      <AdminList admins={adminProfiles} />
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={MarkdownRenderers()}
      >
        {getTermsAdminOutro(communityId)}
      </ReactMarkdown>
    </div>
  );
};

export default TermsContent;
