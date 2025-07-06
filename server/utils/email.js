import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configure SMTP transporter (Brevo)
const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST,
  port: process.env.BREVO_SMTP_PORT,
  secure: false, // TLS (true for 465, false for 587)
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASSWORD,
  },
});

export const sendInvitation = async ({ email, inviterName, documentTitle, token }) => {
  console.log('[sendInvitation] Called with:', { email, inviterName, documentTitle, token });

  const inviteLink = `${process.env.CLIENT_URL}/invite/${token}`;

  const mailOptions = {
    from: `"${process.env.EMAIL_SENDER_NAME || 'AI Pair ++'}" <${process.env.EMAIL_SENDER_ADDRESS}>`,
    to: email,
    subject: `Invitation to collaborate on ${documentTitle}`,
    html: `
      <h2>Collaboration Invitation</h2>
      <p><strong>${inviterName || 'Someone'}</strong> has invited you to collaborate on "<strong>${documentTitle || 'a document'}</strong>".</p>
      <p><a href="${inviteLink}" style="color: #4f46e5;">Click here to accept the invitation</a></p>
      <p>This invitation expires in 48 hours.</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${email} (Message ID: ${info.messageId})`);
    return info;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
};

export const sendEmail = sendInvitation;