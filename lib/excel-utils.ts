import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface ExportData {
    metrics: any;
    trends: any;
    month: number;
    year: number;
    hospital: { name: string };
    metadata: Record<string, any>;
}

export const exportQualityToExcel = async (data: ExportData) => {
    const { metrics, trends, month, year, hospital, metadata } = data;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Quality Indicators');

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthName = monthNames[month - 1];

    // --- 1. Report Titles ---
    const titleRow = sheet.addRow(['HOSPITAL QUALITY PERFORMANCE REPORT']);
    titleRow.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF1F4E78' } };
    titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.mergeCells('A1:E1');
    titleRow.height = 30;

    const orgRow = sheet.addRow([hospital.name]);
    orgRow.font = { name: 'Calibri', size: 12, bold: true };
    orgRow.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.mergeCells('A2:E2');

    const periodRow = sheet.addRow([`Audit Period: ${monthName} ${year}`]);
    periodRow.font = { name: 'Calibri', size: 11, italic: true };
    periodRow.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.mergeCells('A3:E3');

    sheet.addRow([]); // Spacer

    // --- 2. Summary Info ---
    const summaryHeader = sheet.addRow(['QUALITY SUMMARY', '', '', '', '']);
    summaryHeader.font = { name: 'Calibri', bold: true, size: 10 };
    summaryHeader.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    sheet.mergeCells(`A${summaryHeader.number}:E${summaryHeader.number}`);

    const complianceRow = sheet.addRow(['Overall Compliance Score', '', '', '', `${metrics?.complianceScore || 0}%`]);
    const gapsRow = sheet.addRow(['Total Data Gaps', '', '', '', (metrics?.dataGaps?.missingDiagnoses || 0) + (metrics?.dataGaps?.untrackedInfections || 0)]);
    const statusRow = sheet.addRow(['Report Status', '', '', '', metrics?.status === 'locked' ? 'FINALIZED' : 'OPEN']);

    [complianceRow, gapsRow, statusRow].forEach(row => {
        row.getCell(1).font = { name: 'Calibri', bold: true, color: { argb: 'FF475569' } };
        row.getCell(5).font = { name: 'Calibri', bold: true };
        row.getCell(5).alignment = { horizontal: 'right' };
        sheet.mergeCells(`A${row.number}:D${row.number}`);
    });

    sheet.addRow([]); // Spacer

    // --- 3. Main Metrics Table ---
    const headerRow = sheet.addRow(['INDICATOR NAME', 'DEFINITION', 'TARGET', 'ACTUAL VALUE', 'COMPLIANCE']);
    headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
        cell.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FF0070C0' } },
            left: { style: 'thin', color: { argb: 'FF0070C0' } },
            bottom: { style: 'thin', color: { argb: 'FF0070C0' } },
            right: { style: 'thin', color: { argb: 'FF0070C0' } }
        };
    });

    const indicators = [
        { id: 'opdWaitingTime', label: 'OPD Wait Time', target: '< 30 min', unit: 'min' },
        { id: 'bedOccupancyRate', label: 'Bed Occupancy', target: '80-90%', unit: '%' },
        { id: 'alos', label: 'Avg Length of Stay', target: '< 5 days', unit: 'days' },
        { id: 'billingTat', label: 'Billing TAT', target: '< 180 min', unit: 'min' },
        { id: 'incidentRate', label: 'Incident Rate', target: '< 1.0‰', unit: '‰' },
        { id: 'readmissionRate', label: 'Readmission Rate', target: '< 5%', unit: '%' }
    ];

    indicators.forEach(ind => {
        const val = metrics?.indicators?.[ind.id] || 0;
        const meta = metadata[ind.id] || {};

        let status = 'COMPLIANT';
        let isSuccess = true;

        if (ind.id === 'opdWaitingTime') isSuccess = val < 30;
        else if (ind.id === 'bedOccupancyRate') {
            isSuccess = val > 80;
            status = isSuccess ? 'OPTIMAL' : 'LOW';
        }
        else if (ind.id === 'alos') isSuccess = val < 5;
        else if (ind.id === 'billingTat') isSuccess = val < 180;
        else if (ind.id === 'incidentRate') isSuccess = val < 1;
        else if (ind.id === 'readmissionRate') isSuccess = val < 5;

        if (!isSuccess && ind.id !== 'bedOccupancyRate') status = 'NON-COMPLIANT';

        const row = sheet.addRow([
            ind.label,
            meta.definition || '',
            ind.target,
            `${val} ${ind.unit}`,
            status
        ]);

        row.eachCell((cell, colNumber) => {
            cell.font = { name: 'Calibri', size: 9 };
            cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 ? 'left' : 'center' };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FF0070C0' } },
                left: { style: 'thin', color: { argb: 'FF0070C0' } },
                bottom: { style: 'thin', color: { argb: 'FF0070C0' } },
                right: { style: 'thin', color: { argb: 'FF0070C0' } }
            };

            if (colNumber === 5) {
                cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: isSuccess ? 'FF059669' : 'FFDC2626' } };
            }
        });
    });

    sheet.addRow([]); // Spacer

    // --- 4. Historical Trends ---
    const trendTitleRow = sheet.addRow(['HISTORICAL PERFORMANCE TRENDS']);
    trendTitleRow.font = { name: 'Calibri', bold: true, color: { argb: 'FF1F4E78' } };
    sheet.mergeCells(`A${trendTitleRow.number}:E${trendTitleRow.number}`);

    const trendHeader = sheet.addRow(['MONTH', 'OCCUPANCY %', 'ALOS (DAYS)', 'WAIT TIME (MIN)', 'AUDIT STATUS']);
    trendHeader.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
        cell.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FF0070C0' } },
            left: { style: 'thin', color: { argb: 'FF0070C0' } },
            bottom: { style: 'thin', color: { argb: 'FF0070C0' } },
            right: { style: 'thin', color: { argb: 'FF0070C0' } }
        };
    });

    if (trends?.data?.trends) {
        trends.data.trends.forEach((t: any) => {
            const row = sheet.addRow([
                (t.label || t.month).toUpperCase(),
                t.bedOccupancyRate || 0,
                t.alos || 0,
                t.opdWaitingTime || 0,
                'AUDITED'
            ]);
            row.eachCell((cell) => {
                cell.font = { name: 'Calibri', size: 9 };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FF0070C0' } },
                    left: { style: 'thin', color: { argb: 'FF0070C0' } },
                    bottom: { style: 'thin', color: { argb: 'FF0070C0' } },
                    right: { style: 'thin', color: { argb: 'FF0070C0' } }
                };
            });
        });
    }

    // --- Column Widths ---
    sheet.getColumn(1).width = 25;
    sheet.getColumn(2).width = 45;
    sheet.getColumn(3).width = 15;
    sheet.getColumn(4).width = 15;
    sheet.getColumn(5).width = 18;

    // --- Save File ---
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Quality_Report_${monthName}_${year}.xlsx`);
};
