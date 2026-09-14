/**
 * River of Life - Email Service
 * Uses nodemailer with Gmail SMTP (App Password)
 * Falls back to console logging in dev if not configured
 */

let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  console.warn('[EmailService] nodemailer not installed. Email sending disabled.');
}

const dotenv = require('dotenv');
dotenv.config();

const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';
const APP_URL = process.env.APP_URL || 'http://localhost:7880';
const APP_NAME = 'River of Life';

function createTransporter() {
  if (!nodemailer || !GMAIL_USER || !GMAIL_APP_PASSWORD) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD }
  });
}

async function sendInvitationEmail(toEmail, fullName, tempPassword, role, invitedByName = 'Admin') {
  const recipientName = fullName || 'Believer';
  const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:20px;overflow:hidden;max-width:600px;width:100%;">
        <tr>
          <td style="background:linear-gradient(135deg,#1e6b77,#0f4c54);padding:40px;text-align:center;">
            <div style="font-size:48px;margin-bottom:16px;">✝️</div>
            <h1 style="color:#f8fafc;margin:0;font-size:26px;font-weight:800;">River of Life</h1>
            <p style="color:#7dd3fc;margin:8px 0 0;font-size:14px;">You have been Invited!</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="color:#e2e8f0;font-size:16px;margin:0 0 8px;">Dear <strong>${recipientName}</strong>,</p>
            <p style="color:#94a3b8;font-size:14.5px;line-height:1.6;margin:0 0 24px;">
              <strong style="color:#d4af37;">${invitedByName}</strong> has added you to the <strong style="color:#f8fafc;">River of Life</strong> congregation app as a <strong style="color:#7dd3fc;">${role}</strong>. Your account has been created and you can now sign in with the details below.
            </p>
            <div style="background:#0f172a;border:1.5px solid rgba(212,175,55,0.3);border-radius:14px;padding:24px;margin-bottom:28px;">
              <p style="color:#d4af37;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 16px;">Your Login Credentials</p>
              <p style="color:#64748b;font-size:12px;margin:0 0 4px;">Email</p>
              <p style="color:#f8fafc;font-size:15px;font-weight:600;margin:0 0 16px;">${toEmail}</p>
              <p style="color:#64748b;font-size:12px;margin:0 0 4px;">Password</p>
              <p style="color:#f8fafc;font-size:15px;font-weight:700;font-family:monospace;background:rgba(212,175,55,0.1);padding:4px 12px;border-radius:6px;display:inline-block;margin:0;">${tempPassword}</p>
            </div>
            <div style="text-align:center;margin-bottom:28px;">
              <a href="${APP_URL}" style="display:inline-block;background:linear-gradient(135deg,#1e6b77,#0f4c54);color:#f8fafc;text-decoration:none;padding:16px 40px;border-radius:14px;font-size:15px;font-weight:800;">Open River of Life App &rarr;</a>
            </div>
            <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:14px 18px;">
              <p style="color:#fca5a5;font-size:12.5px;margin:0;line-height:1.5;">&#9888; <strong>Security:</strong> Please change your password after your first login. If you did not expect this invitation, contact the church administrator.</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#0f172a;padding:24px 40px;border-top:1px solid rgba(255,255,255,0.06);">
            <p style="color:#475569;font-size:12px;margin:0;text-align:center;">River of Life &mdash; Serving Maharashtrian Christians<br/>This email was sent automatically.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const emailText = `Dear ${recipientName},\n\nYou have been invited to River of Life App by ${invitedByName} as a ${role}.\n\nEmail: ${toEmail}\nPassword: ${tempPassword}\n\nSign in at: ${APP_URL}\n\nPlease change your password after first login.\n\nGod bless,\nRiver of Life Team`;

  const transporter = createTransporter();

  if (!transporter) {
    console.log('\n============================================================');
    console.log('[EmailService] INVITATION EMAIL (SMTP not configured - dev mode)');
    console.log('============================================================');
    console.log('TO:       ' + toEmail);
    console.log('NAME:     ' + recipientName);
    console.log('ROLE:     ' + role);
    console.log('PASSWORD: ' + tempPassword);
    console.log('APP URL:  ' + APP_URL);
    console.log('============================================================\n');
    return { success: true, devMode: true, message: 'Email logged to console (SMTP not configured)' };
  }

  try {
    const info = await transporter.sendMail({
      from: `"${APP_NAME}" <${GMAIL_USER}>`,
      to: toEmail,
      subject: `You're Invited to ${APP_NAME} - Welcome ${recipientName}!`,
      text: emailText,
      html: emailHtml
    });
    console.log('[EmailService] Invitation sent to ' + toEmail + ': ' + info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[EmailService] Failed to send invitation email:', err.message);
    return { success: false, error: err.message };
  }
}

async function sendPasswordResetEmail(toEmail, fullName, newPassword) {
  const transporter = createTransporter();
  const emailText = 'Dear ' + (fullName || 'User') + ',\n\nYour River of Life password has been reset.\n\nNew Password: ' + newPassword + '\n\nSign in at: ' + APP_URL + '\n\nGod bless,\nRiver of Life Team';
  if (!transporter) {
    console.log('[EmailService] PASSWORD RESET EMAIL (dev mode) TO: ' + toEmail + ' | NEW PASSWORD: ' + newPassword);
    return { success: true, devMode: true };
  }
  try {
    const info = await transporter.sendMail({
      from: `"${APP_NAME}" <${GMAIL_USER}>`,
      to: toEmail,
      subject: 'River of Life - Your Password Has Been Reset',
      text: emailText
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[EmailService] Failed to send password reset email:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendInvitationEmail, sendPasswordResetEmail };
