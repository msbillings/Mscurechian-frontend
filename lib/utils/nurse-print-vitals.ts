import { format } from 'date-fns';

export const generateNurseHourlyRecordHtml = (data: any) => {
    const { admission, vitals, meds, diet, labOrders, hospital } = data;

    // Sort logs by timestamp ascending for chronological report
    const sortedVitals = [...vitals].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const sortedMeds = [...meds].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const sortedDiet = [...(diet || [])].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Patient Hourly Monitoring Record - ${admission.patientName}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
                
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: 'Inter', -apple-system, sans-serif; 
                    background-color: #f1f5f9; 
                    color: #1e293b; 
                    padding: 5px;
                    line-height: 1.4;
                    font-size: 11px;
                }
                
                .main-record {
                    background-color: white;
                    width: 100%;
                    max-width: 850px;
                    margin: 0 auto;
                    padding: 15px;
                    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
                    min-height: 297mm;
                }
                
                @media (min-width: 640px) {
                    body { padding: 10px; }
                    .main-record { padding: 25px 35px; }
                }

                @page {
                    size: A4;
                    margin: 0;
                }

                .header {
                    text-align: center;
                    border-bottom: 2px solid #3b82f6;
                    padding-bottom: 8px;
                    margin-bottom: 15px;
                }
                .header h1 { 
                    font-size: 14px; 
                    font-weight: 800; 
                    color: #1d4ed8; 
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                @media (min-width: 640px) {
                    .header h1 { font-size: 16px; }
                }
                .header p { font-size: 9px; color: #64748b; font-weight: 600; margin-top: 2px; }

                .patient-info-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 10px;
                    margin-bottom: 20px;
                    background-color: #f8fafc;
                    padding: 12px;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                }
                @media (min-width: 480px) {
                    .patient-info-grid { grid-template-columns: 1fr 1fr; }
                }
                @media (min-width: 640px) {
                    .patient-info-grid { grid-template-columns: repeat(3, 1fr); gap: 15px; padding: 15px; }
                }

                .info-item { display: flex; flex-direction: column; gap: 2px; }
                .info-label { font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
                .info-value { font-size: 10px; font-weight: 600; color: #1e293b; }
                @media (min-width: 640px) {
                    .info-value { font-size: 11px; }
                }

                .section { margin-bottom: 20px; }
                @media (min-width: 640px) {
                    .section { margin-bottom: 25px; }
                }
                .section-header { 
                    background-color: #f1f5f9; 
                    padding: 6px 12px; 
                    border-radius: 6px; 
                    margin-bottom: 10px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    border-left: 4px solid #3b82f6;
                }
                .section-header h2 { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; }

                .table-container {
                    width: 100%;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                }
                table { width: 100%; border-collapse: collapse; margin-top: 8px; min-width: 400px; }
                th { 
                    background-color: #f8fafc; 
                    color: #64748b; 
                    font-size: 8px; 
                    font-weight: 800; 
                    text-transform: uppercase; 
                    padding: 6px; 
                    text-align: left; 
                    border-bottom: 1px solid #e2e8f0;
                }
                td { padding: 6px; font-size: 9px; border-bottom: 1px solid #f1f5f9; color: #334155; }
                @media (min-width: 640px) {
                    th { font-size: 9px; padding: 8px; }
                    td { font-size: 10px; padding: 8px; }
                }
                
                .status-badge {
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-size: 7px;
                    font-weight: 800;
                    text-transform: uppercase;
                }
                .status-stable { background-color: #ecfdf5; color: #059669; }
                .status-warning { background-color: #fffbeb; color: #d97706; }
                .status-critical { background-color: #fef2f2; color: #dc2626; }

                .diet-card {
                    padding: 10px;
                    background-color: #f0fdf4;
                    border: 1px solid #dcfce7;
                    border-radius: 8px;
                    margin-top: 5px;
                }
                .diet-text { font-style: italic; font-weight: 600; color: #166534; font-size: 10px; }

                .lab-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 8px;
                }
                @media (min-width: 600px) {
                    .lab-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
                }
                .lab-item {
                    padding: 8px;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .footer {
                    margin-top: 30px;
                    border-top: 1px solid #e2e8f0;
                    padding-top: 10px;
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                    font-size: 8px;
                    color: #94a3b8;
                    font-weight: 600;
                }
                @media (min-width: 480px) {
                    .footer { flex-direction: row; justify-content: space-between; }
                }

                .no-break { break-inside: avoid; }
                
                @media print {
                    body { padding: 0; background-color: white !important; }
                    .main-record { 
                        max-width: none !important; 
                        margin: 0 !important; 
                        padding: 15mm !important; 
                        box-shadow: none !important;
                    }
                    .table-container { overflow: visible !important; }
                    table { min-width: 0 !important; }
                }
            </style>
        </head>
        <body>

            <div class="main-record">
                <div class="header">
                    <h1>${hospital?.name || "CureChain Medical Center"}</h1>
                    <p>${hospital?.address || "Quality Healthcare Services"}</p>
                    <p>PH: ${hospital?.phone || hospital?.contact || "N/A"} | ${hospital?.email || "N/A"}</p>
                    <p style="margin-top: 8px; font-weight: 800; color: #1e293b; font-size: 10px;">HOURLY MONITORING & CLINICAL LOG</p>
                </div>

            <div class="patient-info-grid">
                <div class="info-item">
                    <span class="info-label">Patient Name</span>
                    <span class="info-value">${admission.patientName}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Admission ID</span>
                    <span class="info-value">${admission.admissionId}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Admission Date</span>
                    <span class="info-value">${format(new Date(admission.admissionDate), 'dd MMM yyyy, HH:mm')}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Primary Physician</span>
                    <span class="info-value">${admission.doctorName?.startsWith('Dr.') ? admission.doctorName : `Dr. ${admission.doctorName}`}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Location</span>
                    <span class="info-value">
                        ${admission.wardName ? `
                            ${admission.wardName}
                            ${admission.roomName ? ` - ${admission.roomName}` : ''}
                            ${admission.bedName ? ` - ${admission.bedName}` : ''}
                        ` : 'Clinical Transit'}
                    </span>
                </div>
                <div class="info-item">
                    <span class="info-label">Status</span>
                    <span class="info-value" style="color: #059669;">${admission.status}</span>
                </div>
            </div>

            <div class="section no-break">
                <div class="section-header">
                    <h2>Diet Plan</h2>
                </div>
                <div class="diet-card">
                    <p class="diet-text">"${admission.diet || 'Standard hospital nutrition prescribed.'}"</p>
                </div>
            </div>

            <div class="section">
                <div class="section-header">
                    <h2>Vitals Observation Log</h2>
                </div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>HR</th>
                                <th>BP</th>
                                <th>SpO2</th>
                                <th>Temp</th>
                                <th>Resp</th>
                                <th>Glucose</th>
                                <th>Nurse</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sortedVitals.length > 0 ? sortedVitals.map((v: any) => `
                                <tr>
                                    <td>
                                        <strong>${format(new Date(v.timestamp), 'HH:mm')}</strong><br/>
                                        <span style="font-size: 7px; color: #94a3b8;">${format(new Date(v.timestamp), 'dd MMM')}</span>
                                    </td>
                                    <td>${v.heartRate}</td>
                                    <td>${v.systolicBP}/${v.diastolicBP}</td>
                                    <td>${v.spO2}%</td>
                                    <td>${v.temperature}°F</td>
                                    <td>${v.respiratoryRate || '--'}</td>
                                    <td>${v.glucose || '--'}</td>
                                    <td>${v.recordedBy?.name?.split(' ')[0]}</td>
                                    <td>
                                        <span class="status-badge status-${v.status?.toLowerCase() || 'stable'}">
                                            ${v.status || 'Stable'}
                                        </span>
                                    </td>
                                </tr>
                            `).join('') : '<tr><td colspan="9" style="text-align: center; padding: 20px; color: #94a3b8;">No records yet.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="section no-break">
                <div class="section-header">
                    <h2>Medication Log</h2>
                </div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Drug</th>
                                <th>Dose & Route</th>
                                <th>Time</th>
                                <th>Slot</th>
                                <th>Nurse</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sortedMeds.length > 0 ? sortedMeds.map((m: any) => `
                                <tr>
                                    <td><strong>${m.drugName}</strong></td>
                                    <td>${m.dose} • ${m.route}</td>
                                    <td>${format(new Date(m.timestamp), 'dd/MM HH:mm')}</td>
                                    <td>${m.timeSlot}</td>
                                    <td>${m.administeredBy?.name?.split(' ')[0]}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #94a3b8;">No records.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="section no-break">
                <div class="section-header">
                    <h2>Dietary Intake Log</h2>
                </div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Items Consumed</th>
                                <th>Category/Slot</th>
                                <th>Time Recorded</th>
                                <th>Nurse</th>
                                <th>Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sortedDiet.length > 0 ? sortedDiet.map((d: any) => `
                                <tr>
                                    <td>
                                        <div style="display: flex; flex-direction: column; gap: 2px;">
                                            <strong style="font-size: 10px;">
                                                ${d.items?.map((item: any) => `${item.name || item} ${item.quantity ? `(${item.quantity})` : ''}`).join(', ')}
                                            </strong>
                                            ${d.items?.some((i: any) => i.calories) ? `
                                            <span style="font-size: 7px; color: #b45309; font-weight: 800; text-transform: uppercase;">
                                                Total: ${d.items.reduce((sum: number, i: any) => sum + (Number(i.calories) || 0), 0)} Kcal
                                            </span>` : ''}
                                        </div>
                                    </td>
                                    <td><span class="status-badge" style="background-color: #ffedd5; color: #ea580c;">${d.category}</span></td>
                                    <td>
                                        ${d.recordedTime}<br/>
                                        <span style="font-size: 7px; color: #94a3b8;">${format(new Date(d.timestamp), 'dd MMM (EEE)')}</span>
                                    </td>
                                    <td>${d.recordedBy?.name?.split(' ')[0]}</td>
                                    <td>${d.notes || '-'}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="5" style="text-align: center; padding: 15px; color: #94a3b8;">No dietary intake recorded.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="section">
                <div class="section-header">
                    <h2>Diagnostics & Investigations Detail</h2>
                </div>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${labOrders.length > 0 ? labOrders.map((order: any) => `
                        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px;">
                                <div style="flex: 1;">
                                    <h3 style="font-size: 10px; font-weight: 800; color: #1e293b; margin-bottom: 2px; text-transform: uppercase;">
                                        ${order.tests?.map((t: any) => t.testName || t.test?.testName || 'Investigation').join(', ')}
                                    </h3>
                                    <p style="font-size: 8px; color: #64748b; font-weight: 600;">By ${admission.doctorName?.startsWith('Dr.') ? admission.doctorName : `Dr. ${admission.doctorName}`}</p>
                                </div>
                                <div style="text-align: right;">
                                    <span class="status-badge" style="background-color: #f1f5f9; color: #475569; border: 1px solid #e2e8f0;">${order.status}</span>
                                    <p style="font-size: 7px; color: #94a3b8; font-weight: 600; margin-top: 2px;">${format(new Date(order.createdAt), 'dd MMM yyyy, HH:mm')}</p>
                                </div>
                            </div>
                            
                            <table style="margin-top: 0; background: transparent; min-width: 0;">
                                <tbody>
                                    ${order.tests?.map((test: any) => {
        if (test.subTests && test.subTests.length > 0) {
            return test.subTests.map((st: any) => `
                                                <tr>
                                                    <td style="border: none; padding: 3px 0; font-size: 9px; color: #64748b;">${st.name}</td>
                                                    <td style="border: none; padding: 3px 0; text-align: right; font-weight: 800; color: #1e293b;">${st.result} <span style="font-size: 7px; color: #94a3b8; font-weight: 400;">${st.unit || ''}</span></td>
                                                </tr>
                                            `).join('');
        } else if (test.resultValue) {
            return `
                                                <tr>
                                                    <td style="border: none; padding: 3px 0; font-size: 9px; color: #64748b;">${test.testName || test.test?.testName}</td>
                                                    <td style="border: none; padding: 3px 0; text-align: right; font-weight: 800; color: #1e293b;">${test.resultValue} <span style="font-size: 7px; color: #94a3b8; font-weight: 400;">${test.unit || ''}</span></td>
                                                </tr>
                                            `;
        }
        return '';
    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    `).join('') : '<p style="text-align: center; width: 100%; color: #94a3b8; padding: 15px; border: 1px dashed #e2e8f0; border-radius: 8px; font-size: 9px;">No diagnostic investigation reports found for this admission.</p>'}
                </div>
            </div>

            <div class="footer">
                <span>System Report • ${format(new Date(), 'dd MMM yyyy HH:mm')}</span>
                <span>${hospital?.name || "CureChain HMS"}</span>
            </div>

            </div>
        </body>
        </html>
    `;
};
