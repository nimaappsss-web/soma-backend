import { baseLayout } from "./baseTemplate";

export const supportInquiryHtml = (
  schoolName: string,
  authorName: string,
  message: string,
  supportEmail?: string,
) => {
  const supportBlock = supportEmail
    ? `<p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 12px 0 0; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-text">You can also reach the team directly at <strong style="color: #1a1a1a;">${supportEmail}</strong>.</p>`
    : "";

  return baseLayout(
    `
  <tr>
    <td align="center" style="padding: 32px 40px 0;" class="card-inner">
      <h1 style="color: #1a1a1a; font-size: 28px; font-weight: 700; margin: 0; line-height: 1.3; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-title">How can we help?</h1>
    </td>
  </tr>
  <tr>
    <td style="padding: 16px 40px 0; max-width: 366px; margin: 0 auto;" class="card-inner">
      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-text">Hi there,</p>
      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 12px 0 0; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-text">Your message has been sent to the Nima team.</p>
      <p style="color: #888888; font-size: 14px; line-height: 1.6; margin: 16px 0 0; padding: 12px 16px; border-left: 3px solid #1a1a1a; background: #f7f7f8; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-text">"${message}"</p>
      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 12px 0 0; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-text">We'll get back to you as soon as possible.</p>
      ${supportBlock}
    </td>
  </tr>
  `,
    `
  <tr>
    <td style="padding: 24px 40px 0; max-width: 366px; margin: 0 auto;" class="ignore-inner">
      <p style="color: #888888; font-size: 14px; line-height: 1.5; margin: 0; text-align: center; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-text">${schoolName} · ${authorName}</p>
    </td>
  </tr>
  `,
  );
};