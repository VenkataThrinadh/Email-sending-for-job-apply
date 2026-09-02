// services/emailService.js - Nodemailer SMTP email sender
const nodemailer = require('nodemailer');
require('dotenv').config();

// Create reusable transporter
const createTransporter = (smtpConfig = {}) => {
  return nodemailer.createTransport({
    host: smtpConfig.host || process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(smtpConfig.port || process.env.SMTP_PORT) || 587,
    secure: (smtpConfig.secure || process.env.SMTP_SECURE) === 'true',
    auth: {
      user: smtpConfig.user || process.env.SMTP_USER,
      pass: smtpConfig.pass || process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
    pool: true,           // Use connection pooling
    maxConnections: 5,
    maxMessages: 100,
  });
};

// Default transporter (singleton)
let defaultTransporter = null;
const getTransporter = () => {
  if (!defaultTransporter) {
    defaultTransporter = createTransporter();
  }
  return defaultTransporter;
};

/**
 * Send a single email
 * @param {Object} options - { to, subject, html, text, fromName, fromEmail, domain }
 */
const sendEmail = async (options) => {
  const { to, subject, html, text, fromName, fromEmail } = options;

  const transporter = getTransporter();

  const mailOptions = {
    from: `"${fromName || process.env.SMTP_FROM_NAME || 'EmailPro'}" <${fromEmail || process.env.SMTP_FROM_EMAIL}>`,
    to,
    subject,
    html: html || text,
    text: text || html?.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    headers: {
      'X-Mailer': 'EmailPro Marketing System',
      'List-Unsubscribe': `<mailto:unsubscribe@${process.env.SMTP_FROM_EMAIL?.split('@')[1] || 'example.com'}>`,
    },
  };

  const info = await transporter.sendMail(mailOptions);
  return { messageId: info.messageId, response: info.response };
};

/**
 * Verify SMTP connection is working
 */
const verifyConnection = async () => {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    return { success: true, message: 'SMTP connection verified.' };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

/**
 * Send test email
 */
const sendTestEmail = async (to, template, variables = {}) => {
  const { personalize } = require('./personalizationService');
  const subject = personalize(template.subject || 'Test Email from EmailPro', variables);
  const html = personalize(template.body || '<p>This is a test email.</p>', variables);
  return sendEmail({ to, subject, html });
};

module.exports = { sendEmail, verifyConnection, sendTestEmail, createTransporter };
