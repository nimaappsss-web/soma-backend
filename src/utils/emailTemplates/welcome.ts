export const welcomeHtml = (name: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <tr>
      <td style="background: #4F46E5; padding: 40px 32px; text-align: center;">
        <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Welcome to Nima!</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <p style="font-size: 16px; color: #333; line-height: 1.6;">Hi ${name},</p>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">Your principal account has been created successfully. Please verify your phone number with the OTP sent to complete your registration.</p>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">After verification, you'll be able to register your school and start managing everything.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">
        <p style="font-size: 14px; color: #888; line-height: 1.5;">If you didn't create this account, please ignore this email.</p>
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
