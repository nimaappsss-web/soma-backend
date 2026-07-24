import { baseLayout } from "./baseTemplate";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

export const welcomeHtml = (name: string) => baseLayout(`
  <tr>
    <td align="center" style="padding: 32px 40px 0;" class="card-inner">
      <h1 style="color: #1a1a1a; font-size: 28px; font-weight: 700; margin: 0; line-height: 1.3; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-title">Welcome to Nima!</h1>
    </td>
  </tr>
  <tr>
    <td style="padding: 16px 40px 0; max-width: 366px; margin: 0 auto;" class="card-inner">
      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-text">Hi ${name},</p>
      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 12px 0 0; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-text">Your principal account has been created successfully. You can now log in and set up your school to start managing everything.</p>
    </td>
  </tr>
  <tr>
    <td style="padding: 12px 40px 0; max-width: 366px; margin: 0 auto;" class="card-inner">
      <p style="color: #888888; font-size: 14px; line-height: 1.5; margin: 0; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-text">If you didn't create this account, please ignore this email.</p>
    </td>
  </tr>
  <tr>
    <td align="center" style="padding: 24px 40px 0;" class="card-inner">
      <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
        <tr>
          <td align="center" style="background-color: #1a1a1a; border-radius: 9999px; padding: 14px 36px;" class="cta-btn">
            <a href="${FRONTEND_URL}/login" style="color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; display: inline-block; font-family: 'Geist', Arial, Helvetica, sans-serif;">Log in to Nima</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
`);
