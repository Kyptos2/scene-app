import "server-only";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "SCENE <onboarding@resend.dev>";

// No email provider is configured for local dev — RESEND_API_KEY switches
// this from a console log to an actual send with no other code changes.
// (Resend's HTTP API is a single POST, so no SDK dependency is needed.)
export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(`\n--- EMAIL (dev — no RESEND_API_KEY set, not actually sent) ---\nTo: ${to}\nSubject: ${subject}\n\n${text}\n---\n`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html, text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to send email: ${res.status} ${body}`);
  }
}
