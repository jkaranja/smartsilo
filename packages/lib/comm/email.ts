import { getMailConfig, isMailEnabled } from "./init";

const DEFAULT_FROM = "no-reply@platform.com";

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!isMailEnabled()) {
    console.log(`[email:dev] to=${to} subject="${subject}"`);
    return;
  }

  const { resendApiKey, fromAddress } = getMailConfig();

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: fromAddress ?? DEFAULT_FROM, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
}

export async function sendInviteEmail(opts: {
  email: string;
  inviteUrl: string;
  tenantSlug: string;
  role: string;
}): Promise<void> {
  await sendEmail(
    opts.email,
    `You're invited to join ${opts.tenantSlug}`,
    `<p>You've been invited to join <strong>${opts.tenantSlug}</strong> as <strong>${opts.role}</strong>.</p>
     <p><a href="${opts.inviteUrl}">Accept invitation</a></p>
     <p>This link expires in 7 days.</p>`,
  );
}
