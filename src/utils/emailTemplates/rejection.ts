import { baseLayout } from "./baseTemplate";

export const rejectionHtml = (schoolName: string, reason?: string | null) => {
  const reasonBlock = reason
    ? `<p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 12px 0 0; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-text"><strong style="color: #1a1a1a;">Reason:</strong> ${reason}</p>`
    : "";

  return baseLayout(
    `
  <tr>
    <td align="center" style="padding: 32px 40px 0;" class="card-inner">
      <h1 style="color: #1a1a1a; font-size: 28px; font-weight: 700; margin: 0; line-height: 1.3; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-title">Application Update</h1>
    </td>
  </tr>
  <tr>
    <td style="padding: 16px 40px 0; max-width: 366px; margin: 0 auto;" class="card-inner">
      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-text">Hi there,</p>
      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 12px 0 0; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-text">We're sorry, but <strong style="color: #1a1a1a;">${schoolName}</strong> could not be approved for the platform at this time.</p>
      ${reasonBlock}
      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 12px 0 0; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-text">If you'd like to discuss this, reply to this email or reach out to our support team.</p>
    </td>
  </tr>
  `,
    `
  <tr>
    <td style="padding: 24px 40px 0; max-width: 366px; margin: 0 auto;" class="ignore-inner">
      <p style="color: #888888; font-size: 14px; line-height: 1.5; margin: 0; text-align: center; font-family: 'Geist', Arial, Helvetica, sans-serif;" class="card-text">You can reapply in the future.</p>
    </td>
  </tr>
  `,
  );
};