import { baseLayout } from "./baseTemplate";

export const emailOtpHtml = (name: string, otp: string) => baseLayout(`
  <tr>
    <td align="center" style="padding: 32px 40px 0;" class="card-inner">
      <h1 style="color: #1a1a1a; font-size: 28px; font-weight: 700; margin: 0; line-height: 1.3; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-title">Verify Your Email</h1>
    </td>
  </tr>
  <tr>
    <td style="padding: 16px 40px 0; max-width: 366px; margin: 0 auto;" class="card-inner">
      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-text">Hi ${name},</p>
      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 12px 0 0; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-text">Use the verification code below to complete your registration.</p>
    </td>
  </tr>
  <tr>
    <td align="center" style="padding: 24px 40px 0;" class="card-inner">
      <table cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; border-radius: 12px; width: 100%; max-width: 366px; margin: 0 auto;">
        <tr>
          <td align="center" style="padding: 24px;" class="otp-code">
            <span style="color: #1a1a1a; font-size: 36px; font-weight: 700; letter-spacing: 12px; font-family: 'Geist', Arial, Helvetica, sans-serif;">${otp}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding: 12px 40px 0; max-width: 366px; margin: 0 auto;" class="card-inner">
      <p style="color: #888888; font-size: 14px; line-height: 1.5; margin: 0; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-text">This code expires in 10 minutes.</p>
    </td>
  </tr>
  <tr>
    <td style="padding: 12px 40px 0; max-width: 366px; margin: 0 auto;" class="card-inner">
      <p style="color: #888888; font-size: 14px; line-height: 1.5; margin: 0; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-text">If you didn't create this account, please ignore this email.</p>
    </td>
  </tr>
`);
