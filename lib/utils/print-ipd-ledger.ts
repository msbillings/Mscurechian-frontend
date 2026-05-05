import { format } from "date-fns";

export const printIPDLedger = (summary: any, hospitalDetails?: any) => {
    // Determine components
    const patientName = summary?.patientName || "Unknown Patient";
    const admissionId = summary?.admissionId || "N/A";
    const mrn = summary?.mrn || "N/A";
    
    // Extract items by category
    const extraItems = summary?.extraCharges?.items || [];
    const doctorCharges = extraItems.filter((i: any) => i.category === 'Doctor Fee' || i.category === 'Consultation');
    const labCharges = extraItems.filter((i: any) => i.category === 'Lab' || i.category === 'Diagnostics');
    const pharmaCharges = extraItems.filter((i: any) => i.category === 'Pharmacy' || i.category === 'Medicine');
    const otherCharges = extraItems.filter((i: any) => !['Doctor Fee', 'Consultation', 'Lab', 'Diagnostics', 'Pharmacy', 'Medicine'].includes(i.category));

    const bedItems = summary?.bedCharges?.items || [];
    const advanceItems = summary?.advances || [];

    const financials = summary?.financials || { totalAdvance: 0, balance: 0, discount: 0 };
    
    // Calculate Totals
    const doctorTotal = doctorCharges.reduce((sum: number, item: any) => sum + (item.status === 'Reversed' ? 0 : item.amount), 0);
    const labTotal = labCharges.reduce((sum: number, item: any) => sum + (item.status === 'Reversed' ? 0 : item.amount), 0);
    const pharmaTotal = pharmaCharges.reduce((sum: number, item: any) => sum + (item.status === 'Reversed' ? 0 : item.amount), 0);
    const otherTotal = otherCharges.reduce((sum: number, item: any) => sum + (item.status === 'Reversed' ? 0 : item.amount), 0);
    const bedTotal = summary?.bedCharges?.total || 0;

    const totalCharges = doctorTotal + labTotal + pharmaTotal + otherTotal + bedTotal;
    const totalDeposits = financials.totalAdvance || 0;
    const discount = financials.discount || 0;
    const returnCredits = financials.returnCredits || 0;
    
    // Balance calculation (Charges - Returns - Discount - Deposits)
    const netBill = Math.max(0, totalCharges - returnCredits);
    const afterDiscount = Math.max(0, netBill - discount);
    const balanceDue = Math.max(0, afterDiscount - totalDeposits);
    const refundDue = Math.max(0, totalDeposits - afterDiscount);

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Patient Ledger - ${patientName}</title>
        <style>
            @page {
                size: A4;
                margin: 15mm;
            }
            body {
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                margin: 0;
                padding: 0;
                color: #1e293b;
                line-height: 1.5;
                font-size: 11px;
            }
            * {
                box-sizing: border-box;
            }
            
            /* Header */
            .header-container {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                border-bottom: 2px solid #0f172a;
                padding-bottom: 15px;
                margin-bottom: 20px;
            }
            .hospital-info h1 {
                margin: 0 0 5px 0;
                font-size: 24px;
                color: #0f172a;
                font-weight: 900;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .hospital-info p {
                margin: 2px 0;
                color: #475569;
                font-size: 10px;
            }
            .doc-title {
                text-align: right;
            }
            .doc-title h2 {
                margin: 0;
                font-size: 18px;
                color: #334155;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .doc-title p {
                margin: 5px 0 0 0;
                font-size: 10px;
                color: #64748b;
            }

            /* Patient Details */
            .patient-card {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 20px;
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
            }
            .info-group {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            .info-label {
                font-size: 9px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #64748b;
                font-weight: bold;
            }
            .info-value {
                font-size: 12px;
                font-weight: 600;
                color: #0f172a;
            }

            /* Tables */
            .section-title {
                font-size: 13px;
                font-weight: 800;
                color: #0f172a;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin: 20px 0 8px 0;
                padding-bottom: 4px;
                border-bottom: 1px solid #cbd5e1;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 5px;
            }
            th, td {
                padding: 8px 10px;
                text-align: left;
                border-bottom: 1px solid #e2e8f0;
            }
            th {
                background-color: #f1f5f9;
                font-size: 9px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #475569;
                font-weight: bold;
            }
            td {
                font-size: 11px;
                color: #334155;
            }
            .text-right {
                text-align: right;
            }
            .text-center {
                text-align: center;
            }
            .table-total {
                text-align: right;
                font-size: 11px;
                font-weight: bold;
                padding: 8px 10px;
                color: #0f172a;
            }
            
            /* Status Badges */
            .badge {
                display: inline-block;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 8px;
                font-weight: bold;
                text-transform: uppercase;
            }
            .badge-active { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
            .badge-reversed { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; text-decoration: line-through; }

            /* Final Summary */
            .summary-container {
                margin-top: 30px;
                display: flex;
                justify-content: flex-end;
                page-break-inside: avoid;
            }
            .summary-box {
                width: 300px;
                border: 1px solid #cbd5e1;
                border-radius: 8px;
                overflow: hidden;
            }
            .summary-row {
                display: flex;
                justify-content: space-between;
                padding: 10px 15px;
                border-bottom: 1px solid #e2e8f0;
                font-size: 11px;
            }
            .summary-row:last-child {
                border-bottom: none;
            }
            .summary-label {
                color: #475569;
                font-weight: 600;
            }
            .summary-val {
                color: #0f172a;
                font-weight: 700;
            }
            .summary-highlight {
                background: #f8fafc;
                font-size: 14px;
            }
            .summary-highlight .summary-label, 
            .summary-highlight .summary-val {
                font-weight: 900;
            }

            /* Utilities */
            .text-red { color: #dc2626; }
            .text-green { color: #059669; }
            .empty-state {
                text-align: center;
                padding: 15px;
                color: #94a3b8;
                font-style: italic;
                font-size: 10px;
                background: #f8fafc;
                border: 1px dashed #cbd5e1;
                border-radius: 6px;
            }

            /* Print specifics */
            @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .no-break { page-break-inside: avoid; }
            }
        </style>
    </head>
    <body>
        <!-- Header -->
        <div class="header-container">
            <div class="hospital-info">
                <h1>${hospitalDetails?.name || 'Hospital Name'}</h1>
                <p>${hospitalDetails?.address || 'Hospital Address details here'}</p>
                <p>Phone: ${hospitalDetails?.phone || '+91-XXXXXXXXXX'} | Email: ${hospitalDetails?.email || 'contact@hospital.com'}</p>
            </div>
            <div class="doc-title">
                <h2>Inpatient Ledger</h2>
                <p>Printed on: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
            </div>
        </div>

        <!-- Patient Details -->
        <div class="patient-card">
            <div class="info-group">
                <span class="info-label">Patient Name</span>
                <span class="info-value">${patientName}</span>
            </div>
            <div class="info-group">
                <span class="info-label">MRN / Admission ID</span>
                <span class="info-value">${mrn} / ${admissionId}</span>
            </div>
            <div class="info-group">
                <span class="info-label">Current Room / Bed</span>
                <span class="info-value">
                    ${bedItems.length > 0 ? `${bedItems[bedItems.length-1].room || 'N/A'} / ${bedItems[bedItems.length-1].bedId}` : 'N/A'}
                </span>
            </div>
            <div class="info-group">
                <span class="info-label">Primary Doctor</span>
                <span class="info-value">${summary?.primaryDoctor?.name || 'N/A'}</span>
            </div>
            <div class="info-group">
                <span class="info-label">Admission Date</span>
                <span class="info-value">
                    ${summary?.admissionDate ? format(new Date(summary.admissionDate), 'dd MMM yyyy') : 'N/A'}
                </span>
            </div>
            <div class="info-group">
                <span class="info-label">Discharge Date</span>
                <span class="info-value">
                    ${summary?.status === 'Discharged' ? format(new Date(summary?.updatedAt || new Date()), 'dd MMM yyyy') : 'Still Active'}
                </span>
            </div>
        </div>

        <!-- Admission & ICU Charges -->
        <div class="no-break">
            <div class="section-title">Admission & ICU Charges</div>
            ${bedItems.length > 0 ? `
            <table>
                <thead>
                    <tr>
                        <th>Bed Category</th>
                        <th>Room No</th>
                        <th>Days</th>
                        <th class="text-right">Rate / Day (₹)</th>
                        <th class="text-right">Amount (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    ${bedItems.map((item: any) => `
                    <tr>
                        <td>${item.type}</td>
                        <td>${item.room || '-'}</td>
                        <td>${Math.ceil(item.days || 1)}</td>
                        <td class="text-right">${item.rate.toLocaleString()}</td>
                        <td class="text-right">${item.charge.toLocaleString()}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="table-total">Bed Charges Total: ₹ ${bedTotal.toLocaleString()}</div>
            ` : '<div class="empty-state">No bed charges recorded.</div>'}
        </div>

        <!-- Doctor Charges -->
        <div class="no-break">
            <div class="section-title">Doctor Consultation Charges</div>
            ${doctorCharges.length > 0 ? `
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Status</th>
                        <th class="text-right">Amount (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    ${doctorCharges.map((item: any) => `
                    <tr>
                        <td>${format(new Date(item.date), 'dd MMM yyyy')}</td>
                        <td>${item.description}</td>
                        <td><span class="badge ${item.status === 'Reversed' ? 'badge-reversed' : 'badge-active'}">${item.status}</span></td>
                        <td class="text-right ${item.status === 'Reversed' ? 'text-red' : ''}">${item.amount.toLocaleString()}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="table-total">Doctor Charges Total: ₹ ${doctorTotal.toLocaleString()}</div>
            ` : '<div class="empty-state">No doctor charges recorded.</div>'}
        </div>

        <!-- Medication Charges -->
        <div class="no-break">
            <div class="section-title">Medication & Pharmacy Charges</div>
            ${pharmaCharges.length > 0 ? `
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Description / Issuance</th>
                        <th>Status</th>
                        <th class="text-right">Amount (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    ${pharmaCharges.map((item: any) => `
                    <tr>
                        <td>${format(new Date(item.date), 'dd MMM yyyy')}</td>
                        <td>${item.description}</td>
                        <td><span class="badge ${item.status === 'Reversed' ? 'badge-reversed' : 'badge-active'}">${item.status}</span></td>
                        <td class="text-right ${item.status === 'Reversed' ? 'text-red' : ''}">${item.amount.toLocaleString()}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="table-total">Medication Total: ₹ ${pharmaTotal.toLocaleString()}</div>
            ` : '<div class="empty-state">No pharmacy charges recorded.</div>'}
        </div>

        <!-- Diagnostics & Lab Tests -->
        <div class="no-break">
            <div class="section-title">Diagnostics & Lab Tests</div>
            ${labCharges.length > 0 ? `
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Status</th>
                        <th class="text-right">Amount (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    ${labCharges.map((item: any) => `
                    <tr>
                        <td>${format(new Date(item.date), 'dd MMM yyyy')}</td>
                        <td>${item.description}</td>
                        <td><span class="badge ${item.status === 'Reversed' ? 'badge-reversed' : 'badge-active'}">${item.status}</span></td>
                        <td class="text-right ${item.status === 'Reversed' ? 'text-red' : ''}">${item.amount.toLocaleString()}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="table-total">Diagnostics Total: ₹ ${labTotal.toLocaleString()}</div>
            ` : '<div class="empty-state">No diagnostic charges recorded.</div>'}
        </div>

        <!-- Other Charges -->
        ${otherCharges.length > 0 ? `
        <div class="no-break">
            <div class="section-title">Other Miscellaneous Charges</div>
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Description</th>
                        <th>Status</th>
                        <th class="text-right">Amount (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    ${otherCharges.map((item: any) => `
                    <tr>
                        <td>${format(new Date(item.date), 'dd MMM yyyy')}</td>
                        <td>${item.category}</td>
                        <td>${item.description}</td>
                        <td><span class="badge ${item.status === 'Reversed' ? 'badge-reversed' : 'badge-active'}">${item.status}</span></td>
                        <td class="text-right ${item.status === 'Reversed' ? 'text-red' : ''}">${item.amount.toLocaleString()}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="table-total">Other Charges Total: ₹ ${otherTotal.toLocaleString()}</div>
        </div>
        ` : ''}

        <!-- Net Payments -->
        <div class="no-break">
            <div class="section-title">Payment & Receipts History</div>
            ${advanceItems.length > 0 ? `
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Receipt No / Ref</th>
                        <th>Payment Mode</th>
                        <th>Transaction Type</th>
                        <th class="text-right">Amount (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    ${advanceItems.map((item: any) => `
                    <tr>
                        <td>${format(new Date(item.date), 'dd MMM yyyy')}</td>
                        <td>${item.reference || '-'}</td>
                        <td>${item.mode}</td>
                        <td><span class="badge ${item.transactionType === 'Refund' ? 'badge-reversed' : 'badge-active'}">${item.transactionType}</span></td>
                        <td class="text-right ${item.transactionType === 'Refund' ? 'text-red' : 'text-green'}">
                            ${item.transactionType === 'Refund' ? '-' : '+'} ${item.amount.toLocaleString()}
                        </td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="table-total">Total Deposits / Received: ₹ ${totalDeposits.toLocaleString()}</div>
            ` : '<div class="empty-state">No payments recorded.</div>'}
        </div>

        <!-- Summary Section -->
        <div class="summary-container">
            <div class="summary-box">
                <div class="summary-row">
                    <span class="summary-label">Total Clinical Charges</span>
                    <span class="summary-val">₹ ${totalCharges.toLocaleString()}</span>
                </div>
                ${returnCredits > 0 ? `
                <div class="summary-row">
                    <span class="summary-label">(-) Return Credits</span>
                    <span class="summary-val text-red">₹ ${returnCredits.toLocaleString()}</span>
                </div>
                ` : ''}
                ${discount > 0 ? `
                <div class="summary-row">
                    <span class="summary-label">(-) Discount Amount</span>
                    <span class="summary-val text-red">₹ ${discount.toLocaleString()}</span>
                </div>
                ` : ''}
                <div class="summary-row">
                    <span class="summary-label">(-) Total Deposits Paid</span>
                    <span class="summary-val text-green">₹ ${totalDeposits.toLocaleString()}</span>
                </div>
                <div class="summary-row summary-highlight">
                    <span class="summary-label">${balanceDue > 0 ? 'Balance Due' : refundDue > 0 ? 'Refund Due' : 'Settled'}</span>
                    <span class="summary-val ${balanceDue > 0 ? 'text-red' : 'text-green'}">
                        ₹ ${balanceDue > 0 ? balanceDue.toLocaleString() : refundDue.toLocaleString()}
                    </span>
                </div>
            </div>
        </div>

        <script>
            window.onload = function() {
                // Short timeout to ensure styles are applied
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
