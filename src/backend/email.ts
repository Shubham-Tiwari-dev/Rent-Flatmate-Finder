import nodemailer from 'nodemailer';

// Helper to get SMTP transporter if configured
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

export const transporter = emailUser && emailPass
  ? nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // port 587 uses TLS, so secure must be false
      requireTLS: true,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    })
  : null;

/**
 * Verify transporter once on startup
 */
export async function verifyTransporter() {
  if (transporter) {
    try {
      await transporter.verify();
      console.log('[SMTP Transporter Success] SMTP Connection verified successfully on startup.');
    } catch (err) {
      console.error('[SMTP Transporter Error] SMTP Connection verification failed:', err);
    }
  } else {
    console.warn('[SMTP Transporter Warning] EMAIL_USER or EMAIL_PASS not set. SMTP is disabled.');
  }
}

/**
 * Sends a notification email or logs it beautifully if SMTP is not configured
 */
export async function sendEmail(to: string, subject: string, htmlContent: string) {
  const fromAddress = process.env.EMAIL_USER || process.env.SMTP_FROM || 'no-reply@rentflatmate.com';

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"RentMate" <${fromAddress}>`,
        to,
        subject,
        html: htmlContent,
      });
      console.log(`[SMTP Email Sent] To: ${to} | Subject: ${subject}`);
    } catch (err) {
      console.error('[SMTP Email Error] Failed to send real email via transporter:', err);
    }
  } else {
    // Elegant Logger Fallback for Preview environment
    console.log(`
================================================================================
[DEVELOPER NOTIFICATION EMAIL LOG]
--------------------------------------------------------------------------------
To:      ${to}
Subject: ${subject}
Content:
${htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}
================================================================================
    `);
  }
}

/**
 * Send notification to owner about tenant interest and compatibility
 */
export async function notifyOwnerOfInterest(
  ownerEmail: string,
  ownerName: string,
  listingTitle: string,
  location: string,
  rent: number,
  tenantName: string,
  tenantEmail: string,
  compatibilityScore: number,
  explanation: string
) {
  const emailUser = process.env.EMAIL_USER;

  if (!transporter || !emailUser) {
    console.warn('[Owner Interest Notification (Fallback)] Transporter not configured.');
    console.log(`
================================================================================
[DEVELOPER OWNER INTEREST EMAIL LOG]
--------------------------------------------------------------------------------
To:      ${ownerEmail}
Subject: 🏠 New Tenant Interested in Your Room
Owner:   ${ownerName}
Tenant:  ${tenantName} (${tenantEmail})
Score:   ${compatibilityScore}
Listing: ${listingTitle}
================================================================================
    `);
    return;
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const loginUrl = appUrl.endsWith('/') ? appUrl : `${appUrl}/`;

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Tenant Interested in Your Room</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background-color: #f4f4f7;
      color: #51545e;
      margin: 0;
      padding: 0;
      width: 100% !important;
      -webkit-text-size-adjust: none;
    }
    .email-wrapper {
      width: 100%;
      background-color: #f4f4f7;
      margin: 0;
      padding: 24px 0;
    }
    .email-content {
      max-width: 570px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e8e8f1;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .email-header {
      background-color: #4f46e5;
      padding: 32px;
      text-align: center;
    }
    .logo-text {
      color: #ffffff;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
      text-decoration: none;
      margin: 0;
    }
    .email-body {
      padding: 32px;
    }
    .greeting {
      font-size: 20px;
      color: #1f2937;
      margin-top: 0;
      margin-bottom: 12px;
      font-weight: bold;
    }
    .text-lead {
      font-size: 16px;
      line-height: 1.6;
      color: #4b5563;
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 16px;
      font-weight: bold;
      color: #1f2937;
      margin-top: 24px;
      margin-bottom: 12px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 6px;
    }
    .detail-row {
      margin-bottom: 8px;
      font-size: 15px;
      line-height: 1.5;
    }
    .detail-label {
      font-weight: bold;
      color: #374151;
      display: inline-block;
      width: 140px;
    }
    .detail-value {
      color: #4b5563;
    }
    .score-badge {
      display: inline-block;
      background-color: #e0e7ff;
      color: #3730a3;
      font-size: 16px;
      font-weight: bold;
      padding: 8px 16px;
      border-radius: 9999px;
      margin-bottom: 16px;
    }
    .score-badge-high {
      background-color: #d1fae5;
      color: #065f46;
    }
    .explanation-box {
      background-color: #f9fafb;
      border-left: 4px solid #4f46e5;
      padding: 16px;
      border-radius: 4px;
      margin: 16px 0;
      font-style: italic;
      color: #4b5563;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .button {
      background-color: #4f46e5;
      color: #ffffff !important;
      display: inline-block;
      padding: 14px 30px;
      font-size: 16px;
      font-weight: bold;
      text-align: center;
      text-decoration: none;
      border-radius: 6px;
      box-shadow: 0 4px 6px rgba(79, 70, 229, 0.2);
    }
    .footer {
      background-color: #f9fafb;
      padding: 24px;
      text-align: center;
      border-top: 1px solid #f3f4f6;
    }
    .footer-text {
      font-size: 13px;
      color: #9ca3af;
      margin: 0;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-content">
      <!-- Header -->
      <div class="email-header">
        <h1 class="logo-text">RentMate</h1>
      </div>

      <!-- Body -->
      <div class="email-body">
        <p class="greeting">Hello ${ownerName},</p>
        <p class="text-lead">Great news!<br>A tenant has shown interest in your room listing.</p>

        <div class="score-badge ${compatibilityScore >= 70 ? 'score-badge-high' : ''}">
          Compatibility Score: ${compatibilityScore}/100
        </div>

        <div class="section-title">Tenant Details</div>
        <div class="detail-row">
          <span class="detail-label">Name:</span>
          <span class="detail-value">${tenantName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Email:</span>
          <span class="detail-value">${tenantEmail}</span>
        </div>

        <div class="section-title">Listing Details</div>
        <div class="detail-row">
          <span class="detail-label">Listing:</span>
          <span class="detail-value">${listingTitle}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Location:</span>
          <span class="detail-value">${location}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Monthly Rent:</span>
          <span class="detail-value">₹${rent}</span>
        </div>

        <div class="section-title">AI Explanation</div>
        <div class="explanation-box">
          ${explanation}
        </div>

        <p class="text-lead" style="margin-top: 24px;">Please login to RentMate to review the request.</p>
        
        <p class="text-lead" style="margin-bottom: 0;">Regards,<br><strong>RentMate Team</strong></p>

        <!-- Login Button -->
        <div class="button-container">
          <a href="${loginUrl}" class="button" target="_blank">Login to RentMate</a>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p class="footer-text">This is an automated notification from RentMate.</p>
        <p class="footer-text" style="margin-top: 6px;">&copy; 2026 RentMate. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  try {
    const info = await transporter!.sendMail({
      from: `"RentMate" <${emailUser}>`,
      to: ownerEmail,
      subject: '🏠 New Tenant Interested in Your Room',
      html: htmlContent,
    });
    console.log(`Interest email sent successfully to ${ownerEmail}`);
    console.log(`Nodemailer messageId: ${info?.messageId}`);
  } catch (sendError: any) {
    console.error(`[Owner Interest Email Error] Failed to send email to ${ownerEmail}:`, sendError);
  }
}

/**
 * Send notification to tenant about interest request update
 */
export async function notifyTenantOfRequestUpdate(tenantEmail: string, tenantName: string, listingTitle: string, status: 'accepted' | 'rejected') {
  const isAccepted = status === 'accepted';
  const statusLabel = isAccepted ? 'ACCEPTED' : 'REJECTED';
  const statusColor = isAccepted ? '#16a34a' : '#dc2626';

  const subject = isAccepted
    ? `🎉 Good News! Your request for ${listingTitle} was ACCEPTED`
    : `Update on your interest request for ${listingTitle}`;

  const actionMsg = isAccepted
    ? `The owner has unlocked chat! You can now start messaging them directly from your secure Chat tab in the dashboard.`
    : `Unfortunately, the owner has declined this request or marked the listing as filled. Keep searching – there are many active listings awaiting compatibility matches!`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
      <h2 style="color: #4f46e5; margin-bottom: 20px;">Rent & Flatmate Finder</h2>
      <p>Hello <strong>${tenantName}</strong>,</p>
      <p>Your interest request for <strong>${listingTitle}</strong> has been updated:</p>
      <div style="margin: 20px 0; padding: 15px; background-color: #f9fafb; text-align: center; border-radius: 4px;">
        <p style="margin: 0; font-size: 18px; font-weight: bold; color: ${statusColor};">STATUS: ${statusLabel}</p>
      </div>
      <p>${actionMsg}</p>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="font-size: 12px; color: #6b7280;">This is an automated notification from Rent & Flatmate Finder platform.</p>
    </div>
  `;

  await sendEmail(tenantEmail, subject, html);
}

/**
 * Send a modern responsive welcome email immediately after registration
 */
export async function sendWelcomeEmail(toEmail: string, name: string, role: string) {
  const emailUser = process.env.EMAIL_USER;

  if (!transporter || !emailUser) {
    console.warn('[Welcome Email Log (Fallback)] Transporter or EMAIL_USER not configured.');
    console.log(`
================================================================================
[DEVELOPER WELCOME EMAIL LOG]
--------------------------------------------------------------------------------
To:      ${toEmail}
Subject: 🎉 Welcome to RentMate
Name:    ${name}
Role:    ${role}
================================================================================
    `);
    return;
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const loginUrl = appUrl.endsWith('/') ? appUrl : `${appUrl}/`;

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to RentMate</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background-color: #f4f4f7;
      color: #51545e;
      margin: 0;
      padding: 0;
      width: 100% !important;
      -webkit-text-size-adjust: none;
    }
    .email-wrapper {
      width: 100%;
      background-color: #f4f4f7;
      margin: 0;
      padding: 24px 0;
    }
    .email-content {
      max-width: 570px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e8e8f1;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .email-header {
      background-color: #4f46e5;
      padding: 32px;
      text-align: center;
    }
    .logo-text {
      color: #ffffff;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
      text-decoration: none;
      margin: 0;
    }
    .welcome-banner {
      background-color: #e0e7ff;
      color: #3730a3;
      font-size: 18px;
      font-weight: bold;
      text-align: center;
      padding: 12px;
      margin-bottom: 24px;
    }
    .email-body {
      padding: 32px;
    }
    .greeting {
      font-size: 20px;
      color: #1f2937;
      margin-top: 0;
      margin-bottom: 12px;
      font-weight: bold;
    }
    .text-lead {
      font-size: 16px;
      line-height: 1.6;
      color: #4b5563;
      margin-bottom: 24px;
    }
    .role-badge {
      display: inline-block;
      background-color: #4f46e5;
      color: #ffffff;
      font-size: 14px;
      font-weight: bold;
      padding: 6px 14px;
      border-radius: 9999px;
      margin-bottom: 24px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .feature-list {
      margin: 24px 0;
      padding: 0;
      list-style-type: none;
    }
    .feature-item {
      font-size: 15px;
      line-height: 1.5;
      color: #4b5563;
      margin-bottom: 12px;
      padding-left: 24px;
      position: relative;
    }
    .feature-item::before {
      content: "•";
      color: #4f46e5;
      font-size: 20px;
      position: absolute;
      left: 6px;
      top: -2px;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .button {
      background-color: #4f46e5;
      color: #ffffff !important;
      display: inline-block;
      padding: 14px 30px;
      font-size: 16px;
      font-weight: bold;
      text-align: center;
      text-decoration: none;
      border-radius: 6px;
      box-shadow: 0 4px 6px rgba(79, 70, 229, 0.2);
    }
    .footer {
      background-color: #f9fafb;
      padding: 24px;
      text-align: center;
      border-top: 1px solid #f3f4f6;
    }
    .footer-text {
      font-size: 13px;
      color: #9ca3af;
      margin: 0;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-content">
      <!-- Header -->
      <div class="email-header">
        <h1 class="logo-text">RentMate</h1>
      </div>
      
      <!-- Welcome Banner -->
      <div class="welcome-banner">
        🎉 Welcome to RentMate
      </div>

      <!-- Body -->
      <div class="email-body">
        <p class="greeting">Hello ${name},</p>
        <p class="text-lead">Welcome to RentMate!<br>Your account has been created successfully.</p>
        
        <div style="margin-bottom: 8px; font-weight: bold; color: #374151;">Role:</div>
        <div class="role-badge">${role}</div>

        <p class="text-lead" style="font-weight: bold; margin-bottom: 12px; color: #1f2937;">You can now:</p>
        <ul class="feature-list">
          <li class="feature-item">Browse available rooms</li>
          <li class="feature-item">Post room listings (Owner)</li>
          <li class="feature-item">Find compatible flatmates</li>
          <li class="feature-item">Express interest in rooms</li>
          <li class="feature-item">Receive AI compatibility scores</li>
          <li class="feature-item">Chat with owners after request approval</li>
        </ul>

        <p class="text-lead" style="margin-top: 24px;">Thank you for joining RentMate.<br>Happy House Hunting!</p>
        
        <p class="text-lead" style="margin-bottom: 0;">Regards,<br><strong>RentMate Team</strong></p>

        <!-- Login Button -->
        <div class="button-container">
          <a href="${loginUrl}" class="button" target="_blank">Login to RentMate</a>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p class="footer-text">This is an automated welcome email from the RentMate platform.</p>
        <p class="footer-text" style="margin-top: 6px;">&copy; 2026 RentMate. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  try {
    const info = await transporter!.sendMail({
      from: `"RentMate" <${emailUser}>`,
      to: toEmail,
      subject: '🎉 Welcome to RentMate',
      html: htmlContent,
    });
    console.log(`Welcome email sent successfully to ${toEmail}`);
    console.log(`Nodemailer messageId: ${info?.messageId}`);
  } catch (sendError: any) {
    console.error(`[Welcome Email Error] Failed to send welcome email to ${toEmail}:`, sendError);
  }
}

/**
 * Send notification to Tenant when their interest request is accepted by Owner
 */
export async function sendTenantAcceptanceEmail(
  tenantEmail: string,
  tenantName: string,
  listingTitle: string,
  location: string,
  rent: number,
  ownerName: string
) {
  const emailUser = process.env.EMAIL_USER;

  if (!transporter || !emailUser) {
    console.warn('[Tenant Acceptance Email Log (Fallback)] Transporter or EMAIL_USER not configured.');
    console.log(`
================================================================================
[DEVELOPER TENANT ACCEPTANCE EMAIL LOG]
--------------------------------------------------------------------------------
To:      ${tenantEmail}
Subject: 🎉 Your Room Request Has Been Accepted
Tenant:  ${tenantName}
Listing: ${listingTitle}
================================================================================
    `);
    return;
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const loginUrl = appUrl.endsWith('/') ? appUrl : `${appUrl}/`;

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Room Request Has Been Accepted</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background-color: #f4f4f7;
      color: #51545e;
      margin: 0;
      padding: 0;
      width: 100% !important;
      -webkit-text-size-adjust: none;
    }
    .email-wrapper {
      width: 100%;
      background-color: #f4f4f7;
      margin: 0;
      padding: 24px 0;
    }
    .email-content {
      max-width: 570px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e8e8f1;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .email-header {
      background-color: #4f46e5;
      padding: 32px;
      text-align: center;
    }
    .logo-text {
      color: #ffffff;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
      text-decoration: none;
      margin: 0;
    }
    .success-banner {
      background-color: #d1fae5;
      color: #065f46;
      font-size: 18px;
      font-weight: bold;
      text-align: center;
      padding: 12px;
      margin-bottom: 24px;
    }
    .email-body {
      padding: 32px;
    }
    .greeting {
      font-size: 20px;
      color: #1f2937;
      margin-top: 0;
      margin-bottom: 12px;
      font-weight: bold;
    }
    .text-lead {
      font-size: 16px;
      line-height: 1.6;
      color: #4b5563;
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 16px;
      font-weight: bold;
      color: #1f2937;
      margin-top: 24px;
      margin-bottom: 12px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 6px;
    }
    .detail-row {
      margin-bottom: 8px;
      font-size: 15px;
      line-height: 1.5;
    }
    .detail-label {
      font-weight: bold;
      color: #374151;
      display: inline-block;
      width: 140px;
    }
    .detail-value {
      color: #4b5563;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .button {
      background-color: #4f46e5;
      color: #ffffff !important;
      display: inline-block;
      padding: 14px 30px;
      font-size: 16px;
      font-weight: bold;
      text-align: center;
      text-decoration: none;
      border-radius: 6px;
      box-shadow: 0 4px 6px rgba(79, 70, 229, 0.2);
    }
    .footer {
      background-color: #f9fafb;
      padding: 24px;
      text-align: center;
      border-top: 1px solid #f3f4f6;
    }
    .footer-text {
      font-size: 13px;
      color: #9ca3af;
      margin: 0;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-content">
      <!-- Header -->
      <div class="email-header">
        <h1 class="logo-text">RentMate</h1>
      </div>

      <!-- Success Banner -->
      <div class="success-banner">
        🎉 Your Room Request Has Been Accepted
      </div>

      <!-- Body -->
      <div class="email-body">
        <p class="greeting">Hello ${tenantName},</p>
        <p class="text-lead">Congratulations!<br>The owner has accepted your interest request.</p>

        <div class="section-title">Listing Details</div>
        <div class="detail-row">
          <span class="detail-label">Title:</span>
          <span class="detail-value">${listingTitle}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Location:</span>
          <span class="detail-value">${location}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Monthly Rent:</span>
          <span class="detail-value">₹${rent}</span>
        </div>

        <div class="section-title">Owner Details</div>
        <div class="detail-row">
          <span class="detail-label">Owner:</span>
          <span class="detail-value">${ownerName}</span>
        </div>

        <p class="text-lead" style="margin-top: 24px;">You can now log in to RentMate and start chatting with the owner.</p>
        <p class="text-lead">Thank you for using RentMate.</p>
        
        <p class="text-lead" style="margin-bottom: 0;">Regards,<br><strong>RentMate Team</strong></p>

        <!-- Login Button -->
        <div class="button-container">
          <a href="${loginUrl}" class="button" target="_blank">Login to RentMate</a>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p class="footer-text">This is an automated notification from RentMate.</p>
        <p class="footer-text" style="margin-top: 6px;">&copy; 2026 RentMate. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  try {
    const info = await transporter!.sendMail({
      from: `"RentMate" <${emailUser}>`,
      to: tenantEmail,
      subject: '🎉 Your Room Request Has Been Accepted',
      html: htmlContent,
    });
    console.log(`Acceptance email sent successfully to ${tenantEmail}`);
    console.log(`Nodemailer messageId: ${info?.messageId}`);
  } catch (sendError: any) {
    console.error(`[Tenant Acceptance Email Error] Failed to send email to ${tenantEmail}:`, sendError);
  }
}

/**
 * Send notification to Tenant when their interest request is declined by Owner
 */
export async function sendTenantDeclinedEmail(
  tenantEmail: string,
  tenantName: string,
  listingTitle: string,
  location: string,
  rent: number,
  ownerName: string
) {
  const emailUser = process.env.EMAIL_USER;

  if (!transporter || !emailUser) {
    console.warn('[Tenant Declined Email Log (Fallback)] Transporter or EMAIL_USER not configured.');
    console.log(`
================================================================================
[DEVELOPER TENANT DECLINED EMAIL LOG]
--------------------------------------------------------------------------------
To:      ${tenantEmail}
Subject: Update on Your Room Request
Tenant:  ${tenantName}
Listing: ${listingTitle}
================================================================================
    `);
    return;
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const loginUrl = appUrl.endsWith('/') ? appUrl : `${appUrl}/`;

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Update on Your Room Request</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background-color: #f4f4f7;
      color: #51545e;
      margin: 0;
      padding: 0;
      width: 100% !important;
      -webkit-text-size-adjust: none;
    }
    .email-wrapper {
      width: 100%;
      background-color: #f4f4f7;
      margin: 0;
      padding: 24px 0;
    }
    .email-content {
      max-width: 570px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e8e8f1;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .email-header {
      background-color: #4f46e5;
      padding: 32px;
      text-align: center;
    }
    .logo-text {
      color: #ffffff;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
      text-decoration: none;
      margin: 0;
    }
    .info-banner {
      background-color: #fee2e2;
      color: #991b1b;
      font-size: 18px;
      font-weight: bold;
      text-align: center;
      padding: 12px;
      margin-bottom: 24px;
    }
    .email-body {
      padding: 32px;
    }
    .greeting {
      font-size: 20px;
      color: #1f2937;
      margin-top: 0;
      margin-bottom: 12px;
      font-weight: bold;
    }
    .text-lead {
      font-size: 16px;
      line-height: 1.6;
      color: #4b5563;
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 16px;
      font-weight: bold;
      color: #1f2937;
      margin-top: 24px;
      margin-bottom: 12px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 6px;
    }
    .detail-row {
      margin-bottom: 8px;
      font-size: 15px;
      line-height: 1.5;
    }
    .detail-label {
      font-weight: bold;
      color: #374151;
      display: inline-block;
      width: 140px;
    }
    .detail-value {
      color: #4b5563;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .button {
      background-color: #4f46e5;
      color: #ffffff !important;
      display: inline-block;
      padding: 14px 30px;
      font-size: 16px;
      font-weight: bold;
      text-align: center;
      text-decoration: none;
      border-radius: 6px;
      box-shadow: 0 4px 6px rgba(79, 70, 229, 0.2);
    }
    .footer {
      background-color: #f9fafb;
      padding: 24px;
      text-align: center;
      border-top: 1px solid #f3f4f6;
    }
    .footer-text {
      font-size: 13px;
      color: #9ca3af;
      margin: 0;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-content">
      <!-- Header -->
      <div class="email-header">
        <h1 class="logo-text">RentMate</h1>
      </div>

      <!-- Info Banner -->
      <div class="info-banner">
        Update on Your Room Request
      </div>

      <!-- Body -->
      <div class="email-body">
        <p class="greeting">Hello ${tenantName},</p>
        <p class="text-lead">Thank you for your interest in the room listed on RentMate.<br>Unfortunately, the owner has declined your request for the following listing.</p>

        <div class="section-title">Listing Details</div>
        <div class="detail-row">
          <span class="detail-label">Title:</span>
          <span class="detail-value">${listingTitle}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Location:</span>
          <span class="detail-value">${location}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Monthly Rent:</span>
          <span class="detail-value">₹${rent}</span>
        </div>

        <div class="section-title">Owner Details</div>
        <div class="detail-row">
          <span class="detail-label">Owner:</span>
          <span class="detail-value">${ownerName}</span>
        </div>

        <p class="text-lead" style="margin-top: 24px;">Don't worry!<br>Many other room listings are available on RentMate that may better match your preferences.</p>
        <p class="text-lead">Log in to continue exploring new rooms and compatible flatmates.</p>
        <p class="text-lead">Thank you for choosing RentMate.</p>
        
        <p class="text-lead" style="margin-bottom: 0;">Regards,<br><strong>RentMate Team</strong></p>

        <!-- Find More Rooms Button -->
        <div class="button-container">
          <a href="${loginUrl}" class="button" target="_blank">Find More Rooms</a>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p class="footer-text">This is an automated notification from RentMate.</p>
        <p class="footer-text" style="margin-top: 6px;">&copy; 2026 RentMate. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  try {
    const info = await transporter!.sendMail({
      from: `"RentMate" <${emailUser}>`,
      to: tenantEmail,
      subject: 'Update on Your Room Request',
      html: htmlContent,
    });
    console.log(`Decline email sent successfully to ${tenantEmail}`);
    console.log(`Nodemailer messageId: ${info?.messageId}`);
  } catch (sendError: any) {
    console.error(`[Tenant Declined Email Error] Failed to send email to ${tenantEmail}:`, sendError);
  }
}
