import React, { forwardRef } from 'react';
import { LabSample } from '@/lib/integrations/types/labSample';
import HeaderPrint from './HeaderPrint';
import FooterPrint from './FooterPrint';


interface LabReportTemplateProps {
    sample: LabSample;
    labInfo?: {
        name: string;
        tagline: string;
        address: string;
        phone: string;
        email: string;
        logo?: string;
    };
}

const LabReportTemplate = forwardRef<HTMLDivElement, LabReportTemplateProps>(
    ({ sample, labInfo }, ref) => {
        const defaultLabInfo = {
            name: labInfo?.name || 'MS CURE CHAIN',
            tagline: labInfo?.tagline || 'Advanced Diagnostic Laboratory',
            address: labInfo?.address || '123 Medical Plaza, Healthcare District',
            phone: labInfo?.phone || '+91 98765 43210',
            email: labInfo?.email || 'lab@mscurechain.com',
            logo: labInfo?.logo,
        };

        const formatDate = (dateString?: string) => {
            if (!dateString) return new Date().toLocaleDateString('en-IN');
            return new Date(dateString).toLocaleDateString('en-IN');
        };

        const formatTime = (dateString?: string) => {
            if (!dateString) return new Date().toLocaleTimeString('en-IN');
            return new Date(dateString).toLocaleTimeString('en-IN');
        };

        const hasTestResults = (test: any) => {
            if (test.resultParameters?.length > 0) {
                const ok = test.subTests?.some((st: any) =>
                    st.result !== undefined && st.result !== null && st.result !== ''
                );
                if (ok) return true;
            }
            if (test.subTests?.some((st: any) =>
                st.result !== undefined && st.result !== null && st.result !== ''
            )) return true;
            const r = test.result || test.resultValue;
            return r && r.toString().trim() !== '';
        };

        return (
            /* ref wrapper — this is what react-to-print copies */
            <div ref={ref} style={{ padding: 0, background: '#fff', fontFamily: '"Segoe UI", Arial, sans-serif' }}>

                {/* ── Screen-only styles (no @media print — that lives in pageStyle) ── */}
                <style>{`
                    .print-content {
                        display: flex;
                        flex-direction: column;
                        width: 100%;
                        max-width: 210mm;
                        min-height: 295mm; /* A4 height approx */
                        margin: 0 auto;
                        border: 2px solid #000;
                        box-sizing: border-box;
                        position: relative;
                        background: #ffffff;
                        color: #000;
                        padding-bottom: 15px; /* Prevent footer cutoff */
                    }
                    @media (min-width: 800px) {
                        .print-content { border-width: 3px; }
                        .report-body   { padding: 20px !important; }
                        .lab-patient-grid {
                            grid-template-columns: 1fr 1fr !important;
                            font-size: 13px !important;
                            gap: 15px !important;
                            margin: 20px 0 !important;
                        }
                        .lab-test-title { font-size: 20px !important; margin: 20px 0 12px !important; }
                        .lab-test-table { font-size: 13px !important; }
                        .lab-test-table th,
                        .lab-test-table td { padding: 8px 10px !important; }
                    }
                    .report-body {
                        flex: 1 1 auto;
                        padding: 12px;
                        box-sizing: border-box;
                        position: relative;
                    }
                    .lab-print-footer {
                        margin-top: auto;
                        flex-shrink: 0;
                        position: relative;
                        width: 100%;
                        box-sizing: border-box;
                    }
                    .lab-patient-grid {
                        display: grid;
                        grid-template-columns: 1fr;
                        gap: 10px;
                        margin: 15px 0;
                        font-size: 11px;
                    }
                    .lab-test-title {
                        font-size: 16px;
                        margin: 12px 0 8px;
                        text-align: center;
                        border-bottom: 2px solid #ddd;
                        padding-bottom: 6px;
                    }
                    .lab-test-table {
                        font-size: 11px;
                        width: 100%;
                        border-collapse: collapse;
                        table-layout: fixed;
                    }
                    .lab-test-table th,
                    .lab-test-table td {
                        padding: 5px 6px;
                        border: 1px solid #d0d0d0;
                        text-align: left;
                        vertical-align: top;
                        word-wrap: break-word;
                        overflow-wrap: break-word;
                    }
                    .lab-test-table th {
                        background: rgba(242, 246, 251, 0.6);
                        font-weight: 600;
                    }
                    .test-section { margin-bottom: 24px; }
                `}</style>

                {/* ══════════════════════════════════════════════
                    REPORT — border box wraps all content + footer
                ══════════════════════════════════════════════ */}
                <div className="print-content">

                    {/* Watermark */}
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%) rotate(-35deg)',
                        fontSize: '40px',
                        color: 'rgba(0,0,0,0.04)',
                        fontWeight: 700,
                        letterSpacing: '4px',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        zIndex: 0,
                        userSelect: 'none',
                    }}>
                        {defaultLabInfo.name}
                    </div>

                    {/* ── Main body (flex:1 → pushes footer to bottom) ── */}
                    <div className="report-body">

                        {/* Header */}
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <HeaderPrint />
                        </div>

                        {/* Patient details */}
                        <div className="lab-patient-grid" style={{ position: 'relative', zIndex: 1 }}>
                            <div style={{ lineHeight: 1.7 }}>
                                <strong>Patient Name:</strong> {sample.patientDetails.name}<br />
                                <strong>Age / Sex:</strong> {sample.patientDetails.age} Years / {sample.patientDetails.gender}<br />
                                <strong>Patient ID:</strong> {sample.sampleId}
                            </div>
                            <div style={{ lineHeight: 1.7 }}>
                                <strong>Sample Collected At:</strong> {formatDate(sample.collectionDate)} {formatTime(sample.collectionDate)}<br />
                                <strong>Referred By:</strong> {sample.patientDetails.refDoctor || sample.referredBy || 'Self'}<br />
                                <strong>Report Date:</strong> {formatDate(sample.reportDate)}
                            </div>
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '8px 0 16px' }} />

                        {/* Test Results */}
                        {sample.tests.map((test, testIdx) => {
                            if (!hasTestResults(test)) return null;

                            const validParams = (test.resultParameters ?? []).filter((param: any) => {
                                const sub = test.subTests?.find((st: any) =>
                                    st.name === param.label || st.name === param.key
                                );
                                return sub && sub.result !== undefined && sub.result !== null && sub.result !== '';
                            });

                            const adhocSubTests = !validParams.length && test.subTests
                                ? test.subTests.filter((st: any) =>
                                    st.result !== undefined && st.result !== null && st.result !== ''
                                )
                                : [];

                            const mainRes = (test as any).result || test.resultValue;
                            const hasMainResult =
                                !validParams.length && !adhocSubTests.length &&
                                mainRes && mainRes.toString().trim() !== '';

                            return (
                                <div key={testIdx} className="test-section">
                                    <h2 className="lab-test-title">{test.testName}</h2>
                                    <table className="lab-test-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '40%' }}>Investigation</th>
                                                <th style={{ width: '35%' }}>Result</th>
                                                <th style={{ width: '25%' }}>Unit</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {validParams.map((param: any, idx: number) => {
                                                const sub = test.subTests?.find(
                                                    st => st.name === param.label || st.name === param.key
                                                );
                                                if (!sub) return null;
                                                return (
                                                    <tr key={`p-${idx}`}>
                                                        <td>{param.label}</td>
                                                        <td style={{ fontWeight: 'bold' }}>{sub.result}</td>
                                                        <td>{sub.unit || param.unit || '-'}</td>
                                                    </tr>
                                                );
                                            })}
                                            {!validParams.length && adhocSubTests.map((st: any, idx: number) => (
                                                <tr key={`a-${idx}`}>
                                                    <td>{st.name}</td>
                                                    <td style={{ fontWeight: 'bold' }}>{st.result}</td>
                                                    <td>{st.unit || '-'}</td>
                                                </tr>
                                            ))}
                                            {!validParams.length && !adhocSubTests.length && hasMainResult && (
                                                <tr>
                                                    <td>{test.testName}</td>
                                                    <td style={{ fontWeight: 'bold' }}>{(test as any).result || test.resultValue}</td>
                                                    <td>{test.unit || '-'}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                    {test.remarks && (
                                        <div style={{ marginTop: '8px', fontSize: '13px', color: '#555' }}>
                                            <strong>Remarks:</strong> {test.remarks}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Interpretation */}
                        <div style={{
                            marginTop: '20px',
                            marginBottom: '8px',
                            border: '1px solid #d0d0d0',
                            borderRadius: '4px',
                            padding: '12px 15px',
                            position: 'relative',
                            zIndex: 1,
                        }}>
                            <h3 style={{ margin: '0 0 8px', fontSize: '15px', textDecoration: 'underline', color: '#0a5aa8' }}>
                                Interpretation
                            </h3>
                            <p style={{ margin: 0, fontSize: '13px', fontStyle: 'italic', color: '#444' }}>
                                Possible Interpretation results are generated based on the test values.
                                Please consult with the doctor for clinical correlation.
                            </p>
                        </div>

                    </div>{/* ── end .report-body ── */}

                    {/* ══ Footer — always last child, inside border ══ */}
                    <div className="lab-print-footer">
                        <FooterPrint />
                    </div>

                </div>{/* ── end .print-content ── */}
            </div>
        );
    }
);

LabReportTemplate.displayName = 'LabReportTemplate';

export default LabReportTemplate;
