const BLACK_LOGO = "https://res.cloudinary.com/kk2ipxkr/image/upload/v1784747875/somaBlack_odq1ko.png";
const WHITE_LOGO = "https://res.cloudinary.com/kk2ipxkr/image/upload/v1784747875/somaWhite_li19zr.png";

const FB = "data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjODg4ODg4IiByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNOS4xMDEgMjMuNjkxdi03Ljk4SDYuNjI3di0zLjY2N2gyLjQ3NHYtMS41OGMwLTQuMDg1IDEuODQ4LTUuOTc4IDUuODU4LTUuOTc4LjQwMSAwIC45NTUuMDQyIDEuNDY4LjEwM2E4LjY4IDguNjggMCAwIDEgMS4xNDEuMTk1djMuMzI1YTguNjIzIDguNjIzIDAgMDAtLjY1My0uMDM2IDI2LjgwNSAyNi44MDUgMCAwIDAtLjczMy0uMDA5Yy0uNzA3IDAtMS4yNTkuMDk2LTEuNjc1LjMwOWExLjY4NiAxLjY4NiAwIDAgMC0uNjc5LjYyMmMtLjI1OC40Mi0uMzc0Ljk5NS0uMzc0IDEuNzUydjEuMjk3aDMuOTE5bC0uMzg2IDIuMTAzLS4yODcgMS41NjRoLTMuMjQ2djguMjQ1QzE5LjM5NiAyMy4yMzggMjQgMTguMTc5IDI0IDEyLjA0NGMwLTYuNjI3LTUuMzczLTEyLTEyLTEycy0xMiA1LjM3My0xMiAxMmMwIDUuNjI4IDMuODc0IDEwLjM1IDkuMTAxIDExLjY0N1oiLz48L3N2Zz4=";
const IG = "data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjODg4ODg4IiByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNy4wMzAxLjA4NGMtMS4yNzY4LjA2MDItMi4xNDg3LjI2NC0yLjkxMS41NjM0LS43ODg4LjMwNzUtMS40NTc1LjcyLTIuMTIyOCAxLjM4NzctLjY2NTIuNjY3Ny0xLjA3NSAxLjMzNjgtMS4zODAyIDIuMTI3LS4yOTU0Ljc2MzgtLjQ5NTYgMS42MzY1LS41NTIgMi45MTQtLjA1NjQgMS4yNzc1LS4wNjg5IDEuNjg4Mi0uMDYyNiA0Ljk0Ny4wMDYyIDMuMjU4Ni4wMjA2IDMuNjY3MS4wODI1IDQuOTQ3My4wNjEgMS4yNzY1LjI2NCAyLjE0ODIuNTYzNSAyLjkxMDcuMzA4Ljc4ODkuNzIgMS40NTczIDEuMzg4IDIuMTIyOC42Njc5LjY2NTUgMS4zMzY1IDEuMDc0MyAyLjEyODUgMS4zOC43NjMyLjI5NSAxLjYzNjEuNDk2MSAyLjkxMzQuNTUyIDEuMjc3My4wNTYgMS42ODg0LjA2OSA0Ljk0NjIuMDYyNyAzLjI1NzgtLjAwNjIgMy42NjgtLjAyMDcgNC45NDc4LS4wODE0IDEuMjgtLjA2MDcgMi4xNDctLjI2NTIgMi45MDk4LS41NjMzLjc4ODktLjMwODYgMS40NTc4LS43MiAyLjEyMjgtMS4zODgxLjY2NS0uNjY4MiAxLjA3NDUtMS4zMzc4IDEuMzc5NS0yLjEyODQuMjk1Ny0uNzYzMi40OTY2LTEuNjM2LjU1Mi0yLjkxMjQuMDU2LTEuMjgwOS4wNjkyLTEuNjg5OC4wNjMtNC45NDgtLjAwNjMtMy4yNTgzLS4wMjEtMy42NjY4LS4wODE3LTQuOTQ2NS0uMDYwNy0xLjI3OTctLjI2NC0yLjE0ODctLjU2MzMtMi45MTE3LS4zMDg0LS43ODg5LS43Mi0xLjQ1NjgtMS4zODc2LTIuMTIyOEMyMS4yOTgyIDEuMzMgMjAuNjI4LjkyMDggMTkuODM3OC42MTY1IDE5LjA3NC4zMjEgMTguMjAxNy4xMTk3IDE2LjkyNDQuMDY0NSAxNS42NDcxLjAwOTMgMTUuMjM2LS4wMDUgMTEuOTc3LjAwMTQgOC43MTguMDA3NiA4LjMxLjAyMTUgNy4wMzAxLjA4MzltLjE0MDIgMjEuNjkzMmMtMS4xNy0uMDUwOS0xLjgwNTMtLjI0NTMtMi4yMjg3LS40MDgtLjU2MDYtLjIxNi0uOTYtLjQ3NzEtMS4zODE5LS44OTUtLjQyMi0uNDE3OC0uNjgxMS0uODE4Ni0uOS0xLjM3OC0uMTY0NC0uNDIzNC0uMzYyNC0xLjA1OC0uNDE3MS0yLjIyOC0uMDU5NS0xLjI2NDUtLjA3Mi0xLjY0NDItLjA3OS00Ljg0OC0uMDA3LTMuMjAzNy4wMDUzLTMuNTgzLjA2MDctNC44NDguMDUtMS4xNjkuMjQ1Ni0xLjgwNS40MDgtMi4yMjgyLjIxNi0uNTYxMy40NzYyLS45Ni44OTUtMS4zODE2LjQxODgtLjQyMTcuODE4NC0uNjgxNCAxLjM3ODMtLjkwMDMuNDIzLS4xNjUxIDEuMDU3NS0uMzYxNCAyLjIyNy0uNDE3MSAxLjI2NTUtLjA2IDEuNjQ0Ny0uMDcyIDQuODQ4LS4wNzkgMy4yMDMzLS4wMDcgMy41ODM1LjAwNSA0Ljg0OTUuMDYwOCAxLjE2OS4wNTA4IDEuODA1My4yNDQ1IDIuMjI4LjQwOC41NjA4LjIxNi45Ni40NzU0IDEuMzgxNi44OTUuNDIxNy40MTk0LjY4MTYuODE3Ni45MDA1IDEuMzc4Ny4xNjUzLjQyMTcuMzYxNyAxLjA1Ni40MTY5IDIuMjI2My4wNjAyIDEuMjY1NS4wNzM5IDEuNjQ1LjA3OTYgNC44NDguMDA1OCAzLjIwMy0uMDA1NSAzLjU4MzQtLjA2MSA0Ljg0OC0uMDUxIDEuMTctLjI0NSAxLjgwNTUtLjQwOCAyLjIyOTQtLjIxNi41NjA0LS40NzYzLjk2LS44OTU0IDEuMzgxNC0uNDE5LjQyMTUtLjgxODEuNjgxMS0xLjM4MDMuOS0uNDIyNC4xNjQ5LTEuMDU3Ny4zNjE3LTIuMjI2Mi40MTc0LTEuMjY1Ni4wNTk1LTEuNjQ0OC4wNzItNC44NDkzLjA3OS0zLjIwNDUuMDA3LTMuNTgyNS0uMDA2LTQuODQ4LS4wNjA4TTE2Ljk1MyA1LjU4NjRBMS40NCAxLjQ0IDAgMSAwIDE4LjM5IDQuMTQ0YTEuNDQgMS40NCAwIDAgMC0xLjQzNyAxLjQ0MjRNNS44Mzg1IDEyLjAxMmMuMDA2NyAzLjQwMzIgMi43NzA2IDYuMTU1NyA2LjE3MyA2LjE0OTMgMy40MDI2LS4wMDY1IDYuMTU3LTIuNzcwMSA2LjE1MDYtNi4xNzMzLS4wMDY1LTMuNDAzMi0yLjc3MS02LjE1NjUtNi4xNzQtNi4xNDk4LTMuNDAzLjAwNjctNi4xNTYgMi43NzEtNi4xNDk2IDYuMTczOE04IDEyLjAwNzdhNCA0IDAgMSAxIDQuMDA4IDMuOTkyMUEzLjk5OTYgMy45OTk2IDAgMCAxIDggMTIuMDA3NyIvPjwvc3ZnPg==";
const SC = "data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjODg4ODg4IiByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIuMjA2Ljc5M2MuOTkgMCA0LjM0Ny4yNzYgNS45MyAzLjgyMS41MjkgMS4xOTMuNDAzIDMuMjE5LjI5OSA0Ljg0N2wtLjAwMy4wNmMtLjAxMi4xOC0uMDIyLjM0NS0uMDMuNTEuMDc1LjA0NS4yMDMuMDkuNDAxLjA5LjMtLjAxNi42NTktLjEyIDEuMDMzLS4zMDEuMTY1LS4wODguMzQ0LS4xMDQuNDY0LS4xMDQuMTgyIDAgLjM1OS4wMjkuNTA5LjA5LjQ1LjE0OS43MzQuNDc5LjczNC44MzguMDE1LjQ0OS0uMzkuODM5LTEuMjEzIDEuMTY4LS4wODkuMDI5LS4yMDkuMDc1LS4zNDQuMTE5LS40NS4xMzUtMS4xMzkuMzYtMS4zMzMuODEtLjA5LjIyNC0uMDYxLjUyNC4xMi44NjhsLjAxNS4wMTVjLjA2LjEzNiAxLjUyNiAzLjQ3NSA0Ljc5MSA0LjAxNC4yNTUuMDQ0LjQzNS4yNy40Mi41MDkgMCAuMDc1LS4wMTUuMTQ5LS4wNDUuMjI1LS4yNC41NjktMS4yNzMuOTg4LTMuMTQ2IDEuMjcxLS4wNTkuMDkxLS4xMi4zNzUtLjE2NC41Ny0uMDI5LjE3OS0uMDc0LjM2LS4xMzQuNTUzLS4wNzYuMjcxLS4yNy40MDUtLjU1NS40MDVoLS4wM2MtLjEzNSAwLS4zMTMtLjAzMS0uNTM4LS4wNzQtLjM2LS4wNzUtLjc2NS0uMTM1LTEuMjczLS4xMzUtLjMwMSAwLS41OTkuMDE1LS45MTMuMDc0LS42LjEwNC0xLjEyMy40NjQtMS43MjMuODg0LS44NTMuNTk5LTEuODI2IDEuMjg4LTMuMjk0IDEuMjg4LS4wNiAwLS4xMTktLjAxNS0uMTgtLjAxNWgtLjE0OWMtMS40NjggMC0yLjQyNy0uNjc1LTMuMjc5LTEuMjg4LS41OTktLjQyLTEuMTA3LS43NzktMS43MDctLjg4NC0uMzE0LS4wNDUtLjYyOS0uMDc0LS45MjgtLjA3NC0uNTQgMC0uOTU4LjA4OS0xLjI3Mi4xNDktLjIxMS4wNDMtLjM5MS4wNzQtLjU0LjA3NC0uMzc0IDAtLjUyMy0uMjI0LS41ODMtLjQyLS4wNjEtLjE5Mi0uMDktLjM4OS0uMTM1LS41NjctLjA0Ni0uMTgxLS4xMDUtLjQ5NC0uMTY2LS41Ny0xLjkxOC0uMjIyLTIuOTUtLjY0Mi0zLjE4OS0xLjIyNi0uMDMxLS4wNjMtLjA1Mi0uMTUtLjA1NS0uMjI1LS4wMTUtLjI0My4xNjUtLjQ2NS40Mi0uNTA5IDMuMjY0LS41NCA0LjczLTMuODc5IDQuNzkxLTQuMDJsLjAxNi0uMDI5Yy4xOC0uMzQ1LjIyNC0uNjQ1LjExOS0uODY5LS4xOTUtLjQzNC0uODg0LS42NTgtMS4zMzItLjgwOS0uMTIxLS4wMjktLjI0LS4wNzQtLjM0Ni0uMTE5LTEuMTA3LS40MzUtMS4yNTctLjkzLTEuMTk3LTEuMjczLjA5LS40NzkuNjc0LS43OTMgMS4xNjgtLjc5My4xNDYgMCAuMjcuMDI5LjM4My4wNzQuNDIuMTk0Ljc4OS4zIDEuMTA0LjMuMjM0IDAgLjM4NC0uMDYuNDY1LS4xMDVsLS4wNDYtLjU2OWMtLjA5OC0xLjYyNi0uMjI1LTMuNjUxLjMwNy00LjgzN0M3LjM5MiAxLjA3NyAxMC43MzkuODA3IDExLjcyNy44MDdsLjQxOS0uMDE1aC4wNnoiLz48L3N2Zz4=";
const TK = "data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjODg4ODg4IiByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIuNTI1LjAyYzEuMzEtLjAyIDIuNjEtLjAxIDMuOTEtLjAyLjA4IDEuNTMuNjMgMy4wOSAxLjc1IDQuMTcgMS4xMiAxLjExIDIuNyAxLjYyIDQuMjQgMS43OXY0LjAzYy0xLjQ0LS4wNS0yLjg5LS4zNS00LjItLjk3LS41Ny0uMjYtMS4xLS41OS0xLjYyLS45My0uMDEgMi45Mi4wMSA1Ljg0LS4wMiA4Ljc1LS4wOCAxLjQtLjU0IDIuNzktMS4zNSAzLjk0LTEuMzEgMS45Mi0zLjU4IDMuMTctNS45MSAzLjIxLTEuNDMuMDgtMi44Ni0uMzEtNC4wOC0xLjAzLTIuMDItMS4xOS0zLjQ0LTMuMzctMy42NS01LjcxLS4wMi0uNS0uMDMtMS0uMDEtMS40OS4xOC0xLjkgMS4xMi0zLjcyIDIuNTgtNC45NiAxLjY2LTEuNDQgMy45OC0yLjEzIDYuMTUtMS43Mi4wMiAxLjQ4LS4wNCAyLjk2LS4wNCA0LjQ0LS45OS0uMzItMi4xNS0uMjMtMy4wMi4zNy0uNjMuNDEtMS4xMSAxLjA0LTEuMzYgMS43NS0uMjEuNTEtLjE1IDEuMDctLjE0IDEuNjEuMjQgMS42NCAxLjgyIDMuMDIgMy41IDIuODcgMS4xMi0uMDEgMi4xOS0uNjYgMi43Ny0xLjYxLjE5LS4zMy40LS42Ny40MS0xLjA2LjEtMS43OS4wNi0zLjU3LjA3LTUuMzYuMDEtNC4wMy0uMDEtOC4wNS4wMi0xMi4wN3oiLz48L3N2Zz4=";

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
              <a href="https://facebook.com/nimaapp" style="text-decoration: none; margin: 0 8px; display: inline-block;"><img src="${FB}" alt="Facebook" style="width: 20px; height: 20px; border: 0;" /></a>
              <a href="https://instagram.com/nimaapp" style="text-decoration: none; margin: 0 8px; display: inline-block;"><img src="${IG}" alt="Instagram" style="width: 20px; height: 20px; border: 0;" /></a>
              <a href="https://snapchat.com/add/nimaapp" style="text-decoration: none; margin: 0 8px; display: inline-block;"><img src="${SC}" alt="Snapchat" style="width: 20px; height: 20px; border: 0;" /></a>
              <a href="https://tiktok.com/@nimaapp" style="text-decoration: none; margin: 0 8px; display: inline-block;"><img src="${TK}" alt="TikTok" style="width: 20px; height: 20px; border: 0;" /></a>
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
