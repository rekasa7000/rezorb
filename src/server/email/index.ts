import "server-only";
import { Resend } from "resend";
import { env, isProd } from "../env";
import { log } from "../log";

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

let client: Resend | null = null;

/** Last mail sent in dev/test without Resend, for local debugging. */
export const devOutbox: Mail[] = [];

export async function sendMail(mail: Mail) {
  const key = env.resendKey;
  if (!key) {
    if (isProd()) {
      throw new Error("RESEND_API_KEY is required in production to send email.");
    }
    devOutbox.push(mail);
    // Dev only: print so you can click the link. Never reached in production.
    console.log(`\n[dev email] to=${mail.to} subject="${mail.subject}"\n${mail.text}\n`);
    return;
  }
  client ??= new Resend(key);
  const { error } = await client.emails.send({
    from: env.emailFrom,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
  if (error) {
    log.error({ name: error.name }, "email send failed");
    throw new Error("Could not send email.");
  }
}

const shell = (title: string, body: string, cta: { label: string; url: string }) => `
<div style="background:#07040F;padding:32px;font-family:Arial,sans-serif;color:#F5F1FF">
  <div style="max-width:480px;margin:auto;background:#0F0A24;border:1px solid #251A4D;border-radius:20px;padding:28px">
    <div style="font-weight:900;letter-spacing:-0.04em;font-size:22px">REZORB</div>
    <h1 style="font-size:20px;margin:20px 0 8px">${title}</h1>
    <p style="color:#B9B0D9;line-height:1.5">${body}</p>
    <p><a href="${cta.url}" style="display:inline-block;background:#FF3DB8;color:#07040F;font-weight:700;padding:12px 20px;border-radius:12px;text-decoration:none">${cta.label}</a></p>
    <p style="color:#7C72A3;font-size:12px">If you didn't ask for this, ignore this email.</p>
  </div>
</div>`;

export const mails = {
  verify: (to: string, url: string): Mail => ({
    to,
    subject: "Confirm your email for Rezorb",
    text: `Confirm your email to start using Rezorb: ${url}`,
    html: shell("Confirm your email", "One tap and your Spaces are ready.", {
      label: "Confirm email",
      url,
    }),
  }),
  magic: (to: string, url: string): Mail => ({
    to,
    subject: "Your Rezorb sign-in link",
    text: `Sign in to Rezorb: ${url}\nThis link works once and expires in 5 minutes.`,
    html: shell("Sign in to Rezorb", "This link works once and expires in 5 minutes.", {
      label: "Sign in",
      url,
    }),
  }),
  reset: (to: string, url: string): Mail => ({
    to,
    subject: "Reset your Rezorb password",
    text: `Reset your password: ${url}`,
    html: shell("Reset your password", "This link expires in 1 hour.", {
      label: "Reset password",
      url,
    }),
  }),
  sealed: (to: string, spaceName: string, until: Date): Mail => ({
    to,
    subject: "A Space was sealed after wrong PIN attempts",
    text: `Too many wrong PINs were entered for "${spaceName}". It is sealed until ${until.toUTCString()}. If this wasn't you, change your password and revoke unknown devices in Settings.`,
  }),
};
