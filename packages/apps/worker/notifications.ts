// Email delivery via Resend (https://resend.com).
// Set RESEND_API_KEY in environment. From address defaults to no-reply@<PLATFORM_DOMAIN>.

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_ADDRESS   = process.env.EMAIL_FROM ?? 'no-reply@platform.com'

async function send(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.log(`[email:dev] to=${to} subject="${subject}"`)
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend error ${res.status}: ${body}`)
  }
}

export async function sendInviteEmail(opts: {
  email:       string
  inviteUrl:   string
  tenantSlug:  string
  role:        string
}): Promise<void> {
  await send(
    opts.email,
    `You're invited to join ${opts.tenantSlug}`,
    `<p>You've been invited to join <strong>${opts.tenantSlug}</strong> as <strong>${opts.role}</strong>.</p>
     <p><a href="${opts.inviteUrl}">Accept invitation</a></p>
     <p>This link expires in 7 days.</p>`,
  )
}
