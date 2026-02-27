import React from 'react';

// Common interfaces
interface Medicine {
    name: string;
    instructions?: string;
    dosage: string;
    frequency: string;
    duration: string;
    freq?: string;
}

interface PrescriptionDocumentProps {
    prescription: any;
    patient?: any;
    doctor?: any;
    hospital?: any;
}

const calculateQty = (freqStr: string, durationStr: string) => {
    if (!freqStr || !durationStr) return '-';

    let freq = 1;
    let days = 1;

    const f = freqStr.toLowerCase();
    if (f.includes("6 hrs")) freq = 4;
    else if (f.includes("8 hrs")) freq = 3;
    else if (f.includes("12 hrs") || f.includes("twice")) freq = 2;
    else if (f.includes("thrice")) freq = 3;
    else if (f.includes("once")) freq = 1;

    const d = durationStr.toLowerCase();
    const dMatch = d.match(/(\d+)/);
    if (dMatch) {
        days = parseInt(dMatch[1]);
        if (d.includes("week")) days *= 7;
        if (d.includes("month")) days *= 30;
    }

    return freq * days;
};

export const PrescriptionDocument: React.FC<PrescriptionDocumentProps> = ({
    prescription,
    patient: propPatient,
    doctor: propDoctor,
    hospital: propHospital
}) => {
    const rx = prescription || {};

    const patient =
        propPatient ||
        rx.patient ||
        rx.appointment?.patient ||
        rx.appointment?.patientDetails ||
        {};

    const doctor =
        propDoctor ||
        rx.doctor ||
        rx.appointment?.doctor ||
        {};

    const hospital =
        propHospital ||
        rx.hospital ||
        rx.appointment?.hospital ||
        {
            name: 'KADAPA MULTI-SPECIALITY',
            address: 'Kadapa, Andhra Pradesh, India'
        };

    const patientAge = patient.user?.age || patient.age || rx.appointment?.patientDetails?.age || rx.age || 'N/A';
    const patientGender = patient.user?.gender || patient.gender || rx.appointment?.patientDetails?.gender || rx.gender || 'N/A';
    const patientName = patient.user?.name || patient.name || rx.appointment?.patient?.name || 'NAME';
    const patientMrn = patient.mrn || rx.user?.mrn || rx.appointment?.mrn || rx.mrn || 'N/A';

    const docName = doctor.user?.name || doctor.name || 'Medical Officer';
    const formattedDocName = docName.toLowerCase().startsWith('dr.') ? docName : `Dr. ${docName}`;

    const displayDate = new Date(rx.prescriptionDate || rx.createdAt || new Date()).toLocaleDateString('en-GB');

    return (
        <div className="relative font-sans print-prescription-document"
            style={{
                width: '210mm',
                minHeight: '297mm',
                margin: '0 auto',
                padding: '10mm 15mm',
                boxSizing: 'border-box',
                backgroundColor: 'white',
                color: '#000',
                display: 'flex',
                flexDirection: 'column'
            }}>

            <style>
                {`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
                
                @media print {
                    @page { size: A4; margin: 0; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }

                .print-prescription-document {
                    font-family: 'Inter', 'Segoe UI', Roboto, sans-serif !important;
                }
                `}
            </style>

            {/* --- MainHeader Replacement --- */}
            <div style={{ width: '100%', backgroundColor: '#ffffff', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', padding: '15px 0' }}>
                    <div style={{ flex: '0 0 fit-content', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingRight: '10px' }}>
                        {hospital?.logo ? <img src={hospital.logo} style={{ maxWidth: '200px', maxHeight: '140px', objectFit: 'contain' }} alt="Hospital Logo" /> : <div style={{ width: '120px', height: '120px', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '10px', fontWeight: 'bold' }}>LOGO</div>}
                    </div>
                    <div style={{ width: '1px', height: '100px', backgroundColor: '#e2e8f0', margin: '0 20px 0 15px' }}></div>
                    <div style={{ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                        <h1 style={{ margin: '0', fontWeight: '800', color: '#1e40af', fontSize: '28px', lineHeight: '1.2' }}>{hospital?.name || 'KADAPA MULTI-SPECIALITY'}</h1>
                        <div style={{ backgroundColor: '#22c55e', color: '#ffffff', padding: '4px 12px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', marginTop: '2px' }}>
                            <span>📞</span>
                            <span>{hospital?.phone || '+91 8562 245555'}</span>
                        </div>
                        <div style={{ color: '#1d4ed8', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>✉️</span>
                            <span>{hospital?.email || 'hospital@example.com'}</span>
                        </div>
                        <p style={{ margin: '0', fontSize: '10px', color: '#64748b', fontWeight: '700', lineHeight: '1.4', textTransform: 'uppercase' }}>{hospital?.address || 'RIMS ROAD, PUTLAMPALLI, KADAPA, AP'}</p>
                    </div>
                </div>
                <div style={{ width: '100%', height: '4px', backgroundColor: '#22c55e', borderRadius: '2px' }}></div>
            </div>

            <div style={{ flex: '1' }}>
                {/* Info Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #eee' }}>
                    <div>
                        <span style={{ display: 'block', fontSize: '8px', fontWeight: '700', textTransform: 'uppercase', color: '#777', marginBottom: '2px', letterSpacing: '0.5px' }}>Patient Name</span>
                        <span style={{ fontSize: '11px', fontWeight: '600' }}>{patientName?.toUpperCase()}</span>
                    </div>
                    <div>
                        <span style={{ display: 'block', fontSize: '8px', fontWeight: '700', textTransform: 'uppercase', color: '#777', marginBottom: '2px', letterSpacing: '0.5px' }}>Age / Gender</span>
                        <span style={{ fontSize: '11px', fontWeight: '600' }}>{patientAge} Y / {patientGender?.toUpperCase()}</span>
                    </div>
                    <div>
                        <span style={{ display: 'block', fontSize: '8px', fontWeight: '700', textTransform: 'uppercase', color: '#777', marginBottom: '2px', letterSpacing: '0.5px' }}>MRN Number</span>
                        <span style={{ fontSize: '11px', fontWeight: '600' }}>{patientMrn}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <span style={{ display: 'block', fontSize: '8px', fontWeight: '700', textTransform: 'uppercase', color: '#777', marginBottom: '2px', letterSpacing: '0.5px' }}>Date</span>
                        <span style={{ fontSize: '11px', fontWeight: '600' }}>{displayDate}</span>
                    </div>
                </div>

                {/* Diagnosis */}
                <div style={{ marginBottom: '15px' }}>
                    <span style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', color: '#777', letterSpacing: '0.5px' }}>Provisional Diagnosis:</span>
                    <span style={{ fontSize: '11px', fontWeight: '700', marginLeft: '5px', color: '#000' }}>{rx.diagnosis || 'General Consultation'}</span>
                </div>

                {/* Medicines Table */}
                <div style={{ marginTop: '10px' }}>
                    <h3 style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', color: '#000', borderBottom: '1px solid #000', paddingBottom: '4px', marginBottom: '8px', letterSpacing: '0.5px' }}>Prescribed Medications</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '25px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #eee' }}>
                                <th style={{ textAlign: 'left', fontSize: '8px', fontWeight: '700', textTransform: 'uppercase', color: '#777', padding: '0 0 6px 0', width: '45%' }}>MEDICINE</th>
                                <th style={{ textAlign: 'left', fontSize: '8px', fontWeight: '700', textTransform: 'uppercase', color: '#777', padding: '0 0 6px 0', width: '15%' }}>DOSAGE</th>
                                <th style={{ textAlign: 'left', fontSize: '8px', fontWeight: '700', textTransform: 'uppercase', color: '#777', padding: '0 0 6px 0', width: '20%' }}>FREQUENCY</th>
                                <th style={{ textAlign: 'left', fontSize: '8px', fontWeight: '700', textTransform: 'uppercase', color: '#777', padding: '0 0 6px 0', width: '10%' }}>DAYS</th>
                                <th style={{ textAlign: 'right', fontSize: '8px', fontWeight: '700', textTransform: 'uppercase', color: '#777', padding: '0 0 6px 0', width: '10%' }}>QTY</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rx.medicines?.map((med: Medicine, idx: number) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                    <td style={{ padding: '8px 0', verticalAlign: 'top' }}>
                                        <div style={{ fontSize: '11px', fontWeight: '700' }}>{med.name}</div>
                                    </td>
                                    <td style={{ padding: '8px 0', verticalAlign: 'top', fontSize: '10px', color: '#444' }}>{med.dosage}</td>
                                    <td style={{ padding: '8px 0', verticalAlign: 'top', fontSize: '10px', color: '#444' }}>{med.frequency}</td>
                                    <td style={{ padding: '8px 0', verticalAlign: 'top', fontSize: '10px', color: '#444' }}>{med.duration}</td>
                                    <td style={{ padding: '8px 0', textAlign: 'right', verticalAlign: 'top', fontSize: '10px', color: '#444' }}>{calculateQty(med.frequency, med.duration)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Advice Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '20px' }}>
                    {(rx.advice || rx.dietAdvice?.length > 0) && (
                        <div>
                            <h3 style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', color: '#000', borderBottom: '1px solid #000', paddingBottom: '4px', marginBottom: '8px', letterSpacing: '0.5px' }}>Dietary & Lifestyle Advice</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {rx.advice && <div style={{ fontSize: '10px', color: '#000', fontWeight: '600', paddingLeft: '10px', position: 'relative' }}>• {rx.advice}</div>}
                                {rx.dietAdvice?.map((item: string, idx: number) => (
                                    <div key={idx} style={{ fontSize: '10px', color: '#000', fontWeight: '600', paddingLeft: '10px', position: 'relative' }}>• {item}</div>
                                ))}
                            </div>
                        </div>
                    )}
                    {rx.suggestedTests?.length > 0 && (
                        <div>
                            <h3 style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', color: '#000', borderBottom: '1px solid #000', paddingBottom: '4px', marginBottom: '8px', letterSpacing: '0.5px' }}>Suggested Investigations</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {rx.suggestedTests?.map((item: string, idx: number) => (
                                    <div key={idx} style={{ fontSize: '10px', color: '#000', fontWeight: '600', paddingLeft: '10px', position: 'relative' }}>• {item}</div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {rx.avoid?.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', color: '#dc2626', borderBottom: '1px solid #dc2626', paddingBottom: '4px', marginBottom: '8px', letterSpacing: '0.5px' }}>Contraindications / Things to Avoid</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            {rx.avoid?.map((item: string, idx: number) => (
                                <div key={idx} style={{ fontSize: '10px', color: '#dc2626', fontWeight: '600', paddingLeft: '10px', position: 'relative' }}>• {item}</div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Follow-up */}
                <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', fontSize: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0' }}>
                    <div><span style={{ fontWeight: '700', textTransform: 'uppercase', fontSize: '8px', color: '#64748b', marginRight: '4px' }}>Special Instructions:</span> {rx.instructions || 'N/A'}</div>
                    {rx.followUpDate ? (
                        <div>
                            <span style={{ fontWeight: '700', textTransform: 'uppercase', fontSize: '8px', color: '#64748b', marginRight: '4px' }}>Next Review On:</span>
                            <span style={{ fontWeight: '700', color: '#1e40af' }}>{new Date(rx.followUpDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                    ) : null}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <div style={{ textAlign: 'center', width: '150px' }}>
                        <div style={{ height: '35px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                            {doctor.signature ? (
                                <img src={doctor.signature} alt="Signature" style={{ height: '35px', objectFit: 'contain' }} />
                            ) : (
                                <div style={{ height: '20px' }} />
                            )}
                        </div>
                        <div style={{ borderTop: '1px solid #000', paddingTop: '4px' }}>
                            <div style={{ fontSize: '8px', fontWeight: '700', textTransform: 'uppercase' }}>{formattedDocName}</div>
                            <div style={{ fontSize: '7px', color: '#64748b', fontWeight: '700', marginTop: '2px' }}>AUTHORISED SIGNATORY</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- MainFooter Replacement --- */}
            <div style={{ width: '100%', marginTop: '30px' }}>
                <div style={{ display: 'flex', height: '35px', marginBottom: '12px', position: 'relative' }}>
                    <div style={{ flex: '1', background: '#22c55e', color: '#ffffff', display: 'flex', alignItems: 'center', padding: '0 35px', fontWeight: '900', fontSize: '14px', clipPath: 'polygon(0 0, 100% 0, 92% 100%, 0 100%)', zIndex: 2 }}>
                        <span style={{ marginRight: '8px' }}>📞</span>
                        {hospital?.phone || '+91 8562 245555'}
                    </div>
                    <div style={{ flex: '1', background: '#3b82f6', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '14px', clipPath: 'polygon(8% 0, 100% 0, 100% 100%, 0 100%)', marginLeft: '-35px', zIndex: 1, paddingLeft: '35px' }}>
                        <span style={{ marginRight: '8px' }}>✉️</span>
                        {hospital?.email || 'hospital@example.com'}
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '8px' }}>
                    <div style={{ flex: '1.5', fontSize: '9px', color: '#000000', fontWeight: '700', lineHeight: '1.4' }}>
                        <ul style={{ listStyle: 'none', padding: '0', margin: '0' }}>
                            <li>• All results should be co-related clinically</li>
                            <li>• If results are alarming or unexpected, contact the Helpdesk immediately</li>
                            <li>• Not valid for medico-legal purposes</li>
                            <li>• The test with an asterisk(*) are not accredited by NABL</li>
                        </ul>
                    </div>
                    <div style={{ flex: '1.2', textAlign: 'right', fontSize: '9px', fontWeight: '800', color: '#000000', textTransform: 'uppercase', lineHeight: '1.3' }}>
                        {hospital?.address || 'RIMS ROAD, PUTLAMPALLI, KADAPA, AP'}
                    </div>
                </div>
                <div style={{ textAlign: 'center', fontSize: '9px', color: '#000000', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #f1f5f9', fontWeight: '600' }}>
                    This is a computer generated document and does not require a physical signature.
                </div>
            </div>

        </div>
    );
};