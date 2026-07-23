const BLACK_LOGO = "https://res.cloudinary.com/kk2ipxkr/image/upload/v1784747875/somaBlack_odq1ko.png";
const WHITE_LOGO = "https://res.cloudinary.com/kk2ipxkr/image/upload/v1784747875/somaWhite_li19zr.png";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

export const baseLayout = (mainContent: string, ignoreCard?: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/geist@1.3.0/dist/font/geist-sans/style.css" />
</head>
<body style="margin: 0; padding: 0; font-family: 'Geist', Arial, Helvetica, sans-serif; background-color: #1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a;">
    <tr>
      <td align="center" style="padding: 60px 16px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 524px; background-color: #ffffff; border-radius: 16px; overflow: hidden;">
          <tr>
            <td align="center" style="padding: 48px 40px 0;">
              <img src="${BLACK_LOGO}" alt="Nima" style="height: 28px; width: auto;" />
            </td>
          </tr>
          ${mainContent}
          <tr>
            <td style="padding: 32px 40px 0;"></td>
          </tr>
        </table>
      </td>
    </tr>
    ${ignoreCard ? `
    <tr>
      <td align="center" style="padding: 35px 16px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 524px; background-color: #ffffff; border-radius: 16px; overflow: hidden;">
          ${ignoreCard}
          <tr>
            <td style="padding: 24px 40px 0;"></td>
          </tr>
        </table>
      </td>
    </tr>
    ` : ''}
    <tr>
      <td align="center" style="padding: 35px 16px 48px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 524px;">
          <tr>
            <td align="center" style="padding: 32px 0 24px;">
              <img src="${WHITE_LOGO}" alt="Nima" style="height: 24px; width: auto;" />
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 0 24px;">
              <a href="${FRONTEND_URL}/login" style="color: #888888; font-size: 14px; text-decoration: none; margin: 0 12px;">Log in</a>
              <a href="${FRONTEND_URL}/help" style="color: #888888; font-size: 14px; text-decoration: none; margin: 0 12px;">Help Center</a>
              <a href="${FRONTEND_URL}/blog" style="color: #888888; font-size: 14px; text-decoration: none; margin: 0 12px;">Blog</a>
              <a href="${FRONTEND_URL}/community" style="color: #888888; font-size: 14px; text-decoration: none; margin: 0 12px;">Community</a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 0 32px;">
              <a href="https://facebook.com/nimaapp" style="text-decoration: none; margin: 0 8px; display: inline-block;"><img src="https://cdn.simpleicons.org/facebook/888888" alt="Facebook" style="width: 20px; height: 20px; border: 0;" /></a>
              <a href="https://instagram.com/nimaapp" style="text-decoration: none; margin: 0 8px; display: inline-block;"><img src="https://cdn.simpleicons.org/instagram/888888" alt="Instagram" style="width: 20px; height: 20px; border: 0;" /></a>
              <a href="https://snapchat.com/add/nimaapp" style="text-decoration: none; margin: 0 8px; display: inline-block;"><img src="https://cdn.simpleicons.org/snapchat/888888" alt="Snapchat" style="width: 20px; height: 20px; border: 0;" /></a>
              <a href="https://tiktok.com/@nimaapp" style="text-decoration: none; margin: 0 8px; display: inline-block;"><img src="https://cdn.simpleicons.org/tiktok/888888" alt="TikTok" style="width: 20px; height: 20px; border: 0;" /></a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 0 8px;">
              <p style="color: #555555; font-size: 12px; margin: 0; line-height: 1.5;">
                Nima School Management<br/>
                &copy; ${new Date().getFullYear()} Nima. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
