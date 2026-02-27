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
            logo: labInfo?.logo
        };

        const formatDate = (dateString?: string) => {
            if (!dateString) return new Date().toLocaleDateString('en-IN');
            return new Date(dateString).toLocaleDateString('en-IN');
        };

        const formatTime = (dateString?: string) => {
            if (!dateString) return new Date().toLocaleTimeString('en-IN');
            return new Date(dateString).toLocaleTimeString('en-IN');
        };

        // Helper: Determine if test has result data
        const hasTestResults = (test: any) => {
            // Check if there are configured resultParameters with values
            if ((test as any).resultParameters && (test as any).resultParameters.length > 0) {
                const hasParamValues = test.subTests?.some((st: any) =>
                    st.result !== undefined && st.result !== null && st.result !== ''
                );
                if (hasParamValues) return true;
            }

            // Fallback: Check for top-level result value (legacy tests)
            if (test.resultValue && test.resultValue.toString().trim()) return true;

            return false;
        };

        return (
            <div ref={ref} style={{ padding: '20px', background: '#fff' }}>
                {/* Print-specific styles */}
                <style dangerouslySetInnerHTML={{
                    __html: `
                        @page {
                            size: A4;
                            margin: 15mm;
                        }
                        
                        @media print {
                            html, body {
                                margin: 0;
                                padding: 0;
                            }
                            
                            .print-content {
                                display: block !important;
                                visibility: visible !important;
                                position: relative !important;
                                width: 100% !important;
                                min-height: auto !important;
                                height: auto !important;
                                border: 3px solid #000 !important;
                                box-shadow: inset 0 0 0 1px #000 !important;
                                box-sizing: border-box !important;
                                page-break-after: auto !important;
                                page-break-before: auto !important;
                                overflow: visible !important;
                            }

                            .print-content * {
                                visibility: visible !important;
                            }

                            .watermark {
                                position: fixed !important;
                                top: 50% !important;
                                left: 50% !important;
                                transform: translate(-50%, -50%) rotate(-30deg) !important;
                                z-index: 0 !important;
                            }

                            .test-section {
                                page-break-inside: avoid !important;
                                position: relative !important;
                                z-index: 1 !important;
                            }

                            table {
                                page-break-inside: auto !important;
                                background: transparent !important;
                                position: relative !important;
                                z-index: 1 !important;
                            }

                            table thead,
                            table tbody,
                            table tfoot {
                                background: transparent !important;
                            }

                            table th {
                                background: rgba(242, 246, 251, 0.8) !important;
                                position: relative !important;
                                z-index: 1 !important;
                            }

                            table td {
                                background: transparent !important;
                                position: relative !important;
                                z-index: 1 !important;
                            }

                            tr {
                                page-break-inside: avoid !important;
                                page-break-after: auto !important;
                                background: transparent !important;
                            }

                            thead {
                                display: table-header-group !important;
                            }

                            tfoot {
                                display: table-footer-group !important;
                            }
                        }
                    `
                }} />

                <div className="print-content bg-white" style={{
                    fontFamily: '"Segoe UI", Arial, sans-serif',
                    background: '#ffffff',
                    width: '100%',
                    minHeight: '297mm',
                    margin: '0 auto',
                    padding: '26px',
                    border: '3px solid #000',
                    boxShadow: 'inset 0 0 0 1px #000',
                    position: 'relative',
                    color: '#000',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{ flexGrow: 1 }}>
                        {/* Watermark */}
                        <div className="watermark" style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%) rotate(-35deg)',
                            fontSize: '60px',
                            color: 'rgba(0, 0, 0, 0.08)',
                            fontWeight: 700,
                            letterSpacing: '6px',
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none',
                            zIndex: 0,
                            visibility: 'visible'
                        }}>
                            {defaultLabInfo.name}
                        </div>

                        {/* Header Component */}
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <HeaderPrint />
                        </div>

                        {/* Patient Details */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            margin: '25px 0',
                            fontSize: '14px',
                            position: 'relative',
                            zIndex: 1
                        }}>
                            <div style={{ width: '48%', lineHeight: 1.6 }}>
                                <strong>Patient Name:</strong> {sample.patientDetails.name}<br />
                                <strong>Age / Sex:</strong> {sample.patientDetails.age} Years / {sample.patientDetails.gender}<br />
                                <strong>Patient ID:</strong> {sample.sampleId}
                            </div>
                            <div style={{ width: '48%', lineHeight: 1.6 }}>
                                <strong>Sample Collected At:</strong> {formatDate(sample.collectionDate)} {formatTime(sample.collectionDate)}<br />
                                <strong>Referred By:</strong> {sample.patientDetails.refDoctor || sample.referredBy || 'Self'}<br />
                                <strong>Report Date:</strong> {formatDate(sample.reportDate)}
                            </div>
                        </div>

                        {/* Test Results */}
                        {/* Test Results - Strictly filtered by Config */}
                        {sample.tests.map((test, testIdx) => {
                            // If absolutely no data, skip
                            if (!hasTestResults(test)) {
                                return null;
                            }

                            // 1. Try to match with resultParameters (Preferred)
                            const validParams = test.resultParameters ? test.resultParameters.filter((param: any) => {
                                const subTest = test.subTests?.find((st: any) => st.name === param.label || st.name === param.key);
                                return subTest && subTest.result !== undefined && subTest.result !== null && subTest.result !== '';
                            }) : [];

                            // 2. Fallback: Check for any sub-tests that have results (Ad-hoc / Mismatched Config)
                            const adhocSubTests = (!validParams.length && test.subTests)
                                ? test.subTests.filter((st: any) => st.result !== undefined && st.result !== null && st.result !== '')
                                : [];

                            // 3. Fallback: Check for main result
                            const hasMainResult = (!validParams.length && !adhocSubTests.length) && test.resultValue && test.resultValue.toString().trim() !== '';


                            return (
                                <div key={testIdx} className="test-section" style={{ marginBottom: '30px' }}>
                                    <h2 style={{
                                        textAlign: 'center',
                                        margin: '25px 0 15px',
                                        fontSize: '22px',
                                        borderBottom: '2px solid #ddd',
                                        paddingBottom: '6px',
                                        position: 'relative',
                                        zIndex: 1
                                    }}>{test.testName}</h2>
                                    <table style={{
                                        width: '100%',
                                        borderCollapse: 'collapse',
                                        fontSize: '14px',
                                        position: 'relative',
                                        zIndex: 1
                                    }}>
                                        <thead>
                                            <tr>
                                                <th style={{ border: '1px solid #d0d0d0', padding: '8px 10px', background: 'rgba(242, 246, 251, 0.6)', textAlign: 'left', fontWeight: 600, color: '#000' }}>Investigation</th>
                                                <th style={{ border: '1px solid #d0d0d0', padding: '8px 10px', background: 'rgba(242, 246, 251, 0.6)', textAlign: 'left', fontWeight: 600, color: '#000' }}>Result</th>
                                                <th style={{ border: '1px solid #d0d0d0', padding: '8px 10px', background: 'rgba(242, 246, 251, 0.6)', textAlign: 'left', fontWeight: 600, color: '#000' }}>Unit</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* Priority 1: Config Matched Params */}
                                            {validParams.length > 0 && validParams.map((param: any, paramIdx: number) => {
                                                const subTest = test.subTests?.find(st => st.name === param.label || st.name === param.key);
                                                if (!subTest) return null;
                                                return (
                                                    <tr key={`p-${paramIdx}`}>
                                                        <td style={{ border: '1px solid #d0d0d0', padding: '8px 10px', color: '#000' }}>{param.label}</td>
                                                        <td style={{ border: '1px solid #d0d0d0', padding: '8px 10px', color: '#000', fontWeight: 'bold' }}>{subTest.result}</td>
                                                        <td style={{ border: '1px solid #d0d0d0', padding: '8px 10px', color: '#000' }}>{subTest.unit || param.unit || '-'}</td>
                                                    </tr>
                                                );
                                            })}

                                            {/* Priority 2: Ad-hoc Sub Tests (Fallback) */}
                                            {validParams.length === 0 && adhocSubTests.length > 0 && adhocSubTests.map((st: any, stIdx: number) => (
                                                <tr key={`a-${stIdx}`}>
                                                    <td style={{ border: '1px solid #d0d0d0', padding: '8px 10px', color: '#000' }}>{st.name}</td>
                                                    <td style={{ border: '1px solid #d0d0d0', padding: '8px 10px', color: '#000', fontWeight: 'bold' }}>{st.result}</td>
                                                    <td style={{ border: '1px solid #d0d0d0', padding: '8px 10px', color: '#000' }}>{st.unit || '-'}</td>
                                                </tr>
                                            ))}

                                            {/* Priority 3: Main Result (Fallback) */}
                                            {validParams.length === 0 && adhocSubTests.length === 0 && hasMainResult && (
                                                <tr>
                                                    <td style={{ border: '1px solid #d0d0d0', padding: '8px 10px', color: '#000' }}>{test.testName}</td>
                                                    <td style={{ border: '1px solid #d0d0d0', padding: '8px 10px', color: '#000', fontWeight: 'bold' }}>{test.resultValue}</td>
                                                    <td style={{ border: '1px solid #d0d0d0', padding: '8px 10px', color: '#000' }}>{test.unit || '-'}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                    {test.remarks && (
                                        <div style={{ marginTop: '10px', fontSize: '13px', color: '#555', paddingLeft: '4px' }}>
                                            <strong>Overall Remarks:</strong> {test.remarks}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Interpretation Section */}
                        <div style={{
                            marginTop: '30px',
                            marginBottom: '20px',
                            border: '1px solid #d0d0d0',
                            borderRadius: '4px',
                            padding: '15px',
                            position: 'relative',
                            zIndex: 1,
                            visibility: 'visible'
                        }}>
                            <h3 style={{
                                margin: '0 0 10px 0',
                                fontSize: '16px',
                                textDecoration: 'underline',
                                color: '#0a5aa8'
                            }}>Interpretation</h3>
                            <p style={{ margin: 0, fontSize: '14px', fontStyle: 'italic', color: '#444' }}>
                                Possible Interpretation results are generated based on the test values. Please consult with the doctor for clinical correlation.
                            </p>
                        </div>
                    </div>

                    {/* Footer Component */}
                    <div style={{ marginTop: '30px', position: 'relative', zIndex: 1 }}>
                        <FooterPrint />
                    </div>
                </div>
            </div>
        );
    }
);

LabReportTemplate.displayName = 'LabReportTemplate';

export default LabReportTemplate;