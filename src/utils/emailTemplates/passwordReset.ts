import { baseLayout } from "./baseTemplate";

export const passwordResetHtml = (name: string, resetUrl: string, frontendUrl?: string) => baseLayout(`
  <tr>
    <td align="center" style="padding: 32px 40px 0;" class="card-inner">
      <h1 style="color: #1a1a1a; font-size: 28px; font-weight: 700; margin: 0; line-height: 1.3; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-title">Reset Your Password</h1>
    </td>
  </tr>
  <tr>
    <td style="padding: 16px 40px 0; max-width: 366px; margin: 0 auto;" class="card-inner">
      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-text">Hi ${name},</p>
      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 12px 0 0; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-text">We received a request to reset your password. Tap the button below to choose a new one.</p>
    </td>
  </tr>
  <tr>
    <td align="center" style="padding: 28px 40px 0;" class="card-inner">
      <a href="${resetUrl}" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 36px; border-radius: 9999px; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="cta-btn">Reset Password</a>
    </td>
  </tr>
  <tr>
    <td style="padding: 12px 40px 0; max-width: 366px; margin: 0 auto;" class="card-inner">
      <p style="color: #888888; font-size: 14px; line-height: 1.5; margin: 0; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-text">This link expires in 1 hour.</p>
    </td>
  </tr>
  <tr>
    <td style="padding: 12px 40px 0; max-width: 366px; margin: 0 auto;" class="card-inner">
      <p style="color: #888888; font-size: 13px; line-height: 1.5; margin: 0; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-text">If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="color: #666666; font-size: 12px; line-height: 1.5; margin: 8px 0 0; word-break: break-all; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-text">${resetUrl}</p>
    </td>
  </tr>
  `,
  `
  <tr>
    <td style="padding: 24px 40px 0; max-width: 366px; margin: 0 auto;" class="ignore-inner">
      <p style="color: #888888; font-size: 14px; line-height: 1.5; margin: 0; text-align: center; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-text">Don't want to reset your password? Simply ignore this email.</p>
    </td>
  </tr>
  `, frontendUrl);