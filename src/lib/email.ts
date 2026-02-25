import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const FROM_EMAIL = process.env.EMAIL_FROM || 'onboarding@resend.dev';

export async function sendVerificationEmail(email: string, token: string, name?: string) {
  const verifyUrl = `${APP_URL}/api/auth/verify-email?token=${token}`;

  console.log(`[EMAIL] Verification link for ${email}: ${verifyUrl}`);

  if (!resend) {
    console.warn('[EMAIL] No RESEND_API_KEY configured. Verification link printed above — use it to verify manually.');
    return;
  }

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Verify your email — AutoRank.ai',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9fafb; padding: 40px 0;">
  <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 32px;">
      <span style="font-size: 24px; font-weight: 700; color: #4f46e5;">⚡ AutoRank.ai</span>
    </div>
    <h2 style="margin: 0 0 8px; font-size: 20px; color: #111;">Verify your email</h2>
    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
      Hi${name ? ` ${name}` : ''},<br>
      Click the button below to verify your email and activate your account.
    </p>
    <a href="${verifyUrl}" style="display: inline-block; background: #4f46e5; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
      Verify Email
    </a>
    <p style="color: #9ca3af; font-size: 13px; margin-top: 32px;">
      If you didn't create an account, you can safely ignore this email.
    </p>
  </div>
</body>
</html>
        `.trim(),
  });

  if (error) {
    console.error('[EMAIL] Resend API Error:', error);
  } else {
    console.log(`[EMAIL] Successfully sent to ${email}. ID: ${data?.id}`);
  }
}
