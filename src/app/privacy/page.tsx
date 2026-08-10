import { LegalPage } from "@/components/marketing/LegalPage";

// Same content as mobile/app/privacy.tsx — kept in sync manually since the
// two codebases don't share a content package.
const SECTIONS = [
  {
    heading: "1. What we collect",
    body: "Account info you give us directly: name, email, password (stored as a hash, never in plain text), profile photo, bio, roles, experience level, and portfolio links. Content you create: projects, credits, crew calls, reviews, feed posts, messages, and comments. Location, if you allow it, to power nearby crew calls, festivals, and proximity features. Device push tokens, if you allow notifications, so we can deliver them.",
  },
  {
    heading: "2. How we use it",
    body: "To run the core features of SCENE — your feed, search, crew-call matching, messaging, festival discovery, and the Indie Catalog. To send you push notifications and emails for things you've opted into or that are essential to your account, like password resets and email verification. To detect abuse and enforce our Terms of Service.",
  },
  {
    heading: "3. What other users can see",
    body: "Your public profile (name, username, tagline, bio, roles, verified credits, portfolio) is visible to other users. Your exact location is never shown to other users — only an approximate distance in kilometers is shown when relevant to a feature. Your email address is never shown to other users. Direct messages and workspace channel messages are visible only to the people in that conversation or workspace.",
  },
  {
    heading: "4. Blocking and reporting",
    body: "If you block someone, you're removed from each other's search results and feed — this works in both directions. Reports you file are visible only to moderators.",
  },
  {
    heading: "5. Data sharing",
    body: "We don't sell your data. We share data with service providers only as needed to run the app — for example, an email provider to deliver password-reset and verification emails, and Expo's push notification service to deliver push notifications. We may disclose information if required by law.",
  },
  {
    heading: "6. Data retention and deletion",
    body: "You can delete your own projects, reviews, and feed posts at any time from within the app, which removes them immediately. If you'd like your account and associated data fully deleted, contact support once available.",
  },
  {
    heading: "7. Security",
    body: "Passwords are hashed, never stored in plain text. Password-reset and email-verification links use single-use tokens that expire and are invalidated once used.",
  },
  {
    heading: "8. Children",
    body: "SCENE isn't directed at children under 16, and we don't knowingly collect data from them.",
  },
  {
    heading: "9. Changes to this policy",
    body: "We may update this policy as the app evolves. Continued use of SCENE after a change means you accept the updated policy.",
  },
  {
    heading: "10. Contact",
    body: "Questions about this policy can be sent through the app's support contact once available.",
  },
];

export default function PrivacyPage() {
  return <LegalPage title="Privacy Policy" sections={SECTIONS} />;
}
