const BLACK_LOGO = "https://res.cloudinary.com/kk2ipxkr/image/upload/v1784747875/somaBlack_odq1ko.png";
const WHITE_LOGO = "https://res.cloudinary.com/kk2ipxkr/image/upload/v1784747875/somaWhite_li19zr.png";

const FB_ICON = "https://res.cloudinary.com/kk2ipxkr/image/upload/v1788302865/soma/icons/fb-g.png";
const IG_ICON = "https://res.cloudinary.com/kk2ipxkr/image/upload/v1788302866/soma/icons/ig-g.png";
const SC_ICON = "https://res.cloudinary.com/kk2ipxkr/image/upload/v1788302866/soma/icons/sc-g.png";
const TK_ICON = "https://res.cloudinary.com/kk2ipxkr/image/upload/v1788302867/soma/icons/tk-g.png";

export const baseLayout = (mainContent: string, ignoreCard?: string, frontendUrl?: string) => {
  const base = (frontendUrl || process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/geist@1.3.0/dist/font/geist-sans/style.css" />
  <style>
    @media only screen and (max-width: 480px) {
      .email-container { width: 100% !important; padding: 16px !important; }
      .card { border-radius: 12px !important; }
      .card-inner { padding: 24px 20px !important; }
      .card-title { font-size: 22px !important; }
      .card-text { font-size: 14px !important; }
      .ignore-inner { padding: 20px !important; }
      .footer-links a { display: block !important; margin: 6px 0 !important; }
      .otp-code { font-size: 28px !important; letter-spacing: 8px !important; padding: 18px !important; }
      .cta-btn { padding: 12px 28px !important; font-size: 14px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Geist', Arial, Helvetica, sans-serif; background-color: #1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a;">
    <tr>
      <td align="center" style="padding: 60px 16px 0;" class="email-container">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 524px; background-color: #ffffff; border-radius: 16px; overflow: hidden;" class="card">
          <tr>
            <td align="center" style="padding: 48px 40px 0;" class="card-inner">
              <img src="${BLACK_LOGO}" alt="Nima" style="height: 28px; width: auto;" />
            </td>
          </tr>
          ${mainContent}
          <tr>
            <td style="padding: 32px 40px 0;" class="card-inner"></td>
          </tr>
        </table>
      </td>
    </tr>
    ${ignoreCard ? `
    <tr>
      <td align="center" style="padding: 35px 16px 0;" class="email-container">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 524px; background-color: #ffffff; border-radius: 16px; overflow: hidden;" class="card">
          ${ignoreCard}
          <tr>
            <td style="padding: 24px 40px 0;" class="ignore-inner"></td>
          </tr>
        </table>
      </td>
    </tr>
    ` : ''}
    <tr>
      <td align="center" style="padding: 35px 16px 48px;" class="email-container">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 524px;">
          <tr>
            <td align="center" style="padding: 32px 0 24px;">
              <img src="${WHITE_LOGO}" alt="Nima" style="height: 24px; width: auto;" />
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 0 24px;" class="footer-links">
              <a href="${base}/login" style="color: #888888; font-size: 14px; text-decoration: none; margin: 0 12px;">Log in</a>
              <a href="${base}/help" style="color: #888888; font-size: 14px; text-decoration: none; margin: 0 12px;">Help Center</a>
              <a href="${base}/blog" style="color: #888888; font-size: 14px; text-decoration: none; margin: 0 12px;">Blog</a>
              <a href="${base}/community" style="color: #888888; font-size: 14px; text-decoration: none; margin: 0 12px;">Community</a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 0 32px;">
        <a href="https://facebook.com/nimaapp" style="text-decoration: none; margin: 0 8px; display: inline-block;"><img src="${FB_ICON}" alt="Facebook" width="20" height="20" style="width: 20px; height: 20px; border: 0;" /></a>
        <a href="https://instagram.com/nimaapp" style="text-decoration: none; margin: 0 8px; display: inline-block;"><img src="${IG_ICON}" alt="Instagram" width="20" height="20" style="width: 20px; height: 20px; border: 0;" /></a>
        <a href="https://snapchat.com/add/nimaapp" style="text-decoration: none; margin: 0 8px; display: inline-block;"><img src="${SC_ICON}" alt="Snapchat" width="20" height="20" style="width: 20px; height: 20px; border: 0;" /></a>
        <a href="https://tiktok.com/@nimaapp" style="text-decoration: none; margin: 0 8px; display: inline-block;"><img src="${TK_ICON}" alt="TikTok" width="20" height="20" style="width: 20px; height: 20px; border: 0;" /></a>
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
};
