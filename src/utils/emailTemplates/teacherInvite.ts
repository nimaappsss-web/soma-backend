import { baseLayout } from "./baseTemplate";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

export const teacherInviteHtml = (schoolName: string, token: string) => {
  const acceptUrl = `${FRONTEND_URL}/accept-invite?token=${token}`;

  return baseLayout(`
  <tr>
    <td align="center" style="padding: 32px 40px 0;">
      <h1 style="color: #1a1a1a; font-size: 28px; font-weight: 700; margin: 0; line-height: 1.3; font-family: 'Geist', Arial, Helvetica, sans-serif;">You're Invited!</h1>
    </td>
  </tr>
  <tr>
    <td style="padding: 16px 40px 0; max-width: 366px; margin: 0 auto;">
      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0; font-family: 'Geist', Arial, Helvetica, sans-serif;">Hi there,</p>
      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 12px 0 0; font-family: 'Geist', Arial, Helvetica, sans-serif;">You have been invited to join <strong style="color: #1a1a1a;">${schoolName}</strong> on Nima.</p>
      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 12px 0 0; font-family: 'Geist', Arial, Helvetica, sans-serif;">Click the button below to set up your account and get started.</p>
    </td>
  </tr>
  <tr>
    <td align="center" style="padding: 24px 40px 0;">
      <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
        <tr>
          <td align="center" style="background-color: #1a1a1a; border-radius: 9999px; padding: 14px 36px;">
            <a href="${acceptUrl}" style="color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; display: inline-block; font-family: 'Geist', Arial, Helvetica, sans-serif;">Accept Invitation</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding: 12px 40px 0; max-width: 366px; margin: 0 auto;">
      <p style="color: #888888; font-size: 14px; line-height: 1.5; margin: 0; font-family: 'Geist', Arial, Helvetica, sans-serif;">This invitation expires in 48 hours.</p>
    </td>
  </tr>
  `,
  `
  <tr>
    <td style="padding: 24px 40px 0; max-width: 366px; margin: 0 auto;">
      <p style="color: #888888; font-size: 14px; line-height: 1.5; margin: 0; text-align: center; font-family: 'Geist', Arial, Helvetica, sans-serif;">Don't want to join <strong style="color: #666666;">${schoolName}</strong>? Simply ignore this email or contact the school administrator.</p>
    </td>
  </tr>
  `);
};
