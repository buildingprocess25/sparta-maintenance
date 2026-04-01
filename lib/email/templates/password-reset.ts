/**
 * HTML email template for password reset request.
 */
export function buildPasswordResetHtml(params: {
    userName: string;
    resetUrl: string;
}): string {
    const { userName, resetUrl } = params;

    return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Password SPARTA</title>
</head>
<body style="margin:0;padding:0;background:#f6f8fb;font-family:Arial,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:20px 24px;background:#111827;color:#ffffff;font-size:18px;font-weight:700;">
              SPARTA Maintenance
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Halo ${userName},</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
                Kami menerima permintaan lupa password untuk akun Anda.
                Klik tombol di bawah ini untuk reset password.
              </p>

              <p style="margin:0 0 20px;">
                <a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;">
                  Reset Password
                </a>
              </p>

              <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#4b5563;">
                Link ini berlaku selama 30 menit.
              </p>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#4b5563;word-break:break-all;">
                Jika tombol tidak berfungsi, buka link berikut:<br/>
                <a href="${resetUrl}">${resetUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;background:#f9fafb;font-size:12px;color:#6b7280;line-height:1.6;">
              Jika Anda tidak meminta reset password, abaikan email ini.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}
