'use client'
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { MarkdownRenderers } from "@/common/lib/utils/markdownRenderers";

const TERMS_MD = String.raw`
## **Introduction**

Welcome to **nounspace** – an open-source social application built on the Farcaster network[GitHub](https://github.com/farcasterxyz/protocol/blob/48e64b81dec992bee0728764d3743975d1f4ff08/README.md#L7-L8). Nounspace is owned by the **nounspace DAO** and developed by **FrFr LLC**. By using nounspace, you agree to the following terms and conditions, which are written in plain language for clarity. These Terms aim to align with United States law while remaining understandable and relevant for users worldwide.

## **Access and Features**

**Free, “As-Is” Service:** Nounspace is provided to you free of charge on an “as-is” basis. This means the platform is offered without any guarantees, and you use it at your own risk (we’ll explain more about this in the Disclaimers section). All core features of nounspace are free to use.

**Token-Gated Features:** Some advanced features on nounspace are *token-gated*. To access those, you need to hold certain tokens in your connected wallet. Communities can configure which tokens unlock access; holding **one eligible NFT** or at least **1,111 units of an eligible ERC20** will pass the gate. If a community hasn’t configured custom tokens yet, the legacy fallback applies: a nounspace OG (nOGs) NFT or a sufficient $SPACE ERC20 balance will unlock access. Thresholds or token selections may change over time and will be communicated when updated.

**Future Premium Features:** Nounspace may introduce optional premium features or subscriptions in the future. These would be paid features to enhance your experience, but using them will be completely optional. If and when premium subscriptions are offered, we will provide details on the pricing and any additional terms for those services. The basic version of nounspace will remain free.

## **Content and Spaces**

**Content Permanence (No Deletions):** Please note that nounspace does **not** allow deletion of posts or accounts. Once you create an account or post content, it becomes part of the Farcaster decentralized social network and cannot be removed from the platform. In other words, anything you post on nounspace is essentially permanent. Think carefully about what you share, as you won’t be able to undo it later. (This permanence is partly due to the nature of the Farcaster protocol, which is decentralized and designed for open data.)

**User Spaces and Moderation:** Nounspace lets you create and customize your own spaces (public pages or communities) within the app. While we generally do not censor or remove content, we **do** reserve the right to remove or moderate user-created spaces if they violate our Community Guidelines or any applicable laws. For example, if a space you create contains content that breaks the rules (see Community Guidelines below), we may remove that space or take down the offending material. This is to ensure nounspace remains a safe and welcoming environment. We do *not* remove posts or accounts, but specific features like custom spaces, profiles, or other customizable areas of the platform can be moderated if needed to enforce the rules.

## **Community Guidelines (User Conduct)**

We want nounspace to be a friendly and inclusive community. To achieve that, we have a set of Community Guidelines that all users are expected to follow. These guidelines are inspired by the Contributor Covenant (a well-known open-source code of conduct) to foster an open and welcoming environment. By participating in nounspace, **you agree to interact with others respectfully and refrain from harmful behavior**. In plain terms:

* **Be Respectful and Inclusive:** Treat all other users with respect. Everyone is welcome on nounspace, regardless of their background, identity, or beliefs. Use welcoming and inclusive language. Healthy debate is fine, but *polite* behavior is mandatory.

* **No Harassment or Hate:** Harassing, threatening, or attacking others is strictly prohibited. This includes personal attacks, intimidation, or encouragement of harm toward anyone. Hateful conduct – such as racist, sexist, homophobic, transphobic, or other derogatory remarks targeting a group – is not allowed. We have zero tolerance for hate speech or harassment.

* **No Trolling or Abuse:** Don’t engage in trolling, baiting, or deliberately disrupting conversations. Bullying or repeatedly bothering someone who doesn’t want to interact with you is not okay. Keep discussions civil and on-topic.

* **Appropriate Content Only:** Do not use sexualized language or post sexual imagery that is inappropriate for a general audience[contributor-covenant.org](https://www.contributor-covenant.org/version/1/2/0/code-of-conduct/#:~:text=Examples%20of%20unacceptable%20behavior%20by,participants%20include). Similarly, avoid posting graphic or violent content that is not flagged and not suitable for everyone. Basically, content that would make others feel unsafe or extremely uncomfortable doesn’t belong here.

* **Respect Privacy:** Do not share another person’s private information without their consent. This means **no doxxing** – e.g., don’t post someone else’s physical address, email, private messages, photos, or other personal data without permission[contributor-covenant.org](https://www.contributor-covenant.org/version/1/2/0/code-of-conduct/#:~:text=,Other%20unethical%20or%20unprofessional%20conduct). Everyone has a right to privacy.

* **No Spam or Malicious Activity:** Don’t spam the platform with repetitive or irrelevant content. Additionally, do not use nounspace to spread malware, phishing links, or any content intended to deceive or harm other users’ devices or accounts. Keep the platform useful and safe for everyone.

* **Follow the Law:** You are responsible for making sure your activities on nounspace are legal in your jurisdiction. Do not use nounspace to do anything illegal – no promoting criminal activity, no fraud, and no violating intellectual property rights. If it’s illegal in the offline world or on the rest of the web, it’s illegal here too.

**Enforcement:** These Community Guidelines are here to protect users and the community. If you violate any of the above rules, we may take action. That can include removing or editing offending content, removing your custom space, or in serious cases, suspending or terminating your access to nounspace. We aim to apply these rules fairly and consistently. If you believe someone is violating the guidelines, you can report it through our support channels. We will review and address reports confidentially. Remember, our goal is to maintain a harassment-free, enjoyable experience for everyone on nounspace[contributor-covenant.org](https://www.contributor-covenant.org/version/1/2/0/code-of-conduct/#:~:text=Examples%20of%20unacceptable%20behavior%20by,participants%20include).

## **Data Storage and Privacy**

Your privacy and data security are important to us. Nounspace is a decentralized app, which means it minimizes the amount of data stored in any central database. However, to provide certain features, nounspace does store some information:

* **Public Space Configuration:** If you create or customize a public *Space* (like a profile page or community) on nounspace, we save the configuration data for that space. This may include things like the title of your space, layout settings, themes or colors you’ve chosen, and any descriptions or settings associated with your space. We store this so that your space looks and functions the way you set it, each time you or others visit it. This configuration data is considered public (since it’s for a public-facing space).

* **Encrypted Dashboard (Homebase) Data:** Nounspace provides you with a personal dashboard (sometimes called your “homebase”) where you can curate and organize content for your own use. The settings or data for your personal dashboard are stored in an **encrypted** form. Only **you** can decrypt and access this information using your embedded wallet (which acts as your private key). In practical terms, this means even though the data is stored on our servers, neither FrFr LLC nor the nounspace DAO (nor anyone else) can read your personal dashboard contents – it’s locked away with encryption that only your wallet can unlock. So, your private notes or configuration in your dashboard remain private to you.

Aside from the above, nounspace does not centrally store your social posts or messages – those exist on the Farcaster network, which is decentralized. We do not collect unnecessary personal information. For example, nounspace doesn’t ask for your real name or address to create an account; your identity on nounspace is linked to your Farcaster account (typically a crypto wallet identity or username).

Please be aware that because nounspace is globally accessible, the data you choose to share publicly (like posts or space content) can be seen by users around the world. We encourage you to only share information that you’re comfortable making public. For more details on how the platform operates and handles data, you may refer to our Privacy Policy (if available) or ask us through our support channels.

## **Open-Source License and Forking**

Nounspace is proud to be an open-source project. All of our software code is released under the **GNU General Public License version 3 (GPLv3)**[GitHub](https://github.com/Nounspace/nounspace.ts/blob/6164dc24ca058866aba9e3a94ddfe48f36bd7696/LICENSE#L1-L5). This means the codebase is free for anyone to view, use, and modify under the terms of that license. In plain language: you are welcome to **fork** (copy and create your own version of) the nounspace project, or contribute to it, as long as any changes or new projects you create based on our code are also **made open-source under the same GPLv3 license**.

In other words, GPLv3 protects both us and you by ensuring nounspace remains a community project – you can’t take our code and make a proprietary closed-source app with it. If you do use our code, you have to give the same freedoms to your users that we are giving to you. We believe in decentralization and community ownership, so this license is a key part of nounspace’s ethos.

For reference, the GPLv3 license guarantees that the software comes with **no warranty** and is provided *as-is*[GitHub](https://github.com/Nounspace/nounspace.ts/blob/6164dc24ca058866aba9e3a94ddfe48f36bd7696/LICENSE#L14-L18) (as mentioned earlier in the Disclaimers section). The full text of the GPLv3 is available with our source code. If you are not familiar with GPLv3 and plan to reuse the code, we encourage you to read it or consult with someone who understands open-source licenses, so you comply with its terms.

## **Disclaimer of Warranties**

**“As-Is” and No Warranty**: Nounspace is provided to you **as is**, without any promises or guarantees about its performance or reliability[GitHub](https://github.com/Nounspace/nounspace.ts/blob/6164dc24ca058866aba9e3a94ddfe48f36bd7696/LICENSE#L14-L18). That means we do **not** guarantee that the platform will be bug-free, error-free, or always available. We also do not guarantee that nounspace will meet all your needs or expectations. You use nounspace with the understanding that there may be occasional glitches, downtime, or imperfections, since it’s an evolving platform (and remember, it’s free and open-source!).

**Use at Your Own Risk:** Using nounspace involves the same kinds of risks you’d face using any part of the open web. For example, you might encounter user-generated content that is incorrect, offensive, or harmful. There is also the inherent risk that software (including nounspace) could have unknown bugs or security vulnerabilities. By using nounspace, you agree that you understand these risks and are choosing to use the platform anyway. **FrFr LLC and the nounspace DAO are not responsible if something goes wrong** while you’re using nounspace, to the fullest extent permitted by law. This includes things like potential loss of data, exposure to undesirable content, or any other harm. We encourage you to take standard precautions (like not sharing sensitive personal information, using up-to-date antivirus, and practicing good security with your crypto wallet) when using nounspace, just as you should on any website.

## **Limitation of Liability**

**No Liability for Damages:** To the maximum extent allowed by law, **FrFr LLC and the nounspace DAO will not be liable for any damages or losses arising from your use of nounspace.** This means that if you suffer harm, lose money, or have any other negative experience through nounspace, you generally cannot hold us legally responsible. For instance, if someone misuses content you posted, or if nounspace is unavailable for a period of time, or if a bug in the software causes an issue, you accept that we are not financially responsible for those outcomes. We are offering this platform for free and as a community service, and we disclaim liability as much as the law allows. In legal terms, **all warranties (if any) are disclaimed and any liability on our part is excluded to the fullest extent permitted by law**[GitHub](https://github.com/Nounspace/nounspace.ts/blob/6164dc24ca058866aba9e3a94ddfe48f36bd7696/LICENSE#L14-L18).

**Third-Party Content:** Nounspace displays content from the Farcaster decentralized network and possibly other integrated services. We do not have control over what other users post on Farcaster. Therefore, we are **not liable for content** that is generated by users or third parties. If you see something on nounspace that you believe violates our guidelines or someone’s rights, please report it, but understand that the responsibility for that content lies with the person who posted it, not with nounspace itself.

**Indemnification:** *(Indemnification is a legal term, but we’ll keep this simple.)* If your actions cause harm to us or violate someone else’s rights and we get into legal trouble because of it, you agree to indemnify us. This means you’ll reimburse FrFr LLC and/or the nounspace DAO for any costs, losses, or legal fees arising out of your actions in violation of these Terms. We hope that never happens, but it’s important to state.

## **Governing Law and Dispute Resolution**

**Governing Law:** These Terms and Conditions are governed by the laws of the United States. Nounspace is based in the U.S., and even though it’s accessible globally, we operate under U.S. law. If you are using nounspace from outside the U.S., you are still responsible for complying with any local laws that apply to you, but the core agreement between you and us (the Terms) is subject to U.S. law. (Nothing in these Terms is meant to override mandatory laws in your own country that protect you as a consumer; if any part of these Terms is not enforceable in your region, the rest of the Terms still apply.)

**Dispute Resolution - Arbitration:** If you have any dispute or claim arising out of your use of nounspace or these Terms, **you agree to resolve it through binding arbitration in the United States**, rather than through courts. Arbitration is a process where a neutral third-party (an arbitrator) hears both sides of the dispute and makes a final decision. By agreeing to arbitration, **you are waiving your right to a trial in court and to have a judge or jury decide the case.** Instead, an arbitrator will resolve the issue. The arbitration will be conducted in the U.S. (in an appropriate venue to be determined, likely the jurisdiction where FrFr LLC is registered). Each party will bear its own costs, and the arbitrator’s decision will be final and enforceable like a court order.

We also ask that any dispute be handled **on an individual basis**. This means you agree not to bring a class action or collective lawsuit against us. In other words, you won’t combine your claim with others or sue on behalf of a group of users – any dispute you have will be yours alone. This is to keep dispute resolution efficient and fair.

**Exception – Small Claims:** If your issue is minor and qualifies for small claims court, you may choose to pursue it in an appropriate small claims court instead of arbitration. (Small claims courts handle cases involving only modest sums of money and are a simpler, quicker process than formal court or arbitration.)

**Equitable Relief:** This is a legal point – if you violate these Terms in a way that causes irreparable harm to us (for example, hacking the service or abusing it in a way that damages other users), we reserve the right to seek injunctive relief in a court. That means we could ask a court to make you stop certain actions immediately without going through arbitration first, because some matters might require urgent legal intervention. This doesn’t negate the agreement to arbitrate other disputes; it’s just an exception for urgent cases.

## **Changes to These Terms**

We may occasionally update or change these Terms and Conditions. As nounspace grows and laws evolve, new situations might arise that require modifications to our terms. If we make a significant change, we will do our best to notify users (for example, via an announcement on the platform or a notification). The latest version of the Terms will always be available for you to read. We will update the “last updated” date at the top (or bottom) of this document when changes are made. By continuing to use nounspace after a revised Terms and Conditions has been posted, you are agreeing to the updated terms. If you do not agree with a change, you should stop using nounspace.

We encourage you to review these Terms from time to time so you stay informed about your rights and obligations when using nounspace.

## **Contact and Support**

Nounspace is a community-driven project, and we value our users. If you have any questions, concerns, or feedback about these Terms or the platform in general, please reach out to us. The best ways to contact us include:

* **Discord:** We have an official nounspace Discord community (chat server) where the team and community members are active. Feel free to join and ask questions or raise concerns.

* **GitHub:** Since nounspace is open source, you can also open an issue on our GitHub repository if you encounter bugs or have questions about the code. (For general Terms or account issues, Discord or email might get a faster response, but we do monitor GitHub issues as well.)

* **Email/Other:** If an official support email or contact form is provided on the nounspace website, you can use that as well. (At the time of writing these Terms, the primary support channels are Discord and GitHub, as listed above.)


Nounspace is a community-driven project, and we value our users. If you have any questions, concerns, or feedback about these Terms or the platform in general, please reach out to us. The best ways to contact us include:

* **Discord:** We have an official nounspace Discord community (chat server) where the team and community members are active. Feel free to join and ask questions or raise concerns.

* **GitHub:** Since nounspace is open source, you can also open an issue on our GitHub repository if you encounter bugs or have questions about the code. (For general Terms or account issues, Discord or email might get a faster response, but we do monitor GitHub issues as well.)

* **Email/Other:** If an official support email or contact form is provided on the nounspace website, you can use that as well. (At the time of writing these Terms, the primary support channels are Discord and GitHub, as listed above.)


We are here to help and to ensure that your experience on nounspace is positive. **Using nounspace signifies that you agree to all the terms above.** If you ever have any doubts about what something means, feel free to ask us. Thank you for being a part of the nounspace community, and we hope you enjoy this new kind of decentralized social experience!
`;

export default function TermsPage() {
  return (
    <div className="max-w-screen-md mx-auto p-8">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={MarkdownRenderers()}
      >
        {TERMS_MD}
      </ReactMarkdown>
    </div>
  );
}
