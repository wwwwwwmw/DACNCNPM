const nodemailer = require('nodemailer');

// Use JSON transport to log emails to console (no real SMTP needed for dev)
const transporter = nodemailer.createTransport({ jsonTransport: true });

async function sendMail({ to, subject, text, html }) {
  const from = process.env.EMAIL_FROM || 'no-reply@example.com';
  const info = await transporter.sendMail({ from, to, subject, text, html });
  // In dev, this will print the email object to console via jsonTransport
  return info;
}

module.exports = { sendMail };
