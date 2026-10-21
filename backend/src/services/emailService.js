const nodemailer = require('nodemailer');

// ── Email Service Configuration ─────────────────────────────────────────────
// Validates that all required environment variables are present
const validateEmailConfig = () => {
  const required = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS', 'CLIENT_URL'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn('[EMAIL] Missing configuration:', missing.join(', '));
    return false;
  }
  return true;
};

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT, 10),
  secure: parseInt(process.env.EMAIL_PORT, 10) === 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  // Connection timeout to prevent hanging
  connectionTimeout: 5000,
  socketTimeout: 5000
});

const verifyEmailConfig = async () => {
  if (!validateEmailConfig()) {
    console.error('[EMAIL] Configuration is incomplete. Email service will not work.');
    console.error('[EMAIL] Please ensure EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, CLIENT_URL are set.');
    console.error('[EMAIL] Current config:');
    console.error('[EMAIL]   EMAIL_HOST:', process.env.EMAIL_HOST);
    console.error('[EMAIL]   EMAIL_PORT:', process.env.EMAIL_PORT);
    console.error('[EMAIL]   EMAIL_USER:', process.env.EMAIL_USER);
    console.error('[EMAIL]   EMAIL_PASS: [' + (process.env.EMAIL_PASS ? 'SET' : 'MISSING') + ']');
    console.error('[EMAIL]   CLIENT_URL:', process.env.CLIENT_URL);
    return false;
  }

  try {
    console.log('[EMAIL] Testing SMTP connection with:');
    console.log('[EMAIL]   Host:', process.env.EMAIL_HOST);
    console.log('[EMAIL]   Port:', process.env.EMAIL_PORT);
    console.log('[EMAIL]   User:', process.env.EMAIL_USER);
    console.log('[EMAIL]   Secure:', parseInt(process.env.EMAIL_PORT, 10) === 465);
    
    await transporter.verify();
    console.log('[EMAIL] ✅ SMTP connection successful');
    return true;
  } catch (error) {
    console.error('[EMAIL] ❌ Verification failed:', error.message);
    if (error.code === 'EAUTH') {
      console.error('[EMAIL] SMTP authentication failed. Check your EMAIL_USER and EMAIL_PASS.');
      console.error('[EMAIL] If using Gmail:');
      console.error('[EMAIL]   1. Enable 2-Factor Authentication');
      console.error('[EMAIL]   2. Create an App Password (not account password): https://myaccount.google.com/apppasswords');
      console.error('[EMAIL]   3. Use the 16-character App Password as EMAIL_PASS');
    }
    return false;
  }
};

const sendVerificationEmail = async (email, name, verificationToken) => {
  console.log('[EMAIL-SERVICE] sendVerificationEmail called with email:', email);
  
  const verificationLink = process.env.CLIENT_URL + '/verify-email?token=' + verificationToken;
  console.log('[EMAIL-SERVICE] Verification link:', verificationLink);
  
  const mailOptions = {
    from: '"Trading Platform" <' + process.env.EMAIL_USER + '>',
    to: email,
    subject: 'Verify Your Email Address',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f4f4f4; }
            .header { background: #1a2f44; color: white; padding: 20px; text-align: center; }
            .content { background: white; padding: 30px; }
            .btn { display: inline-block; background: #f6b83e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Welcome to Trading Platform</h2>
            </div>
            <div class="content">
              <h3>Hello ` + name + `!</h3>
              <p>Thank you for registering with our Trading Platform. Please verify your email address to get started.</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="` + verificationLink + `" class="btn">Verify Email Address</a>
              </p>
              <p>If you didn't create an account, please ignore this email.</p>
              <p>This link will expire in 24 hours.</p>
            </div>
            <div class="footer">
              <p>&copy; ` + new Date().getFullYear() + ` Trading Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `
  };
  
  try {
    console.log('[EMAIL-SERVICE] Attempting to send email...');
    const result = await transporter.sendMail(mailOptions);
    console.log('[EMAIL-SERVICE] Email sent successfully. MessageId:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('[EMAIL-SERVICE] Email sending error:', error.message);
    console.error('[EMAIL-SERVICE] Error code:', error.code);
    console.error('[EMAIL-SERVICE] Stack:', error.stack);
    return { success: false, error: error.message };
  }
};

const sendPasswordResetEmail = async (email, name, resetToken) => {
  console.log('[EMAIL-SERVICE] sendPasswordResetEmail called with email:', email);
  
  const resetLink = process.env.CLIENT_URL + '/reset-password?token=' + resetToken;
  console.log('[EMAIL-SERVICE] Reset link:', resetLink);
  
  const mailOptions = {
    from: '"Trading Platform" <' + process.env.EMAIL_USER + '>',
    to: email,
    subject: 'Password Reset Request',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f4f4f4; }
            .header { background: #1a2f44; color: white; padding: 20px; text-align: center; }
            .content { background: white; padding: 30px; }
            .btn { display: inline-block; background: #f6b83e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Password Reset Request</h2>
            </div>
            <div class="content">
              <h3>Hello ` + name + `!</h3>
              <p>You requested to reset your password. Click the button below to set a new password.</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="` + resetLink + `" class="btn">Reset Password</a>
              </p>
              <p>If you didn't request this, please ignore this email.</p>
              <p>This link will expire in 1 hour.</p>
            </div>
          </div>
        </body>
      </html>
    `
  };
  
  try {
    console.log('[EMAIL-SERVICE] Attempting to send email...');
    const result = await transporter.sendMail(mailOptions);
    console.log('[EMAIL-SERVICE] Email sent successfully. MessageId:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('[EMAIL-SERVICE] Email sending error:', error.message);
    console.error('[EMAIL-SERVICE] Error code:', error.code);
    console.error('[EMAIL-SERVICE] Stack:', error.stack);
    return { success: false, error: error.message };
  }
};

module.exports = {
  transporter,
  verifyEmailConfig,
  sendVerificationEmail,
  sendPasswordResetEmail
};
