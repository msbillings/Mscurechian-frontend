import { format } from 'date-fns';
import { renderToString } from 'react-dom/server';
import MainHeader from '../../components/printers/MainHeader';
import MainFooter from '../../components/printers/MainFooter';
import React from 'react';

export const generatePatientHourlyRecordHtml = (data: any) => {
    const { admission, vitals, meds, diet, labOrders, hospital } = data;

    // Sort logs by timestamp ascending for chronological report
    const sortedVitals = [...vitals].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const sortedMeds = [...meds].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const sortedDiet = [...(diet || [])].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Pre-render Header and Footer to strings so they can be injected into the static HTML template
    const headerHtml = renderToString(React.createElement(MainHeader, { initialDetails: hospital }));
    const footerHtml = renderToString(React.createElement(MainFooter, { initialDetails: hospital }));

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
                    padding: 0; 
                    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
                    min-height: 297mm;
                    display: flex;
                    flex-direction: column;
                }

                .content-area-padding {
                    padding: 25px 35px;
                    flex: 1;
                }
                
                @page {
                    size: A4;
                    margin: 0;
                }

                /* Report Title matching Excel */
                .report-title-container {
                    text-align: center;
                    margin-bottom: 20px;
                }
                .report-main-title {
                    font-size: 16px;
                    font-weight: 800;
                    color: #002060; /* Dark Blue from Excel */
                    text-transform: uppercase;
                }
                .report-sub-title {
                    font-size: 12px;
                    font-weight: 800;
                    color: #000000;
                    margin-top: 4px;
                }
                .report-generated {
                    font-size: 10px;
                    font-style: italic;
                    color: #555555;
                    margin-top: 2px;
                }

                .patient-info-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr); /* Matching Excel 2-column layout */
                    gap: 0;
                    margin-bottom: 20px;
                    border: 1px solid #cbd5e1;
                }

                .info-row {
                    display: contents;
                }

                .info-cell {
                    display: flex;
                }

                .info-label {
                    width: 35%;
                    background-color: #f8fafc;
                    padding: 6px 8px;
                    font-size: 10px;
                    font-weight: 800;
                    color: #002060;
                    border-right: 1px solid #cbd5e1;
                    border-bottom: 1px solid #cbd5e1;
                }
                .info-value { 
                    width: 65%;
                    padding: 6px 8px;
                    font-size: 10px; 
                    font-weight: 800; 
                    color: #1e293b;
                    border-right: 1px solid #cbd5e1;
                    border-bottom: 1px solid #cbd5e1;
                }
                
                /* Remove right border for the last cell in a row to avoid double borders */
                .info-cell:nth-child(even) .info-value { border-right: none; }

                .section { margin-bottom: 25px; }

                /* EXCEL STYLED HEADERS */
                .section-header-title { 
                    background-color: #002060; /* Deep Blue from Excel */
                    color: #ffffff;
                    padding: 8px 12px; 
                    font-size: 11px; 
                    font-weight: 800; 
                    text-transform: uppercase; 
                    margin-bottom: 0px; /* Attach tightly to tables */
                }

                table { width: 100%; border-collapse: collapse; margin-top: 0; }
                th { 
                    background-color: #002060; 
                    color: #ffffff; 
                    font-size: 10px; 
                    font-weight: 800; 
                    text-transform: uppercase; 
                    padding: 6px 8px; 
                    text-align: center; 
                    border: 1px solid #ffffff;
                }
                td { 
                    padding: 6px 8px; 
                    font-size: 10px; 
                    border: 1px solid #cbd5e1; 
                    color: #334155; 
                    text-align: center;
                }
                
                /* Override table headers immediately following a section header title */
                .section-header-title + table th {
                    border-top: 1px solid white; /* Separate title from headers slightly */
                }

                .status-badge {
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 8px;
                    font-weight: 800;
                    text-transform: uppercase;
                }
                .status-stable { background-color: #ecfdf5; color: #059669; border: 1px solid #a7f3d0;}
                .status-warning { background-color: #fffbeb; color: #d97706; border: 1px solid #fde68a;}
                .status-critical { background-color: #fef2f2; color: #dc2626; border: 1px solid #fecaca;}

                .diet-card {
                    padding: 12px;
                    border: 1px solid #cbd5e1;
                    margin-top: 0px;
                }
                .diet-text { font-style: italic; font-weight: 600; color: #1e293b; font-size: 10px; }

                .no-break { break-inside: avoid; }
                
                /* Hide header/footer inject buttons inside print if any accidentally render */
                .print-hidden { display: none !important; }

                @media print {
                    .btn-print, .btn-back { display: none !important; }
                    body { padding: 0; background-color: white !important; }
                    .main-record { 
                        max-width: none !important; 
                        margin: 0 !important; 
                        box-shadow: none !important;
                    }
                    /* Ensure background colors print */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            </style>
        </head>
        <body>
            <div class="main-record">
                <!-- Injected React MainHeader -->
                <div class="header-injection-zone">
                    ${headerHtml}
                </div>

                <div class="content-area-padding">
                    <div class="report-title-container">
                        <div class="report-main-title">PATIENT HOURLY MONITORING SUMMARY REPORT</div>
                        <div class="report-sub-title">Clinical Observation Registry</div>
                        <div class="report-generated">Report Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
                    </div>

                    <div class="patient-info-grid">
                        <div class="info-row">
                            <div class="info-cell">
                                <div class="info-label">Patient Name</div>
                                <div class="info-value">${admission.patientName}</div>
                            </div>
                            <div class="info-cell">
                                <div class="info-label">Admission ID</div>
                                <div class="info-value">${admission.admissionId}</div>
                            </div>
                        </div>
                        <div class="info-row">
                            <div class="info-cell">
                                <div class="info-label">Department</div>
                                <div class="info-value">${admission.wardName || 'ICU-D'}</div>
                            </div>
                            <div class="info-cell">
                                <div class="info-label">Status</div>
                                <div class="info-value">${admission.status}</div>
                            </div>
                        </div>
                        <div class="info-row">
                            <div class="info-cell">
                                <div class="info-label">Adm Date</div>
                                <div class="info-value">${format(new Date(admission.admissionDate), 'dd MMM yyyy, HH:mm')}</div>
                            </div>
                            <div class="info-cell">
                                <div class="info-label">Length of Stay</div>
                                <div class="info-value">${Math.max(0, Math.floor((new Date().getTime() - new Date(admission.admissionDate).getTime()) / (1000 * 3600 * 24)))} Days</div>
                            </div>
                        </div>
                        <div class="info-row">
                            <div class="info-cell">
                                <div class="info-label">Primary Dr.</div>
                                <div class="info-value">${admission.doctorName?.startsWith('Dr.') ? admission.doctorName : `Dr. ${admission.doctorName}`}</div>
                            </div>
                            <div class="info-cell">
                                <div class="info-label" style="border-bottom: none;">Ward Details</div>
                                <div class="info-value" style="border-bottom: none;">${admission.wardName ? `${admission.wardName} / ${admission.roomName || 'N/A'}` : 'Clinical Transit'}</div>
                            </div>
                        </div>
                    </div>

                    <div class="section no-break">
                        <div class="section-header-title" style="margin-bottom: 5px;">Prescribed Diet Plan</div>
                        <div class="diet-card">
                            <p class="diet-text">"${admission.diet || 'Standard hospital nutrition prescribed.'}"</p>
                        </div>
                    </div>

                    <div class="section no-break">
                        <div class="section-header-title">HOURLY VITALS LOG</div>
                        <table>
                            <thead>
                                <tr>
                                    <th>S.No</th>
                                    <th>Date</th>
                                    <th>Day</th>
                                    <th>Time</th>
                                    <th>Heart Rate</th>
                                    <th>BP</th>
                                    <th>SpO2</th>
                                    <th>Temp (F)</th>
                                    <th>Resp</th>
                                    <th>Nurse</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(vitals || []).length > 0 ? (vitals || []).map((v: any, idx: number) => `
                                    <tr>
                                        <td>${idx + 1}</td>
                                        <td>${format(new Date(v.timestamp), 'dd/MM/yyyy')}</td>
                                        <td>${format(new Date(v.timestamp), 'EEEE')}</td>
                                        <td><strong>${format(new Date(v.timestamp), 'HH:mm')}</strong></td>
                                        <td>${v.heartRate} bpm</td>
                                        <td>${v.systolicBP}/${v.diastolicBP}</td>
                                        <td>${v.spO2}%</td>
                                        <td>${v.temperature}°F</td>
                                        <td>${v.respiratoryRate || '--'}</td>
                                        <td>${v.recordedBy?.name}</td>
                                        <td>
                                            <span class="status-badge status-${v.status?.toLowerCase() || 'stable'}">
                                                ${v.status || 'Stable'}
                                            </span>
                                        </td>
                                    </tr>
                                `).join('') : '<tr><td colspan="11" style="text-align: center; padding: 20px; color: #94a3b8;">No vital signs recorded yet.</td></tr>'}
                            </tbody>
                        </table>
                    </div>

                    <div class="section no-break">
                        <div class="section-header-title">MEDICATION ADMINISTRATION LOG</div>
                        <table>
                            <thead>
                                <tr>
                                    <th>S.No</th>
                                    <th>Drug Name</th>
                                    <th>Route</th>
                                    <th>Date</th>
                                    <th>Time</th>
                                    <th>Slot</th>
                                    <th>Admin Nurse</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(meds || []).length > 0 ? (meds || []).map((m: any, idx: number) => `
                                    <tr>
                                        <td>${idx + 1}</td>
                                        <td><strong>${m.drugName}</strong></td>
                                        <td>${m.route || '-'}</td>
                                        <td>${format(new Date(m.timestamp), 'dd/MM/yyyy')}</td>
                                        <td><strong>${format(new Date(m.timestamp), 'HH:mm')}</strong></td>
                                        <td>${m.timeSlot}</td>
                                        <td>${m.administeredBy?.name}</td>
                                        <td>${m.status}</td>
                                    </tr>
                                `).join('') : '<tr><td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8;">No medications administered during this period.</td></tr>'}
                            </tbody>
                        </table>
                    </div>

                    <div class="section no-break">
                        <div class="section-header-title">DIETARY INTAKE LOG</div>
                        <table>
                            <thead>
                                <tr>
                                    <th>S.No</th>
                                    <th>Items</th>
                                    <th>Category</th>
                                    <th>Date</th>
                                    <th>Time</th>
                                    <th>Nurse</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(diet || []).length > 0 ? (diet || []).map((d: any, idx: number) => `
                                    <tr>
                                        <td>${idx + 1}</td>
                                        <td style="text-align: left;">
                                            <strong>
                                                ${d.items?.map((item: any) => `${item.name || item} ${item.quantity ? `(${item.quantity})` : ''}`).join(', ')}
                                            </strong>
                                        </td>
                                        <td>${d.category}</td>
                                        <td>${format(new Date(d.timestamp), 'dd/MM/yyyy')}</td>
                                        <td><strong>${d.recordedTime}</strong></td>
                                        <td>${d.recordedBy?.name}</td>
                                        <td style="text-align: left;">${d.notes || '-'}</td>
                                    </tr>
                                `).join('') : '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;">No dietary intake recorded.</td></tr>'}
                            </tbody>
                        </table>
                    </div>

                    ${(labOrders || []).length > 0 ? `
                    <div class="section no-break">
                        <div class="section-header-title">LAB INVESTIGATIONS REGISTRY</div>
                        <table>
                            <thead>
                                <tr>
                                    <th>S.No</th>
                                    <th>Date</th>
                                    <th>Test Name</th>
                                    <th>Status</th>
                                    <th>Result</th>
                                    <th>Unit</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(() => {
                let html = '';
                let labRowCounter = 1;
                (labOrders || []).forEach((order: any) => {
                    const date = format(new Date(order.createdAt), 'dd MMMM yyyy HH:mm');
                    order.tests?.forEach((test: any) => {
                        const testName = test.testName || test.test?.testName || 'Test';

                        if (test.subTests && test.subTests.length > 0) {
                            test.subTests.forEach((st: any) => {
                                const hasResult = st.result !== undefined && st.result !== null && st.result !== '';
                                html += `
                                    <tr>
                                        <td>${labRowCounter++}</td>
                                        <td>${date}</td>
                                        <td style="text-align: left;">${testName} - ${st.name}</td>
                                        <td ${!hasResult ? 'style="color: #94a3b8; font-style: italic;"' : ''}>${order.status || (hasResult ? 'Completed' : 'Pending')}</td>
                                        <td><strong>${hasResult ? st.result : '-'}</strong></td>
                                        <td>${st.unit || '-'}</td>
                                    </tr>
                                `;
                            });
                        } else {
                            const hasResult = test.resultValue !== undefined && test.resultValue !== null && test.resultValue !== '';
                            html += `
                                    <tr>
                                        <td>${labRowCounter++}</td>
                                        <td>${date}</td>
                                        <td style="text-align: left;">${testName}</td>
                                        <td ${!hasResult ? 'style="color: #94a3b8; font-style: italic;"' : ''}>${order.status || (hasResult ? 'Completed' : 'Pending')}</td>
                                        <td><strong>${hasResult ? test.resultValue : '-'}</strong></td>
                                        <td>${test.unit || '-'}</td>
                                    </tr>
                                `;
                        }
                    });
                });
                return html;
            })()}
                            </tbody>
                        </table>
                    </div>
                    ` : ''}
                </div>

                <!-- Injected React MainFooter -->
                <div class="footer-injection-zone" style="margin-top: auto;">
                    ${footerHtml}
                </div>
            </div>
        </body>
        </html>
    `;
};
