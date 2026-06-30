import { format } from "date-fns";

function numberToWords(num: number): string {
    const a = [
        "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ", "Eleven ",
        "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen ",
    ];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    if ((num = num.toString().replace(/[\, ]/g, "") as any) != parseFloat(num as any)) return "Not a Number";
    let n = ("000000000" + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return "";
    let str = "";
    str += n[1] != "00" ? (a[Number(n[1])] || b[n[1][0] as any] + " " + a[n[1][1] as any]) + "Crore " : "";
    str += n[2] != "00" ? (a[Number(n[2])] || b[n[2][0] as any] + " " + a[n[2][1] as any]) + "Lakh " : "";
    str += n[3] != "00" ? (a[Number(n[3])] || b[n[3][0] as any] + " " + a[n[3][1] as any]) + "Thousand " : "";
    str += n[4] != "0" ? (a[Number(n[4])] || b[n[4][0] as any] + " " + a[n[4][1] as any]) + "Hundred " : "";
    str += n[5] != "00" ? (str != "" ? "and " : "") + (a[Number(n[5])] || b[n[5][0] as any] + " " + a[n[5][1] as any]) : "";
    return str.trim();
}

export const printIPDLedger = (summary: any, hospitalDetails?: any) => {
    // Determine components
    const patientName = summary?.patientName || "Unknown Patient";
    const admissionId = summary?.admissionId || "N/A";
    
    // Extract items by category
    const extraItems = summary?.extraCharges?.items || [];
    const bedItems = summary?.bedCharges?.items || [];
    const advanceItems = summary?.advances || [];
    const financials = summary?.financials || { totalAdvance: 0, balance: 0, discount: 0 };
    
    const categories: any = [
        { name: 'Consultation Charges', items: [], total: 0 },
        { name: 'INVESTIGATION CHARGES', items: [], total: 0 },
        { name: 'Ward Charges', items: [], total: 0 },
        { name: 'Radiology Charges', items: [], total: 0 },
        { name: 'SERVICE CHARGES', items: [], total: 0 },
        { name: 'PHARMACY CHARGES', items: [], total: 0 },
    ];

    extraItems.forEach((item: any) => {
        if (item.status === 'Reversed') return; 
        
        let targetCategory = 'SERVICE CHARGES';
        if (['Doctor Fee', 'Consultation'].includes(item.category)) {
            targetCategory = 'Consultation Charges';
        } else if (['Lab', 'Diagnostics'].includes(item.category)) {
            targetCategory = 'INVESTIGATION CHARGES';
        } else if (['Pharmacy', 'Medicine'].includes(item.category)) {
            targetCategory = 'PHARMACY CHARGES';
        } else if (['Radiology'].includes(item.category)) {
            targetCategory = 'Radiology Charges';
        }

        const catIndex = categories.findIndex((c: any) => c.name === targetCategory);
        if (catIndex > -1) {
            // ── PHARMACY: Expand nested medicines into individual rows ──
            if (targetCategory === 'PHARMACY CHARGES' && item.medicines && Array.isArray(item.medicines) && item.medicines.length > 0) {
                item.medicines.forEach((med: any) => {
                    const medAmount = med.amount || (parseFloat(med.quantity || '1') * (med.rate || med.price || 0));
                    categories[catIndex].items.push({
                        code: item._id?.toString()?.substring(0, 7).toUpperCase() || 'ITEM' + Math.floor(Math.random() * 9000 + 1000),
                        name: med.medicineName || med.name || 'Unknown Medicine',
                        rate: med.rate || med.price || medAmount,
                        qty: med.quantity || 1,
                        amount: medAmount
                    });
                    categories[catIndex].total += medAmount;
                });
                return; // Skip the lump-sum parent entry
            }

            // ── LAB: Expand nested tests into individual rows ──
            if (targetCategory === 'INVESTIGATION CHARGES' && item.tests && Array.isArray(item.tests) && item.tests.length > 0) {
                // If we have individual test prices, use them; otherwise divide total evenly
                const totalAmount = item.amount || 0;
                const testCount = item.tests.length;
                item.tests.forEach((test: any, tIdx: number) => {
                    const testName = typeof test === 'string' ? test : (test.testName || test.test || test.name || 'Unknown Test');
                    const testPrice = (typeof test === 'object' && test.price) ? test.price : (totalAmount / testCount);
                    categories[catIndex].items.push({
                        code: item._id?.toString()?.substring(0, 7).toUpperCase() || 'SER' + Math.floor(Math.random() * 9000 + 1000),
                        name: testName,
                        rate: testPrice,
                        qty: 1,
                        amount: testPrice
                    });
                    categories[catIndex].total += testPrice;
                });
                return; // Skip the lump-sum parent entry
            }

            // ── DEFAULT: Single line item (Consultation, Service, Radiology, etc.) ──
            categories[catIndex].items.push({
                code: item.code || item._id?.toString()?.substring(0, 7).toUpperCase() || 'SER' + Math.floor(Math.random() * 900 + 100),
                name: item.description || item.category,
                rate: item.amount || 0,
                qty: item.quantity || 1,
                amount: item.amount || 0
            });
            categories[catIndex].total += (item.amount || 0);
        }
    });

    bedItems.forEach((item: any) => {
        const catIndex = categories.findIndex((c: any) => c.name === 'Ward Charges');
        categories[catIndex].items.push({
            code: 'SG' + Math.floor(Math.random() * 900 + 1000), 
            name: `${item.type} CHARGES`,
            rate: item.rate,
            qty: Math.ceil(item.days || 1),
            amount: item.charge
        });
        categories[catIndex].total += (item.charge || 0);
    });

    const activeCategories = categories.filter((c: any) => c.items.length > 0);

    // Calculate Totals
    const totalCharges = activeCategories.reduce((sum: number, cat: any) => sum + cat.total, 0);
    const totalDeposits = financials.totalAdvance || 0;
    const discount = financials.discount || 0;
    const returnCredits = financials.returnCredits || 0;
    
    const netBill = Math.max(0, totalCharges - returnCredits - discount);
    const balanceDue = Math.max(0, netBill - totalDeposits);

    // Static / Map Fields
    const cinNo = hospitalDetails?.cinNo || "U85110TG2009PTC063748";
    const gstNo = hospitalDetails?.gstNumber || "37AAQCS4714G2Z1";
    const ipNo = admissionId;
    const ageSex = `${summary?.patientAge || '25Y(s)'} / ${summary?.patientGender || 'Male'}`;
    const umrNo = summary?.mrn || "K-MR26000811";
    const billNo = "K-PRB" + Math.floor(Math.random() * 9000000 + 1000000);
    const billDt = format(new Date(), 'dd-MMM-yyyy');
    const doctor = summary?.primaryDoctor?.name || 'Dr. ISRAEL RAMANATHAN';
    const admissionDt = summary?.admissionDate ? format(new Date(summary.admissionDate), 'dd-MMM-yyyy HH:mm') : 'N/A';
    const dischargeType = summary?.status === 'Discharged' ? 'Regular' : '';
    const org = summary?.organization || '';
    const dischargeDtTm = summary?.status === 'Discharged' ? format(new Date(summary.updatedAt || new Date()), 'dd-MMM-yyyy HH:mm') : '';
    const patientType = 'Cash';
    const ward = bedItems.length > 0 ? bedItems[bedItems.length - 1].type : 'GENERAL WARD';
    const bedNo = bedItems.length > 0 ? bedItems[bedItems.length - 1].bedId : 'ISOLATION GW1';
    const secondaryDr = doctor;
    const address = summary?.patientAddress || "BADVEL KOTHA CHERRUV";
    const phoneNo = summary?.patientContact || "9346897470";
    const referalBy = "DR.V.GOPALA KRISHNAIAH (BADVEL)";

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>IP Interim Bill - ${patientName}</title>
        <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; color: #000; font-size: 10px; line-height: 1.3; }
            * { box-sizing: border-box; }
            
            /* Header */
            .header-table { width: 100%; text-align: center; margin-bottom: 5px; }
            .header-logo { max-height: 60px; width: auto; object-fit: contain; }
            .header-table h1 { margin: 0; font-size: 18px; font-weight: bold; text-transform: uppercase; }
            .header-table p { margin: 2px 0; font-size: 10px; }
            
            .bill-title { text-align: center; font-size: 12px; font-weight: bold; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 0; margin-bottom: 2px; }

            /* Patient Info Table - STRICT borders */
            .patient-info-table { width: 100%; border-collapse: collapse; font-size: 10px; border: 1px solid #000; }
            .patient-info-table td { padding: 2px 4px; vertical-align: top; }
            .lbl { width: 80px; }
            .cln { width: 10px; text-align: center; }
            .val { font-weight: bold; }

            /* Main Table */
            table.main-table { width: 100%; border-collapse: collapse; margin-top: 5px; border-bottom: 1px solid #000; font-size: 10px; }
            table.main-table thead { display: table-header-group; }
            table.main-table th { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 2px; font-weight: bold; text-align: left; }
            table.main-table th.right, table.main-table td.right { text-align: right; }
            table.main-table td { padding: 2px; }

            .cat-header { color: #0000cd; font-weight: bold; text-transform: uppercase; padding-top: 6px; font-size: 10px; }
            .cat-subtotal { border-top: 1px dashed #ccc; font-weight: bold; color: #0000cd; }
            .cat-subtotal td { padding: 3px 2px; }
            .cat-subtotal td.right { color: #0000cd; }

            /* Footer Table Layout */
            .footer-table { width: 100%; border-collapse: collapse; margin-top: 0; border: 1px solid #000; border-top: none; }
            .footer-table td { padding: 4px; vertical-align: top; }
            
            .totals-table { width: 100%; border-collapse: collapse; font-size: 10px; font-weight: bold; text-align: right; }
            .totals-table td { padding: 2px; }
            
            .receipt-table { width: 100%; border-collapse: collapse; font-size: 9px; margin-top: 5px; }
            .receipt-table th { border-top: 1px solid #000; border-bottom: 1px solid #000; text-align: left; padding: 2px; font-weight: bold; }
            .receipt-table td { padding: 2px; }
            
            .sign-table { width: 100%; margin-top: 40px; font-weight: bold; font-size: 10px; text-align: center; border-collapse: collapse; }
            
            .print-time { font-size: 9px; font-weight: bold; margin-top: 15px; }
            
            @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                ${!require('@/stores/printStore').usePrintStore.getState().printWithHeader ? `
                .header-table { display: none !important; }
                ` : ''}
            }
        </style>
    </head>
    <body>
        <table class="header-table">
            <tr>
                <td style="width: 20%; text-align: left;">
                    ${hospitalDetails?.logo ? `<img src="${hospitalDetails.logo}" class="header-logo" />` : ''}
                </td>
                <td style="width: 60%; text-align: center;">
                    <h1>${hospitalDetails?.name || 'SRI SRI HOLISTIC HOSPITALS'}</h1>
                    <p>(A unit of sree ramachandra healthservices pvt Ltd)</p>
                    <p>${hospitalDetails?.address || '#3/223,228 and 229, Christian Line Rd, beside NTR statue,'}</p>
                    <p>Kadapa, Andhra Pradesh - 516001.</p>
                    <p>Phone ,FAX: ${hospitalDetails?.phone || '08562-244455'}</p>
                </td>
                <td style="width: 20%;"></td>
            </tr>
        </table>
        
        <div class="bill-title">${summary?.isBillLocked ? 'IP Final Bill-Detailed' : 'IP Interim Bill-Detailed'}</div>

        <table class="patient-info-table">
            <tr>
                <td class="lbl">CIN No</td><td class="cln">:</td><td class="val">${cinNo}</td>
                <td class="lbl">GST No</td><td class="cln">:</td><td class="val">${gstNo}</td>
            </tr>
            <tr>
                <td class="lbl">Patient Name</td><td class="cln">:</td><td class="val">${patientName}</td>
                <td class="lbl">IP No</td><td class="cln">:</td><td class="val">${ipNo}</td>
            </tr>
            <tr>
                <td class="lbl">Age/Sex</td><td class="cln">:</td><td class="val">${ageSex}</td>
                <td class="lbl">UMR No</td><td class="cln">:</td><td class="val">${umrNo}</td>
            </tr>
            <tr>
                <td class="lbl">S/W/D</td><td class="cln">:</td><td class="val"></td>
                <td class="lbl">Bill No</td><td class="cln">:</td><td class="val">${billNo}</td>
            </tr>
            <tr>
                <td class="lbl">Doctor</td><td class="cln">:</td><td class="val">${doctor}</td>
                <td class="lbl">Bill Dt</td><td class="cln">:</td><td class="val">${billDt}</td>
            </tr>
            <tr>
                <td class="lbl">Admission Dt</td><td class="cln">:</td><td class="val">${admissionDt}</td>
                <td class="lbl">Discharge Type</td><td class="cln">:</td><td class="val">${dischargeType}</td>
            </tr>
            <tr>
                <td class="lbl">Organization</td><td class="cln">:</td><td class="val">${org}</td>
                <td class="lbl">Discharge Dt&Tm</td><td class="cln">:</td><td class="val">${dischargeDtTm}</td>
            </tr>
            <tr>
                <td class="lbl">Patient Type</td><td class="cln">:</td><td class="val">${patientType}</td>
                <td class="lbl">Ward</td><td class="cln">:</td><td class="val">${ward}</td>
            </tr>
            <tr>
                <td class="lbl">Secondary Dr.</td><td class="cln">:</td><td class="val">${secondaryDr}</td>
                <td class="lbl">Bed No</td><td class="cln">:</td><td class="val">${bedNo}</td>
            </tr>
            <tr>
                <td class="lbl">Address</td><td class="cln">:</td><td class="val">${address}</td>
                <td class="lbl">Phone No</td><td class="cln">:</td><td class="val">${phoneNo}</td>
            </tr>
            <tr>
                <td class="lbl">Referal By</td><td class="cln">:</td><td class="val" colspan="4">${referalBy}</td>
            </tr>
        </table>

        <table class="main-table">
            <thead>
                <tr>
                    <th style="width: 5%;">S.No</th>
                    <th style="width: 15%;">Code</th>
                    <th style="width: 40%;">Service Name</th>
                    <th class="right" style="width: 15%;">Rate</th>
                    <th class="right" style="width: 10%;">Qty</th>
                    <th class="right" style="width: 15%;">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${activeCategories.map((cat: any) => `
                    <tr>
                        <td colspan="6" class="cat-header">${cat.name}</td>
                    </tr>
                    ${cat.items.map((item: any, idx: number) => `
                        <tr>
                            <td>${idx + 1}</td>
                            <td>${item.code}</td>
                            <td>${item.name}</td>
                            <td class="right">${Number(item.rate).toFixed(2)}</td>
                            <td class="right">${Number(item.qty).toFixed(2)}</td>
                            <td class="right">${Number(item.amount).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                    <tr class="cat-subtotal">
                        <td colspan="4"></td>
                        <td class="right" style="border-top: 1px solid #000; border-bottom: 1px solid #000;">Sub Total :</td>
                        <td class="right" style="border-top: 1px solid #000; border-bottom: 1px solid #000;">${Number(cat.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <table class="footer-table">
            <tr>
                <td style="width: 65%;">
                    <div style="font-weight: bold;">Rupees In : ${numberToWords(Math.max(0, netBill))} Rupees Only</div>
                    <div style="margin-top: 10px;">Reason :</div>
                    
                    ${advanceItems.length > 0 ? `
                    <div style="margin-top: 5px;">
                        <span style="font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 1px;">Receipt Details :</span>
                        <table class="receipt-table">
                            <thead>
                                <tr>
                                    <th>S.No</th>
                                    <th>Record Date</th>
                                    <th>Receipt No</th>
                                    <th class="right">Amount Payment</th>
                                    <th>Type</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${advanceItems.map((adv: any, i: number) => `
                                    <tr>
                                        <td>${i + 1}</td>
                                        <td>${format(new Date(adv.date), 'dd-MMM-yyyy')}</td>
                                        <td>${adv.reference || 'REC' + Math.floor(Math.random() * 900000 + 100000)}</td>
                                        <td class="right">${Number(adv.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${adv.mode}</td>
                                        <td>${adv.transactionType}</td>
                                    </tr>
                                `).join('')}
                                <tr>
                                    <td colspan="3" class="right" style="font-weight: bold; border-top: 1px solid #000; border-bottom: 1px solid #000;">Total :</td>
                                    <td class="right" style="font-weight: bold; border-top: 1px solid #000; border-bottom: 1px solid #000;">${Number(totalDeposits).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    <td style="border-top: 1px solid #000; border-bottom: 1px solid #000;"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    ` : ''}
                </td>
                <td style="width: 35%;">
                    <table class="totals-table">
                        <tr>
                            <td>Grand Total :</td>
                            <td>${Number(totalCharges).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                        <tr>
                            <td>Net Amt :</td>
                            <td>${Number(netBill).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                        <tr>
                            <td>Paid Amt :</td>
                            <td>${Number(totalDeposits).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                        <tr>
                            <td>Balance Amt :</td>
                            <td>${Number(balanceDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        
        <table class="sign-table">
            <tr>
                <td style="width: 33%; text-align: left;">
                    <div style="border-top: 1px solid #000; width: 200px; padding-top: 5px; margin: 0 auto;">Patient/Attendant Signatory</div>
                </td>
                <td style="width: 34%;"></td>
                <td style="width: 33%; text-align: right;">
                    <div style="width: 200px; margin: 0 auto;">
                        <div style="font-size: 10px; min-height: 12px; margin-bottom: 2px;">
                            ${summary?.primaryDoctor?.name ? (summary?.primaryDoctor?.name?.includes('Dr') ? summary.primaryDoctor.name : `Dr. ${summary.primaryDoctor.name}`) : '&nbsp;'}
                        </div>
                        <div style="border-top: 1px solid #000; padding-top: 5px;">Authorised Signatory</div>
                    </div>
                </td>
            </tr>
        </table>
        
        <div class="print-time">Printed Dt & Time : ${format(new Date(), 'dd-MMM-yyyy hh:mm a')}</div>

        <script>
            window.onload = function() {
                setTimeout(function() {
                    window.print();
                }, 500);
            }
        </script>
    </body>
    </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
};
