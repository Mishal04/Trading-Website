const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_PORT === '465',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const verifyEmailConfig = async () => {
  try {
    await transporter.verify();
    console.log('Email service configured successfully');
  } catch (error) {
    console.error('Email configuration failed:', error);
  }
};

const sendVerificationEmail = async (email, name, verificationToken) => {
  const verificationLink = process.env.CLIENT_URL + '/verify-email?token=' + verificationToken;
  
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
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error.message };
  }
};

const sendPasswordResetEmail = async (email, name, resetToken) => {
  const resetLink = process.env.CLIENT_URL + '/reset-password?token=' + resetToken;
  
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
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  transporter,
  verifyEmailConfig,
  sendVerificationEmail,
  sendPasswordResetEmail
};
