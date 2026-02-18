export type ReportEmailData = {
    ticketNumber: string;
    storeName: string;
    branchName: string;
    submittedBy: string;
    submittedAt: string;
    totalItems: number;
    rusakItems: number;
    bmsItems: number;
    rekananItems: number;
    totalEstimation: number;
};

export function buildReportSubmittedHtml(data: ReportEmailData): string {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(amount);

    return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Laporan Maintenance Baru</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

          <!-- Header: Alfamart Red + Logo -->
          <tr>
            <td style="background-color:#c0392b;padding:20px 32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="${appUrl}/assets/Alfamart-Emblem.png" alt="Alfamart" height="48" style="height:48px;width:auto;display:block;" />
                  </td>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <div style="width:1px;height:36px;background-color:rgba(255,255,255,0.25);"></div>
                  </td>
                  <td style="vertical-align:middle;padding-right:10px;">
                    <img src="${appUrl}/assets/Building-Logo.png" alt="SPARTA" height="36" style="height:36px;width:auto;display:block;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <div style="line-height:1;">
                      <div style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:1.5px;">SPARTA</div>
                      <div style="color:rgba(255,255,255,0.75);font-size:10px;font-weight:300;letter-spacing:0.5px;">Maintenance</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 8px;color:#111827;font-size:18px;font-weight:700;">
                Laporan Maintenance Baru Masuk
              </h2>
              <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
                Sebuah laporan maintenance baru telah disubmit dan memerlukan persetujuan Anda.
              </p>

              <!-- Detail Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr style="background-color:#f9fafb;">
                  <td colspan="2" style="padding:10px 16px;border-bottom:1px solid #e5e7eb;">
                    <p style="margin:0;color:#374151;font-size:13px;font-weight:600;">Detail Laporan</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;width:40%;">Nomor Tiket</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;color:#c0392b;font-size:13px;font-weight:700;letter-spacing:0.5px;">${data.ticketNumber}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;width:40%;">Toko</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;color:#111827;font-size:13px;font-weight:500;">${data.storeName}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">Cabang</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;color:#111827;font-size:13px;font-weight:500;">${data.branchName}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">Disubmit oleh</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;color:#111827;font-size:13px;font-weight:500;">${data.submittedBy}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">Tanggal Submit</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;color:#111827;font-size:13px;font-weight:500;">${data.submittedAt}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">Total Item Dicek</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;color:#111827;font-size:13px;font-weight:500;">${data.totalItems} item</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">Item Rusak</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;color:#c0392b;font-size:13px;font-weight:600;">${data.rusakItems} item</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">Handler BMS</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;color:#111827;font-size:13px;font-weight:500;">${data.bmsItems} item</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">Handler Rekanan</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;color:#111827;font-size:13px;font-weight:500;">${data.rekananItems} item</td>
                </tr>
                ${
                    data.totalEstimation > 0
                        ? `<tr>
                  <td style="padding:12px 16px;color:#6b7280;font-size:13px;">Total Estimasi BMS</td>
                  <td style="padding:12px 16px;color:#c0392b;font-size:14px;font-weight:700;">${formatCurrency(data.totalEstimation)}</td>
                </tr>`
                        : ""
                }
              </table>

              <p style="margin:0 0 8px;color:#374151;font-size:13px;line-height:1.6;">
                Laporan lengkap dalam format PDF terlampir pada email ini. Silakan buka lampiran untuk melihat detail checklist perbaikan.
              </p>
              <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.6;">
                Harap segera melakukan review dan approval terhadap laporan ini.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;">
              <p style="margin:0;color:#9ca3af;font-size:11px;text-align:center;">
                Email ini dikirim secara otomatis oleh sistem SPARTA Maintenance. Jangan balas email ini.
              </p>
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
