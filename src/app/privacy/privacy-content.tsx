"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { MarkdownRenderers } from "@/common/lib/utils/markdownRenderers";
import { AdminList } from "@/common/components/molecules/AdminList";
import type { CommunityAdminProfile } from "@/common/lib/utils/loadCommunityAdminProfiles";

type PrivacyContentProps = {
  communityId: string;
  adminProfiles: CommunityAdminProfile[];
};

const EFFECTIVE_DATE = "23 June 2025";

const getPrivacyIntro = (communityId: string) => String.raw`
# **${communityId} Privacy Notice**

---

*Effective date: ${EFFECTIVE_DATE}*

## We wrote this notice in plain English so you can quickly understand what data is collected, why it’s collected, and how you can control it. If anything is unclear, reach out on Discord or email **[privacy@blank.space](mailto:privacy@blank.space)**.

## **1. Who we are**

* **${communityId}** is a community-managed space system built on top of **blank.space**, an open-source platform for launching decentralized social spaces on the Farcaster protocol.
* **Platform owner & primary data controller (for U.S. law purposes):** **FrFr LLC** (Texas, USA), operating blank.space.
* **Community administrators:** The individuals or entities listed below manage and customize this space system and may receive access to certain data generated through it.

### **Space System Administrators**

The following identities are the publicly declared administrators of the **${communityId}** space system:
`;

const getPrivacyOutro = (communityId: string) => String.raw`

Each administrator identity should be rendered with:

* Profile picture (pfp)
* Username
* Link to their profile space on this space system (e.g. \`/s/[username]\`)

> **Important:** blank.space provides the underlying software and infrastructure, but **does not control how community administrators configure or operate their space systems**, similar to how WordPress does not control individual websites built on it.

---

## **2. What data we collect**

| Category                            | Examples                                                                                                                | How we collect it                            | Why we collect it                                               |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------- |
| **Account basics**                  | Farcaster username, wallet address (public key)                                                                         | You connect a wallet / log in with Farcaster | Identify you, display your profile, evaluate token-gated access |
| **Public space settings**           | Space title, theme, layout, bio                                                                                         | You configure a Space                        | Render your Space publicly and persist its configuration        |
| **Dashboard (“Homebase”) settings** | Feeds you follow, layout, filters                                                                                       | Stored client-side and synced **encrypted**  | So your private dashboard loads consistently across devices     |
| **Usage analytics**                 | Page views, clicks, feature usage, timestamps, truncated/hashed device ID; **IP used momentarily for geolocation only** | Automatically via **Mixpanel** SDK           | Debug issues, understand usage, improve the platform            |
| **Device & browser info**           | Browser type, OS, screen size                                                                                           | Mixpanel                                     | Same as above                                                   |

**We do *not* collect:** real names, email addresses, phone numbers, private keys, seed phrases, or raw IP addresses stored alongside your profile.

---

## **3. Cookies & similar technologies**

We use first-party cookies (or local-storage tokens) and Mixpanel cookies to:

* Remember your session
* Measure feature usage
* Review anonymized session replays for UX improvements

You can clear or block cookies in your browser settings. The core app will continue to function, though analytics accuracy may decrease.

---

## **4. How we use your data**

We use collected data to:

1. **Provide the service** — load Spaces, dashboards, and features.
2. **Operate & improve blank.space** — understand usage patterns and fix bugs.
3. **Enable community configuration** — allow admins to manage and evolve their space system.
4. **Security & abuse prevention** — detect fraud, spam, or automated attacks.
5. **Legal compliance** — meet legal obligations or defend our rights.

We **do not** sell or rent your personal data.

---

## **5. When and with whom we share data**

| Recipient                    | What they may access                                                                                        | Purpose                              |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **Community administrators** | Public space configs, moderation-relevant metadata, aggregate usage insights (never private dashboard data) | Operate and manage the space system  |
| **Mixpanel Inc.**            | Event data, hashed device ID, city/region derived from IP (**no raw IP stored**)                            | Product analytics and session replay |
| **Infrastructure providers** | Encrypted or pseudonymized data                                                                             | Hosting and platform operations      |
| **Law enforcement**          | Data we hold, if legally required                                                                           | Legal compliance                     |
| **Open-source forks**        | Source code only                                                                                            | GPLv3 license compliance             |

> **Note:** Community administrators may configure integrations, token-gating logic, or UI components that influence how data is used or displayed within their space system. blank.space does not independently audit these configurations.

---

## **6. How long we keep data**

| Data type                   | Retention period                                     |
| --------------------------- | ---------------------------------------------------- |
| Public Space configurations | Until deleted by the admin or space system is sunset |
| Encrypted dashboard data    | Until deleted by you or 12 months after last login   |
| Analytics events            | Up to 18 months, then deleted or aggregated          |
| Server logs                 | Up to 30 days for security purposes                  |

---

## **7. Your choices & rights**

You have control over your data:

* **Opt-out of analytics:** Block cookies or use a tracker-blocking extension (disables Mixpanel).
* **Access or export your data:** Contact us via Discord or email **[privacy@blank.space](mailto:privacy@blank.space)** with your Farcaster username.
* **Delete dashboard or Space:** Use in-app controls. Dashboard data is deleted server-side; public posts on Farcaster remain permanent.
* **GDPR & California rights:** You may request access, correction, or deletion of personal data. We respond within 30 days.
* **Do-Not-Track:** We respect DNT headers by disabling Mixpanel when \`DNT = 1\`.

---

## **8. Children’s privacy**

${communityId} is **not intended for children under 13**. If we become aware of a user under 13, we will disable analytics and limit data processing to what is strictly required to operate the service.

---

## **9. Security**

We take reasonable technical and organizational measures to protect data, including:

* Encryption in transit and at rest
* Client-side encryption for dashboard data (only your wallet can decrypt it)
* Least-privilege access controls for staff and contributors

No online service is 100% secure, but security is a top priority for blank.space.

---

## **10. International data transfers**

Data is hosted in the United States. By using ${communityId}, you consent to transferring your data to the U.S., which may have different data-protection laws than your country.

---

## **11. Changes to this notice**

We may update this Privacy Notice as the platform or space systems evolve. Material changes will be announced in-app or via community channels. Continued use after updates constitutes acceptance of the revised notice.

---

## **12. Contact us**

Questions or concerns?

* **Email:** [privacy@blank.space](mailto:privacy@blank.space)
* **Discord:** Support channels within the relevant space system

---

**By using ${communityId}, you acknowledge that it is a community-managed space system built on blank.space and that certain data may be shared with its administrators as described above.**
`;

const PrivacyContent = ({ communityId, adminProfiles }: PrivacyContentProps) => {
  return (
    <div className="max-w-screen-md mx-auto space-y-6 p-8">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={MarkdownRenderers()}
      >
        {getPrivacyIntro(communityId)}
      </ReactMarkdown>
      <AdminList admins={adminProfiles} />
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={MarkdownRenderers()}
      >
        {getPrivacyOutro(communityId)}
      </ReactMarkdown>
    </div>
  );
};

export default PrivacyContent;
