import { format } from 'date-fns';

export const generatePatientHourlyRecordHtml = (data: any) => {
    const { admission, vitals, meds, diet, labOrders, hospital } = data;

    // Sort logs by timestamp ascending for chronological report
    const sortedVitals = [...vitals].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const sortedMeds = [...meds].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const sortedDiet = [...(diet || [])].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Patient Hourly Monitoring Record - ${admission.patientName}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
                
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: 'Inter', -apple-system, sans-serif; 
                    background-color: #f1f5f9; 
                    color: #1e293b; 
                    padding: 10px;
                    line-height: 1.4;
                    font-size: 11px;
                }
                
                .main-record {
                    background-color: white;
                    max-width: 850px;
                    margin: 0 auto;
                    padding: 25px 35px;
                    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
                    min-height: 297mm;
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
                    font-size: 16px; 
                    font-weight: 800; 
                    color: #1d4ed8; 
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .header p { font-size: 9px; color: #64748b; font-weight: 600; margin-top: 2px; }

                .patient-info-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 15px;
                    margin-bottom: 20px;
                    background-color: #f8fafc;
                    padding: 15px;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                }

                .info-item { display: flex; flex-direction: column; gap: 2px; }
                .info-label { font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
                .info-value { font-size: 11px; font-weight: 600; color: #1e293b; }

                .section { margin-bottom: 25px; }
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
                .section-header h2 { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; }

                table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                th { 
                    background-color: #f8fafc; 
                    color: #64748b; 
                    font-size: 9px; 
                    font-weight: 800; 
                    text-transform: uppercase; 
                    padding: 8px; 
                    text-align: left; 
                    border-bottom: 1px solid #e2e8f0;
                }
                td { padding: 8px; font-size: 10px; border-bottom: 1px solid #f1f5f9; color: #334155; }
                
                .status-badge {
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 8px;
                    font-weight: 800;
                    text-transform: uppercase;
                }
                .status-stable { background-color: #ecfdf5; color: #059669; }
                .status-warning { background-color: #fffbeb; color: #d97706; }
                .status-critical { background-color: #fef2f2; color: #dc2626; }

                .diet-card {
                    padding: 12px;
                    background-color: #f0fdf4;
                    border: 1px solid #dcfce7;
                    border-radius: 8px;
                    margin-top: 5px;
                }
                .diet-text { font-style: italic; font-weight: 600; color: #166534; font-size: 11px; }

                .lab-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                }
                .lab-item {
                    padding: 10px;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .footer {
                    margin-top: 40px;
                    border-top: 1px solid #e2e8f0;
                    padding-top: 10px;
                    display: flex;
                    justify-content: space-between;
                    font-size: 9px;
                    color: #94a3b8;
                    font-weight: 600;
                }

                .no-break { break-inside: avoid; }
                
                .btn-print {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background-color: #3b82f6;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 50px;
                    font-weight: 800;
                    cursor: pointer;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                    text-transform: uppercase;
                    font-size: 10px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .btn-back {
                    position: fixed;
                    bottom: 20px;
                    left: 20px;
                    background-color: #64748b;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 50px;
                    font-weight: 800;
                    cursor: pointer;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                    text-transform: uppercase;
                    font-size: 10px;
                    text-decoration: none;
                }

                @media print {
                    .btn-print, .btn-back { display: none !important; }
                    body { padding: 0; background-color: white !important; }
                    .main-record { 
                        max-width: none !important; 
                        margin: 0 !important; 
                        padding: 15mm !important; 
                        box-shadow: none !important;
                    }
                }
            </style>
        </head>
        <body>

            <div class="main-record">
                <div class="header">
                    <h1>${hospital?.name || "CureChain Medical Center"}</h1>
                    <p>${hospital?.address || "Quality Healthcare Services"}</p>
                    <p>Phone: ${hospital?.phone || hospital?.contact || "N/A"} | Email: ${hospital?.email || "N/A"}</p>
                    <p style="margin-top: 8px; font-weight: 800; color: #1e293b; font-size: 10px;">PATIENT HOURLY MONITORING & CLINICAL LOG</p>
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
                    <span class="info-value">Dr. ${admission.doctorName}</span>
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
                    <span class="info-label">Current Status</span>
                    <span class="info-value" style="color: #059669;">${admission.status}</span>
                </div>
            </div>

            <div class="section no-break">
                <div class="section-header">
                    <h2>Prescribed Diet Plan</h2>
                </div>
                <div class="diet-card">
                    <p class="diet-text">"${admission.diet || 'Standard hospital nutrition prescribed.'}"</p>
                </div>
            </div>

            <div class="section">
                <div class="section-header">
                    <h2>Hourly Vitals Observation Log</h2>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Date / Time</th>
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
                                    <span style="font-size: 8px; color: #94a3b8;">${format(new Date(v.timestamp), 'dd MMM')}</span>
                                </td>
                                <td>${v.heartRate} bpm</td>
                                <td>${v.systolicBP}/${v.diastolicBP}</td>
                                <td>${v.spO2}%</td>
                                <td>${v.temperature}°F</td>
                                <td>${v.respiratoryRate || '--'}</td>
                                <td>${v.glucose || '--'} ${v.glucoseType || ''}</td>
                                <td>${v.recordedBy?.name}</td>
                                <td>
                                    <span class="status-badge status-${v.status?.toLowerCase() || 'stable'}">
                                        ${v.status || 'Stable'}
                                    </span>
                                </td>
                            </tr>
                        `).join('') : '<tr><td colspan="9" style="text-align: center; padding: 20px; color: #94a3b8;">No vital signs recorded yet.</td></tr>'}
                    </tbody>
                </table>
            </div>

            <div class="section no-break">
                <div class="section-header">
                    <h2>Medication Administration Log</h2>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Drug Name</th>
                            <th>Dose & Route</th>
                            <th>Time Given</th>
                            <th>Time Slot</th>
                            <th>Authorized Nurse</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedMeds.length > 0 ? sortedMeds.map((m: any) => `
                            <tr>
                                <td><strong>${m.drugName}</strong></td>
                                <td>${m.dose} • ${m.route}</td>
                                <td>${format(new Date(m.timestamp), 'dd/MM HH:mm')}</td>
                                <td>${m.timeSlot}</td>
                                <td>${m.administeredBy?.name}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #94a3b8;">No medications administered during this period.</td></tr>'}
                    </tbody>
                </table>
            </div>

            <div class="section no-break">
                <div class="section-header">
                    <h2>Dietary Intake Log</h2>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Items Consumed</th>
                            <th>Category/Slot</th>
                            <th>Time Recorded</th>
                            <th>Recorded By</th>
                            <th>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedDiet.length > 0 ? sortedDiet.map((d: any) => `
                            <tr>
                                <td><strong>${d.items?.join(', ')}</strong></td>
                                <td><span class="status-badge" style="background-color: #ffedd5; color: #ea580c;">${d.category}</span></td>
                                <td>
                                    ${d.recordedTime}<br/>
                                    <small style="color: #64748b; font-size: 9px; font-weight: 600;">${format(new Date(d.timestamp), 'dd MMM (EEE)')}</small>
                                </td>
                                <td>${d.recordedBy?.name}</td>
                                <td>${d.notes || '-'}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #94a3b8;">No dietary intake recorded.</td></tr>'}
                    </tbody>
                </table>
            </div>

            <div class="section no-break">
                <div class="section-header">
                    <h2>Recent Diagnostics & Investigations</h2>
                </div>
                <div class="lab-grid">
                    ${labOrders.length > 0 ? labOrders.map((order: any) => `
                        <div class="lab-item">
                            <div>
                                <p style="font-weight: 800; font-size: 10px;">${order.tests?.[0]?.test?.name || 'Lab Test'}</p>
                                <p style="font-size: 8px; color: #94a3b8; font-weight: 600; margin-top: 2px;">Ordered by Dr. ${order.doctor?.name}</p>
                            </div>
                            <div style="text-align: right;">
                                <span class="status-badge status-stable">${order.status}</span>
                                <p style="font-size: 8px; color: #94a3b8; margin-top: 4px;">${format(new Date(order.createdAt), 'dd MMM')}</p>
                            </div>
                        </div>
                    `).join('') : '<p style="text-align: center; width: 100%; color: #94a3b8; padding: 10px;">No lab orders found.</p>'}
                </div>
            </div>

            <div class="footer">
                <span>System Generated Report • ${format(new Date(), 'dd MMM yyyy HH:mm')}</span>
                <span>${hospital?.name || "CureChain HMS"} • Confidential Patient Record</span>
            </div>

            </div>
            <script>
                // Auto-print on load if needed, but the user might want a button
                // window.onload = () => { window.print(); }
            </script>
        </body>
        </html>
    `;
};
