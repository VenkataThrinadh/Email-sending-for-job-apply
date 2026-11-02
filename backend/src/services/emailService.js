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

// Dynamic transporter cache (keyed by user@host)
const transporterCache = new Map();

const getTransporter = (smtpConfig = null) => {
  if (!smtpConfig || (!smtpConfig.user && !smtpConfig.pass)) {
    const defaultKey = `${process.env.SMTP_USER || 'default'}@${process.env.SMTP_HOST || 'smtp.gmail.com'}`;
    if (!transporterCache.has(defaultKey)) {
      transporterCache.set(defaultKey, createTransporter());
    }
    return transporterCache.get(defaultKey);
  }

  const key = `${smtpConfig.user}@${smtpConfig.host || process.env.SMTP_HOST || 'smtp.gmail.com'}`;
  if (!transporterCache.has(key)) {
    transporterCache.set(key, createTransporter(smtpConfig));
  }
  return transporterCache.get(key);
};

/**
 * Send a single email
 * @param {Object} options - { to, subject, html, text, fromName, fromEmail, smtpConfig, attachmentPath, attachmentName }
 */
const sendEmail = async (options) => {
  const { to, subject, html, text, fromName, fromEmail, smtpConfig, attachmentPath, attachmentName } = options;

  const transporter = getTransporter(smtpConfig);
  const senderEmail = smtpConfig?.user || fromEmail || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

  const mailOptions = {
    from: `"${fromName || process.env.SMTP_FROM_NAME || 'EmailPro'}" <${senderEmail}>`,
    to,
    subject,
    html: html || text,
    text: text || html?.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    headers: {
      'X-Mailer': 'EmailPro Marketing System',
      'List-Unsubscribe': `<mailto:unsubscribe@${senderEmail?.split('@')[1] || 'example.com'}>`,
    },
  };

  if (attachmentPath) {
    mailOptions.attachments = [
      {
        filename: attachmentName || 'attachment',
        path: attachmentPath
      }
    ];
  }

  const info = await transporter.sendMail(mailOptions);
  return { messageId: info.messageId, response: info.response, senderEmail };
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
const sendTestEmail = async (to, template, variables = {}, fromName) => {
  const { personalize } = require('./personalizationService');
  const subject = personalize(template.subject || 'Test Email from EmailPro', variables);
  const html = personalize(template.body || '<p>This is a test email.</p>', variables);
  return sendEmail({ to, subject, html, fromName });
};

module.exports = { sendEmail, verifyConnection, sendTestEmail, createTransporter };
