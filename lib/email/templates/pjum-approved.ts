/**
 * HTML email template for PJUM approval notification to Branch Admin.
 */
export function buildPjumApprovedHtml(params: {
    bmsName: string;
    weekNumber: number;
    monthName: string;
    year: number;
    branchName: string;
}): string {
    return `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
    <div style="background-color: #ffffff; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h2 style="color: #1a1a1a; margin-top: 0;">PJUM Telah Disetujui</h2>
        
        <p>PJUM berikut telah disetujui oleh BnM Manager dan siap untuk dicetak:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
                <td style="padding: 8px 0; color: #666;">BMS</td>
                <td style="padding: 8px 0; font-weight: 600;">${params.bmsName}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #666;">Periode</td>
                <td style="padding: 8px 0; font-weight: 600;">Minggu ke-${params.weekNumber} ${params.monthName} ${params.year}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #666;">Cabang</td>
                <td style="padding: 8px 0; font-weight: 600;">${params.branchName}</td>
            </tr>
        </table>
        
        <p style="color: #666; font-size: 14px;">
            File PDF terlampir pada email ini. Silakan cetak dan proses sesuai SOP.
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        
        <p style="color: #999; font-size: 12px; margin-bottom: 0;">
            Email ini dikirim otomatis oleh sistem SPARTA Maintenance.
        </p>
    </div>
</body>
</html>
    `.trim();
}
