const fs = require('fs');
const path = require('path');

// Load the compiled templates
const welcomeModule = require('../dist/utils/emailTemplates/welcome');
const emailOtpModule = require('../dist/utils/emailTemplates/emailOtp');
const teacherInviteModule = require('../dist/utils/emailTemplates/teacherInvite');
const parentInviteModule = require('../dist/utils/emailTemplates/parentInvite');
const passwordResetModule = require('../dist/utils/emailTemplates/passwordReset');

const templates = [
  {
    id: 'welcome',
    title: '1. Welcome Email',
    desc: 'Sent after principal registration',
    html: welcomeModule.welcomeHtml('Chinedu Okoro'),
  },
  {
    id: 'email-otp',
    title: '2. Email OTP',
    desc: 'Sent for email verification during registration',
    html: emailOtpModule.emailOtpHtml('Chinedu Okoro', '482916'),
  },
  {
    id: 'teacher-invite',
    title: '3. Teacher Invite',
    desc: 'Sent when principal invites a teacher',
    html: teacherInviteModule.teacherInviteHtml('Greenfield Academy', 'NMA-ABC123'),
  },
  {
    id: 'parent-invite',
    title: '4. Parent Invite',
    desc: 'Sent when a student is registered',
    html: parentInviteModule.parentInviteHtml('Greenfield Academy', 'Mrs. Okoro', 'Tunde Okoro', 'NMA-XYZ789'),
  },
  {
    id: 'password-reset',
    title: '5. Password Reset',
    desc: 'Sent when user requests password reset',
    html: passwordResetModule.passwordResetHtml('Chinedu Okoro', 'abc123def456ghi789jkl012mno345pqr678stu901vwx234'),
  },
];

const navLinks = templates.map(t => `<a href="#${t.id}">${t.title.split('. ')[1]}</a>`).join('\n    ');

const sections = templates.map(t => `
  <div class="section" id="${t.id}">
    <h2>${t.title}</h2>
    <p>${t.desc}</p>
    <div class="preview">${t.html}</div>
  </div>
`).join('\n');

const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Email Template Previews</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f0f0f0; margin: 0; padding: 20px; }
    .nav { position: sticky; top: 0; background: #fff; padding: 16px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); z-index: 100; }
    .nav a { margin-right: 16px; color: #1a1a1a; text-decoration: none; font-weight: 600; font-size: 14px; }
    .nav a:hover { text-decoration: underline; }
    .section { margin-bottom: 40px; }
    .section h2 { color: #333; margin-bottom: 4px; }
    .section p { color: #666; margin-bottom: 16px; font-size: 14px; }
    .preview { border-radius: 8px; overflow: hidden; }
    .preview iframe { width: 100%; border: none; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="nav">
    ${navLinks}
  </div>
  ${sections}
</body>
</html>`;

const outPath = path.join(__dirname, 'email-preview.html');
fs.writeFileSync(outPath, fullHtml, 'utf-8');
console.log(`Preview written to: ${outPath}`);
