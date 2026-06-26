import type { Candidate, Env } from "./types";

export interface InviteResult {
  success: boolean;
  error?: string;
}

export class InviteSender {
  private env: Env;
  private readonly FROM_EMAIL = "recruitment@lightstory.com";
  private readonly FROM_NAME = "Light Story Team";

  constructor(env: Env) {
    this.env = env;
  }

  async sendInvite(candidate: Candidate, inviteCode: string): Promise<InviteResult> {
    try {
      const inviteUrl = `https://lightstory.com/recruitment/invite/${inviteCode}`;
      const recipientName = candidate.creatorName || candidate.creatorHandle || "Creator";

      if (!candidate.creatorHandle && !candidate.creatorName) {
        return { success: false, error: "No email or contact info available for this candidate" };
      }

      await this.env.SEND_EMAIL_BINDING.send({
        from: { name: this.FROM_NAME, email: this.FROM_EMAIL },
        to: [{ name: recipientName, email: `${candidate.creatorHandle}@placeholder.com` }],
        subject: `You're Invited! Join Light Story as a Creator`,
        html: this.buildHtmlTemplate(recipientName, inviteUrl),
        text: this.buildTextTemplate(recipientName, inviteUrl),
      });

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return { success: false, error: message };
    }
  }

  private buildHtmlTemplate(name: string, inviteUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:40px 30px;text-align:center;">
              <h1 style="color:#ffffff;font-size:28px;margin:0;font-weight:700;">Light Story</h1>
              <p style="color:rgba(255,255,255,0.9);font-size:16px;margin:8px 0 0;">Creator Invitation</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 30px;">
              <h2 style="color:#333;font-size:22px;margin:0 0 16px;">Hello ${this.escapeHtml(name)},</h2>
              <p style="color:#666;font-size:16px;line-height:1.6;margin:0 0 16px;">
                We've been impressed by your work and would love to invite you to join 
                <strong>Light Story</strong> — a growing platform for comic and manga creators.
              </p>
              <p style="color:#666;font-size:16px;line-height:1.6;margin:0 0 24px;">
                As a Light Story creator, you'll get:
              </p>
              <ul style="color:#666;font-size:15px;line-height:1.6;padding-left:20px;margin:0 0 24px;">
                <li>A dedicated portfolio page for your work</li>
                <li>Built-in audience discovery tools</li>
                <li>Monetization options for your comics</li>
                <li>Analytics dashboard for your content</li>
                <li>Direct engagement with your readers</li>
              </ul>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td align="center" style="border-radius:8px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);">
                    <a href="${this.escapeHtml(inviteUrl)}" target="_blank" style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:8px;">
                      Accept Your Invitation
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#999;font-size:13px;line-height:1.5;margin:24px 0 0;text-align:center;">
                This invitation link expires in 30 days.<br>
                If you didn't expect this invitation, please ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#fafafa;padding:20px 30px;text-align:center;border-top:1px solid #eee;">
              <p style="color:#999;font-size:12px;margin:0;">
                &copy; 2026 Light Story. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildTextTemplate(name: string, inviteUrl: string): string {
    return `Hello ${name},

We've been impressed by your work and would love to invite you to join Light Story — a growing platform for comic and manga creators.

As a Light Story creator, you'll get:
- A dedicated portfolio page for your work
- Built-in audience discovery tools
- Monetization options for your comics
- Analytics dashboard for your content
- Direct engagement with your readers

Accept your invitation here: ${inviteUrl}

This invitation link expires in 30 days.
If you didn't expect this invitation, please ignore this email.

- Light Story Team`;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
