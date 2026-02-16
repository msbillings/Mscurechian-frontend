
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
                height: '296mm',
                margin: '0 auto',
                padding: '12mm 15mm 12mm 25mm',
                boxSizing: 'border-box',
                backgroundColor: 'white',
                overflow: 'hidden',
                color: '#000'
            }}>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: '900', margin: '0', letterSpacing: '0.05em' }}>{hospital.name.toUpperCase()}</h1>
                <p style={{ fontSize: '10px', margin: '2px 0', color: '#333' }}>{hospital.address}</p>
            </div>

            <div style={{ textAlign: 'right', marginBottom: '5px' }}>
                <p style={{ fontSize: '9px', fontWeight: 'bold', margin: '0', textTransform: 'uppercase' }}>Consultant Physician</p>
            </div>

            <hr style={{ border: '0', borderTop: '1px solid #000', margin: '5px 0' }} />

            {/* Info Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.5fr 1fr', gap: '10px', fontSize: '11px', padding: '10px 0' }}>
                <div>
                    <p style={{ margin: '0' }}><span style={{ fontWeight: 'bold' }}>NAME:</span> {patientName?.toUpperCase()}</p>
                </div>
                <div>
                    <p style={{ margin: '0' }}><span style={{ fontWeight: 'bold' }}>AGE / GENDER:</span> {patientAge} Y / {patientGender?.toUpperCase()}</p>
                </div>
                <div>
                    <p style={{ margin: '0' }}><span style={{ fontWeight: 'bold' }}>ID:</span> {patientMrn}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: '0' }}><span style={{ fontWeight: 'bold' }}>DATE:</span> {displayDate}</p>
                </div>
            </div>

            <hr style={{ border: '0', borderTop: '1px solid #000', margin: '5px 0' }} />

            {/* Diagnosis */}
            <div style={{ margin: '20px 0', fontSize: '12px' }}>
                <p style={{ margin: '0' }}><span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>Diagnosis:</span> {rx.diagnosis || 'General Consultation'}</p>
            </div>

            {/* Medicines Table */}
            <div style={{ marginTop: '25px' }}>
                <h3 style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '10px' }}>Medications</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                        <tr style={{ borderBottom: '1.5px solid #000' }}>
                            <th style={{ textAlign: 'left', padding: '8px 0', width: '40%' }}>MEDICINE</th>
                            <th style={{ textAlign: 'left', padding: '8px 0' }}>DOSAGE</th>
                            <th style={{ textAlign: 'left', padding: '8px 0' }}>FREQUENCY</th>
                            <th style={{ textAlign: 'left', padding: '8px 0' }}>DAYS</th>
                            <th style={{ textAlign: 'right', padding: '8px 0' }}>QTY</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rx.medicines?.map((med: Medicine, idx: number) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '8px 0', fontWeight: 'bold' }}>{med.name}</td>
                                <td style={{ padding: '8px 0' }}>{med.dosage}</td>
                                <td style={{ padding: '8px 0' }}>{med.frequency}</td>
                                <td style={{ padding: '8px 0' }}>{med.duration}</td>
                                <td style={{ padding: '8px 0', textAlign: 'right' }}>{calculateQty(med.frequency, med.duration)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Advice Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '30px', fontSize: '10px' }}>
                <div>
                    <h3 style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #eee', paddingBottom: '4px', marginBottom: '8px' }}>Advice & Diet</h3>
                    <div style={{ paddingLeft: '5px' }}>
                        {rx.advice && <p style={{ margin: '4px 0' }}>• {rx.advice}</p>}
                        {rx.dietAdvice?.map((item: string, idx: number) => (
                            <p key={idx} style={{ margin: '4px 0' }}>• {item}</p>
                        ))}
                    </div>
                </div>
                <div>
                    <h3 style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #eee', paddingBottom: '4px', marginBottom: '8px' }}>Tests & Restrictions</h3>
                    <div style={{ paddingLeft: '5px' }}>
                        {rx.suggestedTests?.map((item: string, idx: number) => (
                            <p key={idx} style={{ margin: '4px 0' }}>• Test: {item}</p>
                        ))}
                        {rx.avoid?.map((item: string, idx: number) => (
                            <p key={idx} style={{ margin: '4px 0', color: '#dc2626' }}>• Avoid: {item}</p>
                        ))}
                    </div>
                </div>
            </div>

            {/* Follow-up */}
            <div style={{ marginTop: '40px', padding: '10px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #f3f4f6', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ margin: '0' }}><span style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#4b5563' }}>Follow Up Date:</span> <span style={{ fontWeight: '900', color: '#d946ef', marginLeft: '5px' }}>{rx.followUpDate ? new Date(rx.followUpDate).toLocaleDateString() : 'N/A'}</span></p>
                {rx.followUpDate && <p style={{ margin: '0', fontSize: '10px', color: '#6b7280', fontStyle: 'italic' }}>Please bring this prescription for your follow-up visit.</p>}
            </div>

            {/* Footer */}
            <div style={{ position: 'absolute', bottom: '30px', left: '25mm', right: '15mm', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '9px' }}>
                <div style={{ color: '#666' }}>
                    <p style={{ margin: '0' }}>Generated by MsCureChain Systems</p>
                    <p style={{ margin: '0' }}>Validity 30 days</p>
                </div>
                <div style={{ textAlign: 'center', width: '200px' }}>
                    <div style={{ height: '50px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                        {doctor.signature ? (
                            <img src={doctor.signature} alt="Signature" style={{ height: '40px', objectFit: 'contain' }} />
                        ) : (
                            <div style={{ height: '20px' }} />
                        )}
                    </div>
                    <div style={{ borderTop: '1px solid #000', paddingTop: '5px' }}>
                        <p style={{ fontWeight: 'bold', textTransform: 'uppercase', margin: '0' }}>Authorized Signature</p>
                        <p style={{ fontSize: '9px', margin: '2px 0' }}>{formattedDocName}</p>
                    </div>
                </div>
            </div>

        </div>
    );
};
