import { LegalPage } from "@/components/marketing/LegalPage";

// Same content as mobile/app/terms.tsx — kept in sync manually since the two
// codebases don't share a content package.
const SECTIONS = [
  {
    heading: "1. Agreement",
    body: "These Terms of Service govern your use of SCENE, a networking and collaboration app for filmmakers and production professionals. By creating an account you agree to these terms. If you don't agree, don't use SCENE.",
  },
  {
    heading: "2. Who can use SCENE",
    body: "You must be at least 16 years old and able to form a binding contract to create an account. You're responsible for the accuracy of the information on your profile, including your project credits and role claims.",
  },
  {
    heading: "3. Your account",
    body: "You're responsible for keeping your password secure and for all activity under your account. Tell us right away if you suspect unauthorized access. One person, one account — don't create accounts on behalf of others without permission.",
  },
  {
    heading: "4. Content you post",
    body: "You keep ownership of what you post — project details, crew call listings, reviews, feed updates, messages, and photos. By posting, you grant SCENE a license to host, display, and distribute that content within the app so other users can see it. You're responsible for having the rights to anything you post, including project stills, posters, and footage links.",
  },
  {
    heading: "5. Conduct",
    body: "Don't use SCENE to harass, impersonate, defraud, or misrepresent your professional credits. Don't post spam, malware, or content that infringes someone else's rights. Crew calls and applications must be genuine — don't post fake listings or apply in bad faith. Violating these rules can result in content removal, suspension, or account termination.",
  },
  {
    heading: "6. Reporting and moderation",
    body: "SCENE lets users report profiles, projects, reviews, and posts, and lets you block another user directly. We review reports and may remove content or restrict accounts that violate these terms, at our discretion.",
  },
  {
    heading: "7. Location and proximity features",
    body: "Some features — nearby crew calls, festival collaborations, proximity handshakes — use your device's location. You can decline location access; those features just won't work without it. We don't share your precise location with other users beyond what a feature explicitly displays (e.g. distance in km).",
  },
  {
    heading: "8. Termination",
    body: "You can delete content you've posted (projects, reviews, feed posts) at any time from within the app. You may stop using SCENE at any time. We may suspend or terminate accounts that violate these terms.",
  },
  {
    heading: "9. Disclaimers",
    body: "SCENE is provided \"as is.\" We don't verify every credit or claim a user makes, and we don't guarantee any crew call, connection, or collaboration will lead to paid work or a finished project. Use your own judgment before entering agreements with people you meet through the app.",
  },
  {
    heading: "10. Changes",
    body: "We may update these terms as the app evolves. Continued use of SCENE after a change means you accept the updated terms.",
  },
  {
    heading: "11. Contact",
    body: "Questions about these terms can be sent through the app's support contact once available.",
  },
];

export default function TermsPage() {
  return <LegalPage title="Terms of Service" sections={SECTIONS} />;
}
