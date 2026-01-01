'use client'
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { MarkdownRenderers } from "@/common/lib/utils/markdownRenderers";

const PRIVACY_MD = `
**Nounspace Privacy Notice**
---
*Effective date: 23 June 2025*

We wrote this notice in plain English so you can quickly understand what data we collect, why we collect it, and how you can control it. If anything is unclear, ping us on Discord or email **privacy@nounspace.com**.
---
## **1. Who we are**
* **Nounspace** is an open-source social app built on the Farcaster protocol.
* **Owner:** nounspace DAO
* **Developer & data controller (for U.S. law purposes):** FrFr LLC (Texas, USA)
---
## **2. What data we collect**
| Category | Examples | How we collect it | Why we collect it |
| ----- | ----- | ----- | ----- |
| **Account basics** | Farcaster username, wallet address (public key) | You connect a wallet / log in with Farcaster | To recognise you, check token-gated access, show your profile |
| **Public space settings** | Title, theme, layout, bio | You configure a Space | To display your Space to you and the public |
| **Dashboard ("Homebase") settings** | Feeds you follow, layout, filters | Saved client-side and synced to us **encrypted** | So your private dashboard loads the same on any device |
| **Usage analytics** | Page views, button clicks, feature usage, event timestamps, truncated/hashed device ID; **IP address used momentarily for geolocation lookup only** | Automatically via **Mixpanel** and **Fullstory** SDKs | To troubleshoot bugs, understand which features people like, and improve the app |
| **Device & browser info** | Browser type, OS, screen size | Mixpanel / Fullstory | Same as above |
**We do *not* collect:** real name, email, phone number, private keys, or full IP addresses stored alongside your profile.
---
## **3. Cookies & similar tech**
We use first-party cookies (or local-storage tokens) plus Mixpanel and Fullstory cookies to remember you, measure product usage, and review anonymised session replays for UX improvements. You can clear or block these in your browser settings; the core app will still work but analytics accuracy drops.
---
## **4. How we use your data**
1. **Provide the service** - load your Spaces, verify token-gated features.
2. **Improve nounspace** - aggregate analytics and privacy-screened session replays (Mixpanel, Fullstory) help us see what breaks or what's popular.
3. **Security & fraud prevention** - spot abuse or automated attacks.
4. **Legal compliance** - keep records required by law or to defend our rights.
We **do not** sell or rent your personal data.
---
## **5. When we share data**
| Who | What they see | Purpose |
| ----- | ----- | ----- |
| **Mixpanel Inc.** | Event data, hashed device ID, geolocation derived from IP (city/region), **no raw IP stored** | Product analytics |
| **Fullstory Inc.** | Event data, hashed device ID, limited session replay snippets (with sensitive views masked) | Understand user flows and improve usability |
| **Infrastructure providers** (e.g., cloud hosting) | Encrypted or pseudonymised data in transit/storage | Operate the platform |
| **Law enforcement** | Data we hold, if legally compelled | Legal compliance |
| **Community forks** | Open-source code *only*, never your analytics data | GPLv3 requirement |
---
## **6. How long we keep data**
| Data | Retention period |
| ----- | ----- |
| Public Space configs | Until you delete the Space or nounspace sunsets |
| Encrypted dashboard data | Until you delete it or 12 months after your last login, whichever is later |
| Analytics events | 18 months, then permanently deleted or aggregated |
| Server logs | Up to 30 days for security, then deleted |
---
## **7. Your choices & rights**
* **Opt-out of analytics:** Block cookies or use a tracker-blocking browser extension; this disables Mixpanel and Fullstory collection.
* **Access / download your data:** DM a mod on Discord or email privacy@nounspace.com with your Farcaster username; we'll export what we have.
* **Delete dashboard or Space:** Use in-app controls; dashboard data is wiped server-side, Space config removed from our DB (posts on Farcaster remain public).
* **California & GDPR rights:** You can request deletion, correction, or a copy of your personal data. We honour valid requests within 30 days.
* **Do-Not-Track signals:** We respect DNT headers by disabling Mixpanel and Fullstory when DNT = 1.
---
## **8. Children's privacy**
Nounspace is **not intended for children under 13**. If we learn someone under 13 is using nounspace, we'll disable analytics for that user and limit data processing to run the core service.
---
## **9. Security**
* **Encryption in transit & at rest** for all data.
* **Dashboard data** is encrypted client-side with your wallet key; we cannot decrypt it.
* Least-privilege access controls for staff; each DAO contributor only sees what they need.
No online service is 100 % secure, but we take reasonable technical and organisational measures to protect your data.
---
## **10. International transfers**
We host data in the United States. If you access nounspace from outside the U.S., you consent to transferring your data to the U.S., which may have different data-protection laws than your country.
---
## **11. Changes to this notice**
We may update this Privacy Notice as the project evolves. Material changes will be announced in-app and on our Discord. Continued use after an update means you accept the new version.
---
## **12. Contact us**
Questions or concerns?
* **Email:** privacy@nounspace.com
* **Discord:** #support channel
We're committed to making nounspace transparent and user-controlled. Thanks for helping us build a better decentralized social web!


We wrote this notice in plain English so you can quickly understand what data we collect, why we collect it, and how you can control it. If anything is unclear, ping us on Discord or email **privacy@nounspace.com**.

---

## **1. Who we are**

* **Nounspace** is an open‑source social app built on the Farcaster protocol.

* **Owner:** nounspace DAO

* **Developer & data controller (for U.S. law purposes):** FrFr LLC (Texas, USA)

---

## **2. What data we collect**

| Category | Examples | How we collect it | Why we collect it |
| ----- | ----- | ----- | ----- |
| **Account basics** | Farcaster username, wallet address (public key) | You connect a wallet / log in with Farcaster | To recognise you, check token‑gated access, show your profile |
| **Public space settings** | Title, theme, layout, bio | You configure a Space | To display your Space to you and the public |
| **Dashboard (“Homebase”) settings** | Feeds you follow, layout, filters | Saved client‑side and synced to us **encrypted** | So your private dashboard loads the same on any device |
| **Usage analytics** | Page views, button clicks, feature usage, event timestamps, truncated/hashed device ID; **IP address used momentarily for geolocation lookup only** | Automatically via **Mixpanel** and **Fullstory** SDKs | To troubleshoot bugs, understand which features people like, and improve the app |
| **Device & browser info** | Browser type, OS, screen size | Mixpanel / Fullstory | Same as above |

**We do *not* collect:** real name, email, phone number, private keys, or full IP addresses stored alongside your profile.

---

## **3. Cookies & similar tech**

We use first‑party cookies (or local‑storage tokens) plus Mixpanel and Fullstory cookies to remember you, measure product usage, and review anonymised session replays for UX improvements. You can clear or block these in your browser settings; the core app will still work but analytics accuracy drops.

---

## **4. How we use your data**

1. **Provide the service** – load your Spaces, verify token‑gated features.

2. **Improve nounspace** – aggregate analytics and privacy-screened session replays (Mixpanel, Fullstory) help us see what breaks or what’s popular.

3. **Security & fraud prevention** – spot abuse or automated attacks.

4. **Legal compliance** – keep records required by law or to defend our rights.

We **do not** sell or rent your personal data.

---

## **5. When we share data**

| Who | What they see | Purpose |
| ----- | ----- | ----- |
| **Mixpanel Inc.** | Event data, hashed device ID, geolocation derived from IP (city/region), **no raw IP stored** | Product analytics |
| **Fullstory Inc.** | Event data, hashed device ID, limited session replay snippets (with sensitive views masked) | Understand user flows and improve usability |
| **Infrastructure providers** (e.g., cloud hosting) | Encrypted or pseudonymised data in transit/storage | Operate the platform |
| **Law enforcement** | Data we hold, if legally compelled | Legal compliance |
| **Community forks** | Open‑source code *only*, never your analytics data | GPLv3 requirement |

---

## **6. How long we keep data**

| Data | Retention period |
| ----- | ----- |
| Public Space configs | Until you delete the Space or nounspace sunsets |
| Encrypted dashboard data | Until you delete it or 12 months after your last login, whichever is later |
| Analytics events | 18 months, then permanently deleted or aggregated |
| Server logs | Up to 30 days for security, then deleted |

---

## **7. Your choices & rights**

* **Opt‑out of analytics:** Block cookies or use a tracker‑blocking browser extension; this disables Mixpanel and Fullstory collection.

* **Access / download your data:** DM a mod on Discord or email privacy@nounspace.com with your Farcaster username; we’ll export what we have.

* **Delete dashboard or Space:** Use in‑app controls; dashboard data is wiped server‑side, Space config removed from our DB (posts on Farcaster remain public).

* **California & GDPR rights:** You can request deletion, correction, or a copy of your personal data. We honour valid requests within 30 days.

* **Do‑Not‑Track signals:** We respect DNT headers by disabling Mixpanel and Fullstory when DNT = 1.

---

## **8. Children’s privacy**

Nounspace is **not intended for children under 13**. If we learn someone under 13 is using nounspace, we’ll disable analytics for that user and limit data processing to run the core service.

---

## **9. Security**

* **Encryption in transit & at rest** for all data.

* **Dashboard data** is encrypted client‑side with your wallet key; we cannot decrypt it.

* Least‑privilege access controls for staff; each DAO contributor only sees what they need.

No online service is 100% secure, but we take reasonable technical and organisational measures to protect your data.

---

## **10. International transfers**

We host data in the United States. If you access nounspace from outside the U.S., you consent to transferring your data to the U.S., which may have different data‑protection laws than your country.

---

## **11. Changes to this notice**

We may update this Privacy Notice as the project evolves. Material changes will be announced in‑app and on our Discord. Continued use after an update means you accept the new version.

---

## **12. Contact us**

Questions or concerns?

* **Email:** privacy@nounspace.com

* **Discord:** #support channel

We’re committed to making nounspace transparent and user‑controlled. Thanks for helping us build a better decentralized social web!

`;

export default function PrivacyPage() {
  return (
    <div className="max-w-screen-md mx-auto p-8">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={MarkdownRenderers()}
      >
        {PRIVACY_MD}
      </ReactMarkdown>
    </div>
  );
}
