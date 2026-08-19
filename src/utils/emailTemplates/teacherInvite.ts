import { baseLayout } from "./baseTemplate";
import { buildInviteUrl } from "../inviteLink";

export const teacherInviteHtml = (
  schoolName: string,
  token: string,
  email?: string | null,
  phone?: string | null,
  frontendUrl?: string,
) => {
  const acceptUrl = buildInviteUrl("/accept-invite", token, { email, phone }, frontendUrl);

  return baseLayout(`
  <tr>
    <td align="center" style="padding: 32px 40px 0;" class="card-inner">
      <h1 style="color: #1a1a1a; font-size: 28px; font-weight: 700; margin: 0; line-height: 1.3; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-title">You're Invited!</h1>
    </td>
  </tr>
  <tr>
    <td style="padding: 16px 40px 0; max-width: 366px; margin: 0 auto;" class="card-inner">
      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-text">Hi there,</p>
      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 12px 0 0; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-text">You have been invited to join <strong style="color: #1a1a1a;">${schoolName}</strong> on Nima.</p>
      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 12px 0 0; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-text">Click the button below to set up your account and get started.</p>
    </td>
  </tr>
  <tr>
    <td align="center" style="padding: 24px 40px 0;" class="card-inner">
      <a href="${acceptUrl}" class="cta-btn" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 36px; border-radius: 9999px; font-family: 'Geist', Arial, Helvetica, sans-serif;">Accept Invitation</a>
    </td>
  </tr>
  <tr>
    <td style="padding: 12px 40px 0; max-width: 366px; margin: 0 auto;" class="card-inner">
      <p style="color: #888888; font-size: 14px; line-height: 1.5; margin: 0; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-text">This invitation expires in 48 hours.</p>
    </td>
  </tr>
  `,
  `
  <tr>
    <td style="padding: 24px 40px 0; max-width: 366px; margin: 0 auto;" class="ignore-inner">
      <p style="color: #888888; font-size: 14px; line-height: 1.5; margin: 0; text-align: center; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-text">Don't want to join <strong style="color: #666666;">${schoolName}</strong>? Simply ignore this email or contact the school administrator.</p>
    </td>
  </tr>
  `, frontendUrl);
};
