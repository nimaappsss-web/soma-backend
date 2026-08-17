import { baseLayout } from "./baseTemplate";
import { buildInviteUrl } from "../inviteLink";

export const parentInviteHtml = (
  schoolName: string,
  parentName: string,
  studentName: string,
  token: string,
  email?: string | null,
  phone?: string | null,
) => {
  const acceptUrl = buildInviteUrl("/accept-parent-invite", token, { email, phone });

  return baseLayout(`
  <tr>
    <td align="center" style="padding: 32px 40px 0;" class="card-inner">
      <h1 style="color: #1a1a1a; font-size: 28px; font-weight: 700; margin: 0; line-height: 1.3; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-title">Welcome to ${schoolName}</h1>
    </td>
  </tr>
  <tr>
    <td style="padding: 16px 40px 0; max-width: 366px; margin: 0 auto;" class="card-inner">
      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-text">Dear ${parentName},</p>
      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 12px 0 0; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-text">Your child, <strong style="color: #1a1a1a;">${studentName}</strong>, has been registered at <strong style="color: #1a1a1a;">${schoolName}</strong>.</p>
      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 12px 0 0; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-text">Click the button below to set up your parent account and stay connected with your child's school activities, attendance, and progress.</p>
    </td>
  </tr>
  <tr>
    <td align="center" style="padding: 24px 40px 0;" class="card-inner">
      <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
        <tr>
          <td align="center" style="background-color: #1a1a1a; border-radius: 9999px; padding: 14px 36px;" class="cta-btn">
            <a href="${acceptUrl}" style="color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; display: inline-block; font-family: 'Geist', Arial, Helvetica, sans-serif;">Set Up Parent Account</a>
          </td>
        </tr>
      </table>
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
      <p style="color: #888888; font-size: 14px; line-height: 1.5; margin: 0; text-align: center; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-text">Don't want to join <strong style="color: #666666;">${schoolName}</strong>? Simply ignore this email.</p>
    </td>
  </tr>
  `);
};
