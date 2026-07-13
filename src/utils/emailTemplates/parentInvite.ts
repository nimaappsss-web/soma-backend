export const parentInviteHtml = (schoolName: string, parentName: string, studentName: string, link: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <tr>
      <td style="background: #059669; padding: 40px 32px; text-align: center;">
        <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Welcome to ${schoolName}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <p style="font-size: 16px; color: #333; line-height: 1.6;">Dear ${parentName},</p>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          Your child, <strong>${studentName}</strong>, has been registered at <strong>${schoolName}</strong>.
        </p>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          Click the button below to set up your parent account and stay connected with your child's school activities, attendance, and progress.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${link}" style="background: #059669; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">Set Up Parent Account</a>
        </div>
        <p style="font-size: 14px; color: #888; line-height: 1.5;">This link expires in 48 hours.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">
        <p style="font-size: 14px; color: #888; line-height: 1.5;">If you weren't expecting this, please ignore this email.</p>
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
