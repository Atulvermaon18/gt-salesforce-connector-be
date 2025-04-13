const nodemailer = require('nodemailer');
const { getValidAccessToken, getOAuthConfig } = require('./setupOAuth');

const createTransport = async () => {
  try {
    const OAUTH_CONFIG = getOAuthConfig();
    
    const accessToken = await getValidAccessToken();
    
    return nodemailer.createTransport({
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
      auth: {
        type: 'OAuth2',
        user: OAUTH_CONFIG.emailUser,
        clientId: OAUTH_CONFIG.clientId,
        clientSecret: OAUTH_CONFIG.clientSecret,
        accessToken
      },
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false
      }
    });
  } catch (error) {
    console.error('Error creating transport:', error);
    throw new Error('Failed to create email transport');
  }
};

const sendEmail = async (to, firstName, temporaryPassword, resetUrl, isRegisterTemplate = true) => {
    const OAUTH_CONFIG = getOAuthConfig();
    const appName = process.env.APP_NAME || 'SF Application';
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@example.com';

    const htmlContent = isRegisterTemplate ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f7f7f7; border-radius: 5px;">
            <div style="background: #ffffff; padding: 20px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h1 style="color: #333; font-size: 24px; margin-bottom: 20px;">Welcome to ${appName}</h1>
                
                <p style="color: #555; font-size: 16px; margin-bottom: 15px;">Hello ${firstName},</p>
                
                <p style="color: #555; font-size: 16px; margin-bottom: 15px;">Your account has been created. Please use the following temporary password to access your account:</p>
                
                <div style="background: #f5f5f5; padding: 12px; border-left: 4px solid #3498db; margin-bottom: 20px;">
                    <p style="color: #333; font-size: 16px; margin: 0;"><strong>${temporaryPassword}</strong></p>
                </div>
                
                <p style="color: #555; font-size: 16px; margin-bottom: 20px;">For security reasons, please set a new password by clicking the button below:</p>
                
                <a href="${resetUrl}" style="display: inline-block; background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold; margin-bottom: 20px;">Set Password</a>
                
                <p style="color: #777; font-size: 14px; margin-bottom: 15px;">This link will expire in 24 hours. If you didn't request this account, please ignore this email.</p>
                
                <p style="color: #555; font-size: 14px; margin-bottom: 10px;">If you have any questions, please contact our support team at <a href="mailto:${supportEmail}" style="color: #3498db; text-decoration: none;">${supportEmail}</a>.</p>
                
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                
                <p style="color: #777; font-size: 14px; margin: 0;">Thank you,<br>The ${appName} Team</p>
            </div>
        </div>
    `: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f7f7f7; border-radius: 5px;">
            <div style="background: #ffffff; padding: 20px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h1 style="color: #333; font-size: 24px; margin-bottom: 20px;">Password Reset Request</h1>
                
                <p style="color: #555; font-size: 16px; margin-bottom: 15px;">Hello ${firstName},</p>
                
                <p style="color: #555; font-size: 16px; margin-bottom: 15px;">We received a request to reset your password. Please use the following temporary password:</p>
                
                <div style="background: #f5f5f5; padding: 12px; border-left: 4px solid #3498db; margin-bottom: 20px;">
                    <p style="color: #333; font-size: 16px; margin: 0;"><strong>${temporaryPassword}</strong></p>
                </div>
                
                <p style="color: #555; font-size: 16px; margin-bottom: 20px;">To reset your password, please click the button below:</p>
                
                <a href="${resetUrl}" style="display: inline-block; background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold; margin-bottom: 20px;">Reset Password</a>
                
                <p style="color: #777; font-size: 14px; margin-bottom: 15px;">This link will expire in 24 hours. If you didn't request this password reset, please ignore this email or contact support immediately.</p>
                
                <p style="color: #555; font-size: 14px; margin-bottom: 10px;">If you have any questions, please contact our support team at <a href="mailto:${supportEmail}" style="color: #3498db; text-decoration: none;">${supportEmail}</a>.</p>
                
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                
                <p style="color: #777; font-size: 14px; margin: 0;">Thank you,<br>The ${appName} Team</p>
            </div>
        </div>
    `;

    const mailOptions = {
        from: OAUTH_CONFIG.emailUser,
        to,
        subject: isRegisterTemplate ? `Welcome to ${appName} - Account Setup` : `${appName} - Password Reset Request`,
        html: htmlContent,
        text: isRegisterTemplate 
            ? `Hello ${firstName}! Welcome to ${appName}. Your temporary password is: ${temporaryPassword}. Please set up your account by visiting: ${resetUrl}. This link will expire in 24 hours.`
            : `Hello ${firstName}! We received a password reset request for your ${appName} account. Your temporary password is: ${temporaryPassword}. Please reset your password by visiting: ${resetUrl}. This link will expire in 24 hours.`,
    };

    try {
        const transporter = await createTransport();
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${to}`);
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send email');
    }
};

module.exports = sendEmail;