// src/server/mailer.ts
//
// Thin wrapper around Resend (free tier: 3,000 emails/month, 100/day — no card
// required). Requires RESEND_API_KEY and EMAIL_FROM in env — see env.ts additions
// in handoff.md. EMAIL_FROM must be an address on a domain you've verified in the
// Resend dashboard; until a domain is verified, Resend only allows sending to the
// account owner's own email, which is fine for local testing but will silently
// fail for real users in production.
import { Resend } from "resend";
import { env } from "./env";

const resend = new Resend(env.RESEND_API_KEY);

function wrapEmail(title: string, bodyHtml: string): string {
  // Deliberately minimal inline-styled HTML — no external stylesheet, no images,
  // nothing that trips spam filters on a brand-new sending domain.
  return `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
      <h2 style="margin: 0 0 16px;">${title}</h2>
      ${bodyHtml}
      <p style="margin-top: 32px; font-size: 12px; color: #888;">SafarAI — if you didn't request this, you can safely ignore this email.</p>
    </div>
  `;
}

export async function sendVerificationEmail(to: string, name: string, verifyUrl: string): Promise<void> {
  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject: "Verify your SafarAI email",
    html: wrapEmail(
      `Hi ${name}, verify your email`,
      `<p>Confirm this address to finish setting up your account.</p>
       <p><a href="${verifyUrl}" style="display: inline-block; background: #111; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none;">Verify email</a></p>
       <p style="font-size: 13px; color: #666;">This link expires in 24 hours. If the button doesn't work, copy this URL: <br />${verifyUrl}</p>`,
    ),
  });

  if (error) {
    console.error("[mailer] sendVerificationEmail failed:", error);
    throw new Error("Failed to send verification email");
  }
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string): Promise<void> {
  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject: "Reset your SafarAI password",
    html: wrapEmail(
      `Hi ${name}, reset your password`,
      `<p>We received a request to reset your password. This link is valid for 1 hour.</p>
       <p><a href="${resetUrl}" style="display: inline-block; background: #111; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none;">Reset password</a></p>
       <p style="font-size: 13px; color: #666;">If you didn't request this, your password is still safe — no action needed. If the button doesn't work, copy this URL: <br />${resetUrl}</p>`,
    ),
  });

  if (error) {
    console.error("[mailer] sendPasswordResetEmail failed:", error);
    throw new Error("Failed to send password reset email");
  }
}