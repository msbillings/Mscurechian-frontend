import { formatPatientNameWithPrefix } from '@/lib/utils/name-utils';

export const numberToWords = (num: number): string => {
    if (num === 0) return "Zero Only";
    const a = [
      "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ",
      "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "
    ];
    const b = [
      "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
    ];

    const inWords = (n: any): string => {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
      if (n < 1000) return a[Math.floor(n / 100)] + "Hundred " + (n % 100 !== 0 ? "and " + inWords(n % 100) : "");
      if (n < 100000) return inWords(Math.floor(n / 1000)) + "Thousand " + (n % 1000 !== 0 ? inWords(n % 1000) : "");
      if (n < 10000000) return inWords(Math.floor(n / 100000)) + "Lakh " + (n % 100000 !== 0 ? inWords(n % 100000) : "");
      return inWords(Math.floor(n / 10000000)) + "Crore " + (n % 10000000 !== 0 ? inWords(n % 10000000) : "");
    };

    return inWords(num).trim() + " Rupees Only";
};

const formatDate = (d: any) => {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Format: 27-Apr-2026 19:30
    return `${String(date.getDate()).padStart(2, '0')}-${months[date.getMonth()]}-${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export const generateTransactionReportHTML = (
    hospital: any,
    patient: any,
    admission: any,
    reportData: any,
    totals: any,
    printConfig: any
) => {
    const fmt = (num: number) => Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    // Generate Invoice/Bill No (Fallback if not provided)
    const invoiceNo = `K-PRB${new Date().getTime().toString().slice(-8)}`;

    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>IP Interim Bill - Detailed</title>
        <style>
            @page {
                size: A4;
                margin: 10mm 15mm;
                @bottom-right {
                    content: "Page " counter(page) " of " counter(pages);
                }
            }
            body { 
                font-family: Arial, Helvetica, sans-serif; 
                color: #000; 
                font-size: 11px;
                line-height: 1.3;
                margin: 0;
                padding: 0;
            }
            * { box-sizing: border-box; }
            .header-container { text-align: center; margin-bottom: 5px; }
            .hospital-name { font-size: 20px; font-weight: bold; text-transform: uppercase; margin: 0; }
            .hospital-sub { font-size: 11px; margin: 2px 0; }
            
            .title-bar {
                text-align: center;
                border-top: 1px solid #000;
                border-bottom: 1px solid #000;
                padding: 3px 0;
                font-weight: bold;
                font-size: 13px;
                background-color: #f8f8f8;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .subtitle-bar {
                text-align: center;
                border-bottom: 1px solid #000;
                padding: 3px 0;
                font-weight: bold;
                font-size: 13px;
                background-color: #f8f8f8;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }

            .info-grid { width: 100%; border-bottom: 1px solid #000; font-size: 11px; padding: 4px 0; }
            .info-grid td { vertical-align: top; padding: 1px; }
            .info-label { width: 120px; }
            
            .data-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 5px; }
            .data-table th { 
                border-top: 1px solid #000; 
                border-bottom: 1px solid #000; 
                padding: 4px; 
                text-align: left;
                font-weight: bold;
            }
            .data-table th.right { text-align: right; }
            .data-table td { padding: 3px 4px; vertical-align: top; }
            .data-table td.right { text-align: right; }
            .data-table td.center { text-align: center; }
            
            .cat-header { 
                font-weight: bold; 
                color: #000080; /* Dark blue from reference */
                padding-top: 8px !important;
                padding-bottom: 4px !important;
            }
            .subtotal-row { border-top: 1px solid #000; border-bottom: 1px solid #000; font-weight: bold; }
            .subtotal-row td { padding: 4px; }
            
            .summary-section { margin-top: 10px; width: 100%; border-top: 2px solid #000; padding-top: 10px; display: flex; justify-content: space-between; }
            .words { font-weight: bold; width: 60%; }
            .totals-box { width: 35%; }
            .totals-box table { width: 100%; border-collapse: collapse; font-size: 11px; font-weight: bold; }
            .totals-box table td { padding: 3px; }
            .totals-box table td:last-child { text-align: right; }
            
            .receipt-section { margin-top: 15px; width: 100%; }
            .receipt-section h4 { margin: 0 0 5px 0; font-size: 12px; font-weight: bold; }
            
            .footer { margin-top: 60px; display: flex; justify-content: space-between; font-weight: bold; font-size: 11px; }
            .footer-bottom { margin-top: 20px; display: flex; justify-content: space-between; font-size: 10px; }
        </style>
    </head>
    <body>
        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px;">
            <div style="width: 25%;">
                ${hospital.logo ? `<img src="${hospital.logo}" style="max-height: 80px; max-width: 100%;" />` : ''}
            </div>
            <div style="width: 50%; text-align: center;">
                <h1 class="hospital-name">${hospital.name}</h1>
                <p class="hospital-sub">${hospital.address}</p>
                <p class="hospital-sub">Phone: ${hospital.phone || hospital.mobile || ''}</p>
            </div>
            <div style="width: 25%;"></div>
        </div>
        
        <div class="title-bar">IP Interim Bill-Detailed</div>
        <div class="subtitle-bar">BILL OF SUPPLY / INVOICE NO : ${invoiceNo}</div>
        
        <table class="info-grid">
            <tr>
                <td style="width: 50%;">
                    <table style="width: 100%; border: none;">
                        <tr><td class="info-label">CIN No</td><td>: </td></tr>
                        <tr><td class="info-label">Patient Name</td><td>: <b>${formatPatientNameWithPrefix(patient.name || patient.user?.name, patient.profile?.prefix || patient.prefix)}</b></td></tr>
                        <tr><td class="info-label">Age/Sex</td><td>: ${patient.age || ''}Y / ${patient.gender || ''}</td></tr>
                        <tr><td class="info-label">S/W/D</td><td>: ${patient.guardianName || ''}</td></tr>
                        <tr><td class="info-label">Doctor</td><td>: ${admission?.doctorName || ''}</td></tr>
                        <tr><td class="info-label">Admission Dt</td><td>: ${formatDate(admission?.admissionDate)}</td></tr>
                        <tr><td class="info-label">Organization</td><td>: </td></tr>
                        <tr><td class="info-label">Patient Type</td><td>: Cash</td></tr>
                        <tr><td class="info-label">Secondary Dr.</td><td>: </td></tr>
                        <tr><td class="info-label">Address</td><td>: ${patient.address || ''}</td></tr>
                        <tr><td class="info-label">Referal By</td><td>: </td></tr>
                    </table>
                </td>
                <td style="width: 50%;">
                    <table style="width: 100%; border: none;">
                        <tr><td class="info-label">GST No</td><td>: ${hospital.gstNumber || ''}</td></tr>
                        <tr><td class="info-label">IP No</td><td>: ${admission?.admissionId || ''}</td></tr>
                        <tr><td class="info-label">UMR No</td><td>: ${patient.mrn || ''}</td></tr>
                        <tr><td class="info-label">Bill No</td><td>: ${invoiceNo}</td></tr>
                        <tr><td class="info-label">Bill Dt</td><td>: ${formatDate(new Date())}</td></tr>
                        <tr><td class="info-label">Discharge Type</td><td>: </td></tr>
                        <tr><td class="info-label">Discharge Dt&Tm</td><td>: ${formatDate(admission?.dischargeDate)}</td></tr>
                        <tr><td class="info-label">Ward</td><td>: ${admission?.wardName || ''}</td></tr>
                        <tr><td class="info-label">Bed No</td><td>: ${admission?.bedNumber || ''}</td></tr>
                        <tr><td class="info-label">Phone No</td><td>: ${patient.mobile || ''}</td></tr>
                    </table>
                </td>
            </tr>
        </table>

        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 5%">S.No</th>
                    <th style="width: 15%">Code</th>
                    <th style="width: 45%">Service Name</th>
                    <th class="right" style="width: 10%">Rate</th>
                    <th class="right" style="width: 10%">Qty</th>
                    <th class="right" style="width: 15%">Amount</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Render logic for categories
    let sNo = 1;

    const renderRows = (items: any[], title: string) => {
        if (!items || items.length === 0) return '';
        let rowHtml = `<tr><td colspan="6" class="cat-header">${title}</td></tr>`;
        let subtotal = 0;
        
        items.forEach((item, idx) => {
            const amount = item.amount || (item.rate * (item.quantity || item.visits || item.days || 1));
            subtotal += amount;
            rowHtml += `
                <tr>
                    <td class="center">${idx + 1}</td>
                    <td>${item.code || ''}</td>
                    <td>${item.serviceName || item.doctorName || item.testName || item.chargeType || item.medicineName || 'Service'}</td>
                    <td class="right">${fmt(item.rate)}</td>
                    <td class="right">${fmt(item.quantity || item.visits || item.days || 1)}</td>
                    <td class="right">${fmt(amount)}</td>
                </tr>
            `;
        });
        
        rowHtml += `
            <tr class="subtotal-row">
                <td colspan="5" class="right">Sub Total :</td>
                <td class="right">${fmt(subtotal)}</td>
            </tr>
        `;
        return rowHtml;
    };

    if (printConfig.consultations) html += renderRows(reportData.doctors, 'Consultation Charges');
    if (printConfig.investigations) html += renderRows(reportData.diags, 'INVESTIGATION CHARGES');
    if (printConfig.wards) html += renderRows(reportData.admissions, 'Ward Charges');
    
    // Add radiology if present and enabled
    if (printConfig.radiology) {
        const rads = reportData.rads || [];
        html += renderRows(rads, 'Radiology Charges');
    }
    
    if (printConfig.services) html += renderRows(reportData.services, 'SERVICE CHARGES');
    if (printConfig.pharmacy) html += renderRows(reportData.meds, 'PHARMACY CHARGES');

    html += `
            </tbody>
        </table>
        
        <div class="summary-section">
            <div class="words">
                Rupees In : ${numberToWords(totals.balance > 0 ? totals.balance : totals.grandTotal)}
                <br/><br/>
                <span style="font-weight: normal;">Reason : </span>
            </div>
            <div class="totals-box">
                <table>
                    <tr><td>Grand Total :</td><td>${fmt(totals.grandTotal)}</td></tr>
                    <tr><td>Net Amt :</td><td>${fmt(totals.grandTotal - (totals.discount || 0))}</td></tr>
                    <tr><td>Paid Amt :</td><td>${fmt(totals.totalPaid)}</td></tr>
                    <tr><td>Balance Amt :</td><td>${fmt(totals.balance)}</td></tr>
                </table>
            </div>
        </div>
    `;

    if (printConfig.receipts && reportData.payments && reportData.payments.length > 0) {
        html += `
            <div class="receipt-section">
                <div style="border-bottom: 1px solid #000; font-weight: bold; margin-bottom: 5px;">Receipt Details :</div>
                <table class="data-table" style="margin-top: 0; border: none;">
                    <thead>
                        <tr style="border:none; border-bottom: 1px solid #000;">
                            <th style="border:none;">S.No</th>
                            <th style="border:none;">Record Date</th>
                            <th style="border:none;">Receipt No</th>
                            <th style="border:none;" class="right">Amount Payment</th>
                            <th style="border:none;">Type</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        let receiptTotal = 0;
        reportData.payments.forEach((p: any, idx: number) => {
            if (p.status === 'Paid' || p.status === 'Completed') {
                receiptTotal += p.amount;
                html += `
                    <tr>
                        <td class="center">${idx + 1}</td>
                        <td>${p.date || formatDate(new Date())}</td>
                        <td>${p.receiptNo}</td>
                        <td class="right">${fmt(p.amount)}</td>
                        <td>${p.mode || 'Advance'}</td>
                    </tr>
                `;
            }
        });
        
        html += `
                    <tr class="subtotal-row">
                        <td colspan="3" class="right" style="border:none; border-top:1px solid #000; border-bottom:1px solid #000;">Total :</td>
                        <td class="right" style="border:none; border-top:1px solid #000; border-bottom:1px solid #000;">${fmt(receiptTotal)}</td>
                        <td style="border:none; border-top:1px solid #000; border-bottom:1px solid #000;"></td>
                    </tr>
                </tbody>
            </table>
        </div>
        `;
    }

    html += `
        <div style="margin-top: 30px; border-top: 1px solid #000; width: 40%; margin-left: 30%;"></div>
        
        <div class="footer">
            <div style="text-align: center;">Patient/Attendant Signatory</div>
            <div style="text-align: center;">
                <br/>
                Authorised Signatory
            </div>
        </div>
        
        <div class="footer-bottom">
            <div>Printed Dt & Time : ${formatDate(new Date())}</div>
        </div>
    </body>
    </html>
    `;

    return html;
};
