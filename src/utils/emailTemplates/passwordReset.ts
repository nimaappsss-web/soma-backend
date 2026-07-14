export const passwordResetHtml = (name: string, link: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <tr>
      <td style="background: #4F46E5; padding: 40px 32px; text-align: center;">
        <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Reset Your Password</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <p style="font-size: 16px; color: #333; line-height: 1.6;">Hi ${name},</p>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">We received a request to reset your password. Click the button below to set a new one. This link expires in 1 hour.</p>
        <table cellpadding="0" cellspacing="0" style="margin: 32px auto;">
          <tr>
            <td style="background: #4F46E5; border-radius: 8px; padding: 14px 36px; text-align: center;">
              <a href="${link}" style="color: #ffffff; font-size: 16px; text-decoration: none; font-weight: bold; display: inline-block;">Reset Password</a>
            </td>
          </tr>
        </table>
        <p style="font-size: 14px; color: #888; line-height: 1.5;">Or copy this link into your browser:</p>
        <p style="font-size: 12px; color: #666; word-break: break-all; background: #f9f9f9; padding: 12px; border-radius: 6px;">${link}</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">
        <p style="font-size: 14px; color: #888; line-height: 1.5;">If you didn't request this, please ignore this email.</p>
      </td>
    </tr>
    <tr>
      <td style="background: #f9f9f9; padding: 16px 32px; text-align: center;">
        <p style="font-size: 12px; color: #aaa; margin: 0;">&copy; 2026 Nima. All rights reserved.</p>
      </td>
    </tr>
  </table>
</body>
</html>
`;
