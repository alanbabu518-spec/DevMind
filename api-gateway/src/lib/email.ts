import { Resend } from "resend";

function getEmailConfig(): { apiKey: string; emailFrom: string } {
  const apiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  if (!emailFrom) {
    throw new Error("EMAIL_FROM is not configured");
  }

  return { apiKey, emailFrom };
}

export async function sendMagicLinkEmail(
  email: string,
  magicLink: string,
): Promise<void> {
  const { apiKey, emailFrom } = getEmailConfig();
  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: emailFrom,
    to: email,
    subject: "Sign in to DevMind",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; line-height: 1.6;">
        <h2>Sign in to DevMind</h2>
        <p>Use the button below to securely sign in to your DevMind account.</p>
        <p>
          <a href="${magicLink}" style="display: inline-block; padding: 12px 20px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 6px;">
            Sign in to DevMind
          </a>
        </p>
        <p>This link expires in 15 minutes and can only be used once.</p>
        <p>If you didn't request this email, you can safely ignore it.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Email delivery failed: ${error.message}`);
  }
}
