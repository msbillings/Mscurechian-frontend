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
            if (!dateString) return new Date().toLocaleDateString('en-IN').replace(/\//g, '-');
            const d = new Date(dateString);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}-${month}-${year}`;
        };

        const formatTime = (dateString?: string) => {
            if (!dateString) return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
            return new Date(dateString).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
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

        const getDisplayRangeObj = (test: any, sampleData: LabSample) => {
            if (!test.normalRanges) return null;
            const { age, gender } = sampleData.patientDetails;
            const ranges = test.normalRanges;
            let range;
            if (age === 0) { range = ranges.newborn || ranges.infant; }
            else if (age < 1) { range = ranges.infant; }
            else if (age < 12) { range = ranges.child; }
            else if (age > 60) { range = ranges.geriatric; }
            else if (gender?.toLowerCase() === 'male' || gender?.toLowerCase() === 'm') { range = ranges.male; }
            else { range = ranges.female; }
            
            if (!range) { range = (gender?.toLowerCase() === 'male' || gender?.toLowerCase() === 'm') ? ranges.male : ranges.female; }
            return range || null;
        };

        const getDisplayRangeText = (test: any, sampleData: LabSample, defaultRange?: string) => {
            const range = getDisplayRangeObj(test, sampleData);
            if (range) {
                if (range.text) return range.text;
                if (range.min !== undefined || range.max !== undefined) {
                    return `${range.min || ''} - ${range.max || ''}`;
                }
            }
            return defaultRange || test.normalRange || '';
        };

        const getResultFlag = (result: string, rangeObj: any, isAbnormal: boolean) => {
            if (!result) return '';
            
            if (rangeObj && (rangeObj.min !== undefined || rangeObj.max !== undefined)) {
                const val = parseFloat(result);
                if (!isNaN(val)) {
                    if (rangeObj.min !== undefined && val < rangeObj.min) return '(L) ';
                    if (rangeObj.max !== undefined && val > rangeObj.max) return '(H) ';
                }
            }
            if (isAbnormal) return '(B) ';
            return '';
        };

        return (
            <div ref={ref} style={{ padding: 0, background: '#fff', fontFamily: '"Segoe UI", Arial, sans-serif' }}>
                <style>{`
                    .print-content {
                        display: block;
                        width: 100%;
                        max-width: 210mm;
                        margin: 0 auto;
                        position: relative;
                        background: #ffffff;
                        color: #000;
                    }
                    @media (min-width: 800px) {
                        .report-body   { padding: 20px !important; }
                        .lab-patient-grid {
                            font-size: 13px !important;
                        }
                        .lab-test-table { font-size: 13px !important; }
                        .lab-test-table th,
                        .lab-test-table td { padding: 8px 10px !important; }
                    }
                    .report-body {
                        display: block;
                        padding: 12px;
                        box-sizing: border-box;
                        position: relative;
                    }
                    .lab-print-footer {
                        display: block;
                        position: relative;
                        width: 100%;
                        box-sizing: border-box;
                    }
                    .lab-patient-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 20px;
                        margin: 15px 0;
                        font-size: 12px;
                        background: #f8f9fa;
                        padding: 15px;
                        border-radius: 4px;
                    }
                    .info-row {
                        display: grid;
                        grid-template-columns: 120px 10px 1fr;
                        margin-bottom: 4px;
                    }
                    .info-label {
                        font-weight: 600;
                        color: #333;
                    }
                    .lab-test-title {
                        text-align: center;
                        margin: 15px 0;
                        color: #333;
                    }
                    .lab-test-dept {
                        font-size: 15px;
                        font-weight: bold;
                        text-transform: uppercase;
                        margin-bottom: 4px;
                    }
                    .lab-test-name {
                        font-size: 14px;
                        text-transform: uppercase;
                    }
                    .lab-test-table {
                        font-size: 12px;
                        width: 100%;
                        border-collapse: collapse;
                        table-layout: fixed;
                    }
                    .lab-test-table th,
                    .lab-test-table td {
                        padding: 6px 8px;
                        border: none;
                        border-bottom: none;
                        text-align: left;
                        vertical-align: top;
                        word-wrap: break-word;
                    }
                    .lab-test-table th {
                        font-weight: 700;
                        color: #000;
                        border-bottom: 2px solid #000;
                        text-transform: capitalize;
                    }
                    .test-section { margin-bottom: 24px; }
                `}</style>

                <div className="print-content">
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

                    <div className="report-body">
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <HeaderPrint />
                        </div>

                        <div style={{ textAlign: 'center', fontWeight: 'bold', margin: '10px 0', fontSize: '14px' }}>
                            TEST REPORT
                        </div>

                        <div className="lab-patient-grid" style={{ position: 'relative', zIndex: 1 }}>
                            <div>
                                <div className="info-row"><span className="info-label">Reg No</span><span>:</span><span>{sample.sampleId}</span></div>
                                <div className="info-row"><span className="info-label">Patient Name</span><span>:</span><span>{sample.patientDetails.name?.toUpperCase()}</span></div>
                                <div className="info-row"><span className="info-label">Age</span><span>:</span><span>{sample.patientDetails.age}Y</span></div>
                                <div className="info-row"><span className="info-label">Gender</span><span>:</span><span>{sample.patientDetails.gender?.charAt(0).toUpperCase()}</span></div>
                                <div className="info-row"><span className="info-label">Ref By</span><span>:</span><span>{sample.patientDetails.refDoctor || sample.referredBy || ''}</span></div>
                                <div className="info-row"><span className="info-label">Ref By Client</span><span>:</span><span>_</span></div>
                            </div>
                            <div>
                                <div className="info-row"><span className="info-label">Reg On</span><span>:</span><span>{formatDate(sample.createdAt)} {formatTime(sample.createdAt)}</span></div>
                                <div className="info-row"><span className="info-label">Sample Drawn On</span><span>:</span><span>{formatDate(sample.collectionDate)} {formatTime(sample.collectionDate)}</span></div>
                                <div className="info-row"><span className="info-label">Reported On</span><span>:</span><span>{formatDate(sample.reportDate)} {formatTime(sample.reportDate)}</span></div>
                                <div className="info-row"><span className="info-label">Sample Type</span><span>:</span><span>{sample.sampleType || 'blood'}</span></div>
                                <div className="info-row"><span className="info-label">Report Status</span><span>:</span><span>{sample.status === 'Completed' ? 'Final' : sample.status}</span></div>
                            </div>
                        </div>

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
                                    <div className="lab-test-title">
                                        {test.departmentName && <div className="lab-test-dept">{test.departmentName}</div>}
                                        <div className="lab-test-name">{test.testName}</div>
                                    </div>
                                    <table className="lab-test-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '35%' }}>Parameter</th>
                                                <th style={{ width: '25%' }}>Result</th>
                                                <th style={{ width: '25%' }}>Reference Range</th>
                                                <th style={{ width: '15%' }}>Units</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {test.departmentName && (
                                                <tr>
                                                    <td colSpan={4} style={{ fontWeight: 'bold', paddingTop: '15px' }}>{test.departmentName.toUpperCase()}</td>
                                                </tr>
                                            )}

                                            {validParams.map((param: any, idx: number) => {
                                                const sub = test.subTests?.find(
                                                    st => st.name === param.label || st.name === param.key
                                                );
                                                if (!sub) return null;
                                                const isAbnormal = test.isAbnormal || (sub as any).isAbnormal || String(sub.result || '').includes('(L)') || String(sub.result || '').includes('(H)'); 
                                                const rangeObj = getDisplayRangeObj(sub, sample);
                                                const flag = getResultFlag(sub.result as string, rangeObj, isAbnormal);
                                                const isHighlight = flag !== '' || isAbnormal;
                                                
                                                return (
                                                    <tr key={`p-${idx}`}>
                                                        <td style={{ textTransform: 'uppercase' }}>{param.label}</td>
                                                        <td style={{ fontWeight: isHighlight ? 900 : 'normal', color: isHighlight ? '#dc2626' : 'inherit' }}>
                                                            {flag}{sub.result}
                                                        </td>
                                                        <td>{getDisplayRangeText(sub, sample, sub.range || param.range)}</td>
                                                        <td>{sub.unit || param.unit || '-'}</td>
                                                    </tr>
                                                );
                                            })}
                                            {!validParams.length && adhocSubTests.map((st: any, idx: number) => {
                                                const isAbnormal = test.isAbnormal || (st as any).isAbnormal || String(st.result || '').includes('(L)') || String(st.result || '').includes('(H)'); 
                                                const rangeObj = getDisplayRangeObj(st, sample);
                                                const flag = getResultFlag(st.result as string, rangeObj, isAbnormal);
                                                const isHighlight = flag !== '' || isAbnormal;
                                                return (
                                                    <tr key={`a-${idx}`}>
                                                        <td style={{ textTransform: 'uppercase' }}>{st.name}</td>
                                                        <td style={{ fontWeight: isHighlight ? 900 : 'normal', color: isHighlight ? '#dc2626' : 'inherit' }}>
                                                            {flag}{st.result}
                                                        </td>
                                                        <td>{getDisplayRangeText(st, sample, st.range)}</td>
                                                        <td>{st.unit || '-'}</td>
                                                    </tr>
                                                );
                                            })}
                                            {!validParams.length && !adhocSubTests.length && hasMainResult && (() => {
                                                const res = (test as any).result || test.resultValue;
                                                const isAbnormal = test.isAbnormal || String(res || '').includes('(L)') || String(res || '').includes('(H)'); 
                                                const rangeObj = getDisplayRangeObj(test, sample);
                                                const flag = getResultFlag(res, rangeObj, isAbnormal);
                                                const isHighlight = flag !== '' || isAbnormal;
                                                return (
                                                    <tr>
                                                        <td style={{ textTransform: 'uppercase' }}>{test.testName}</td>
                                                        <td style={{ fontWeight: isHighlight ? 900 : 'normal', color: isHighlight ? '#dc2626' : 'inherit' }}>
                                                            {flag}{res}
                                                        </td>
                                                        <td>{getDisplayRangeText(test, sample, test.normalRange)}</td>
                                                        <td>{test.unit || '-'}</td>
                                                    </tr>
                                                );
                                            })()}
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

                        <div style={{ textAlign: 'center', marginTop: '40px', fontSize: '12px', color: '#666' }}>
                            --- End of Invoice ---
                        </div>
                        <div style={{ textAlign: 'center', fontSize: '11px', color: '#666', marginTop: '5px' }}>
                            {defaultLabInfo.address} | Phone No: {defaultLabInfo.phone}
                        </div>

                    </div>
                    
                    <div className="lab-print-footer">
                        <FooterPrint />
                    </div>
                </div>
            </div>
        );
    }
);

LabReportTemplate.displayName = 'LabReportTemplate';

export default LabReportTemplate;
