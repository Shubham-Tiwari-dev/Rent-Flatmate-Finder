import nodemailer from 'nodemailer';

// Helper to get SMTP transporter if configured
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
  }
  return null;
}

/**
 * Sends a notification email or logs it beautifully if SMTP is not configured
 */
export async function sendEmail(to: string, subject: string, htmlContent: string) {
  const transporter = getTransporter();
  const fromAddress = process.env.SMTP_FROM || 'no-reply@rentflatmate.com';

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"Rent & Flatmate Finder" <${fromAddress}>`,
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
 * Send notification to owner about tenant interest and high compatibility
 */
export async function notifyOwnerOfInterest(ownerEmail: string, ownerName: string, listingTitle: string, tenantName: string, compatibilityScore: number) {
  const isHighMatch = compatibilityScore >= 80;
  const matchBadge = isHighMatch 
    ? `<span style="background-color: #22c55e; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;">High AI Match: ${compatibilityScore}%</span>`
    : `<span style="background-color: #3b82f6; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;">AI Compatibility: ${compatibilityScore}%</span>`;

  const subject = isHighMatch 
    ? `🔥 High AI Match! ${tenantName} is interested in your listing: ${listingTitle}`
    : `New Interest Request for ${listingTitle}`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
      <h2 style="color: #4f46e5; margin-bottom: 20px;">Rent & Flatmate Finder</h2>
      <p>Hello <strong>${ownerName}</strong>,</p>
      <p>A tenant named <strong>${tenantName}</strong> has expressed interest in your listing: <strong>${listingTitle}</strong>.</p>
      <div style="margin: 20px 0; padding: 15px; background-color: #f9fafb; border-left: 4px solid #4f46e5; border-radius: 4px;">
        <p style="margin: 0 0 10px 0;"><strong>Match Analysis:</strong></p>
        <p style="margin: 0;">${matchBadge}</p>
      </div>
      <p>Log in to your Dashboard to view their profile, see the detailed AI compatibility breakdown, and accept/reject their request to initiate a secure chat session.</p>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="font-size: 12px; color: #6b7280;">This is an automated notification from Rent & Flatmate Finder platform.</p>
    </div>
  `;

  await sendEmail(ownerEmail, subject, html);
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
