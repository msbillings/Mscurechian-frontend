import React from 'react';
import { PharmacyBill } from '@/lib/integrations/types/pharmacyBilling';
import MainHeader from '@/components/printers/MainHeader';
import MainFooter from '@/components/printers/MainFooter';

export interface ShopDetails {
    name: string;
    address: string;
    phone: string;
    email: string;
    gstin: string;
    dlNo?: string;
    fssai?: string;
    logo?: string;
}

interface PharmacyBillPrintProps {
    billData: PharmacyBill;
    shopDetails: ShopDetails;
}

/**
 * PharmacyBillPrint Component - Fixed & Refined version
 * Matches the requested image styling exactly and fixes the "blank page" print issue.
 */
const PharmacyBillPrint: React.FC<PharmacyBillPrintProps> = ({ billData, shopDetails }) => {
    // Primary Brand Colors from image
    const primaryColor = '#112d42';
    const secondaryColor = '#4b5563';
    const borderColor = '#cbd5e1'; // Darker gray for better match with image borders
    const textMain = '#1e293b';
    const textMuted = '#64748b';

    const styles = {
        container: {
            width: '210mm',
            minHeight: '290mm',
            padding: '10mm',
            boxSizing: 'border-box' as const,
            backgroundColor: '#ffffff',
            color: textMain,
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            fontSize: '11px',
            lineHeight: '1.4',
            margin: '0 auto',
            position: 'relative' as const,
        },
        // ... (omitting some unchanged styles for brevity in my thought, but tool call needs full block)
        headerGrid: {
            display: 'grid',
            gridTemplateColumns: '1fr 280px',
            gap: '20px',
            marginBottom: '25px',
        },
        brandSection: {
            display: 'flex',
            flexDirection: 'column' as const,
            gap: '10px',
        },
        brandHeader: {
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
        },
        logoPlaceholder: {
            width: '48px',
            height: '48px',
            backgroundColor: primaryColor,
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '22px',
            fontWeight: 800,
        },
        shopName: {
            fontSize: '24px',
            fontWeight: 800,
            color: primaryColor,
            margin: 0,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.5px',
        },
        tagline: {
            fontSize: '10px',
            color: secondaryColor,
            fontWeight: 600,
            margin: 0,
        },
        shopDetails: {
            fontSize: '10px',
            color: textMuted,
            display: 'flex',
            flexDirection: 'column' as const,
            gap: '3px',
            fontWeight: 500,
            marginTop: '5px',
        },

        taxInvoiceBox: {
            border: `1.5px solid ${primaryColor}`,
            borderRadius: '4px',
            overflow: 'hidden',
        },
        taxInvoiceHeader: {
            backgroundColor: primaryColor,
            color: 'white',
            textAlign: 'center' as const,
            padding: '6px 0',
            fontWeight: 800,
            fontSize: '13px',
            textTransform: 'uppercase' as const,
        },
        taxInvoiceGrid: {
            padding: '6px 10px',
        },
        metaRow: {
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '4px',
            fontSize: '10px',
        },
        metaLabel: { color: textMuted, fontWeight: 500 },
        metaValue: { fontWeight: 700, color: textMain, textAlign: 'right' as const },

        billToBox: {
            border: `1px solid ${borderColor}`,
            borderRadius: '4px',
            marginBottom: '20px',
            overflow: 'hidden',
        },
        billToHeader: {
            backgroundColor: primaryColor,
            color: 'white',
            padding: '4px 15px',
            fontSize: '10px',
            fontWeight: 800,
            textTransform: 'uppercase' as const,
            width: 'fit-content',
        },
        billToContent: {
            padding: '12px 15px',
        },
        patientName: {
            fontSize: '16px',
            fontWeight: 800,
            color: '#000',
            margin: '0 0 5px 0',
        },
        patientMeta: {
            fontSize: '10px',
            color: textMuted,
            fontWeight: 500,
            display: 'flex',
            flexDirection: 'column' as const,
            gap: '2px',
        },

        table: {
            width: '100%',
            borderCollapse: 'separate' as const,
            borderSpacing: 0,
            marginBottom: '20px',
            border: `1px solid ${borderColor}`,
        },
        th: {
            backgroundColor: primaryColor,
            color: 'white',
            padding: '8px 6px',
            fontSize: '10px',
            fontWeight: 800,
            textTransform: 'uppercase' as const,
            borderRight: `1px solid rgba(255,255,255,0.2)`,
        },
        td: {
            padding: '8px 6px',
            borderRight: `1px solid ${borderColor}`,
            borderBottom: `1px solid ${borderColor}`,
            fontSize: '10px',
            color: textMain,
            textAlign: 'center' as const,
        },
        tdLeft: { textAlign: 'left' as const, fontWeight: 600 },
        tdRight: { textAlign: 'right' as const },

        bottomGrid: {
            display: 'grid',
            gridTemplateColumns: '1fr 280px',
            gap: '40px',
        },
        calculations: {
            display: 'flex',
            flexDirection: 'column' as const,
            gap: '2px',
        },
        calcRow: {
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '11px',
            fontWeight: 600,
            color: textMuted,
            padding: '1px 0',
        },
        calcValue: { color: textMain, fontWeight: 700 },
        grandTotalBar: {
            backgroundColor: primaryColor,
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 16px',
            borderRadius: '4px',
            marginTop: '15px',
        },
        gtLabel: { fontSize: '14px', fontWeight: 800, textTransform: 'uppercase' as const },
        gtValue: { fontSize: '26px', fontWeight: 900 },

        paymentBox: {
            border: `1px solid ${borderColor}`,
            borderRadius: '4px',
            overflow: 'hidden',
        },
        paymentHeader: {
            backgroundColor: primaryColor,
            color: 'white',
            padding: '6px 15px',
            fontSize: '11px',
            fontWeight: 800,
            textAlign: 'center' as const,
        },
        paymentContent: {
            padding: '8px 12px',
            backgroundColor: '#f8fafc',
        },
        payRow: {
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '6px',
            fontSize: '10px',
            borderBottom: `1px solid ${borderColor}`,
            paddingBottom: '4px',
        },

        footerNote: {
            marginTop: '30px',
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr 1fr',
            gap: '20px',
            alignItems: 'end',
        },
        terms: {
            fontSize: '8px',
            color: textMuted,
            lineHeight: '1.4',
        },
        signatory: {
            textAlign: 'center' as const,
            borderTop: `1px solid ${textMain}`,
            paddingTop: '8px',
            fontSize: '10px',
            fontWeight: 700,
            marginTop: '40px',
        }
    };

    return (
        <div style={styles.container} id="printable-pharmacy-invoice" className="bg-white">
            {/* Robust CSS for print to guarantee visibility */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
                @media print {
                    @page { size: A4; margin: 0; }
                    html, body {
                        height: 100vh;
                        margin: 0 !important;
                        padding: 0 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        background-color: white !important;
                    }
                    #printable-pharmacy-invoice { 
                        visibility: visible !important; 
                        display: block !important;
                        box-shadow: none !important; 
                        border: none !important; 
                        margin: 0 !important; 
                        width: 100% !important; 
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                    }
                    #printable-pharmacy-invoice * {
                        visibility: visible !important;
                    }
                }
            `}} />

            {/* Header section */}
            <div style={styles.headerGrid}>
                <div style={styles.brandSection}>
                    <div style={styles.brandHeader}>
                        {shopDetails.logo ? (
                            <img src={shopDetails.logo} alt="Logo" style={{ width: '50px', height: '50px', objectFit: 'contain' }} />
                        ) : (
                            <div style={styles.logoPlaceholder}>+</div>
                        )}
                        <div>
                            <h1 style={styles.shopName}>{shopDetails.name || 'PHARMA STAFF'}</h1>
                            <p style={styles.tagline}>Your Trusted Pharmacy Partner</p>
                        </div>
                    </div>
                    <div style={styles.shopDetails}>
                        <span>📍 {shopDetails.address || 'Address not listed'}</span>
                        <div style={{ display: 'flex', gap: '15px', marginTop: '5px' }}>
                            <span>📋 Drug License No: {shopDetails.dlNo || 'KA-123456'}</span>
                            <span>✅ FSSAI: {shopDetails.fssai || '12345678901234'}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <span>✉️ Email: {shopDetails.email || 'info@pharmastaff.com'}</span>
                            <span>📞 Support: {shopDetails.phone || '-'}</span>
                        </div>
                    </div>
                </div>

                <div style={styles.taxInvoiceBox}>
                    <div style={styles.taxInvoiceHeader}>TAX INVOICE</div>
                    <div style={styles.taxInvoiceGrid}>
                        <div style={styles.metaRow}>
                            <span style={styles.metaLabel}>Invoice No:</span>
                            <span style={styles.metaValue}>{billData.invoiceId}</span>
                        </div>
                        <div style={styles.metaRow}>
                            <span style={styles.metaLabel}>Invoice Date:</span>
                            <span style={styles.metaValue}>{new Date(billData.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <div style={styles.metaRow}>
                            <span style={styles.metaLabel}>Invoice Time:</span>
                            <span style={styles.metaValue}>{new Date(billData.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                        </div>

                        <div style={styles.metaRow}>
                            <span style={styles.metaLabel}>Payment Mode:</span>
                            <span style={styles.metaValue}>{billData.paymentSummary.paymentMode || 'Cash'}</span>
                        </div>
                        <div style={{ ...styles.metaRow, marginBottom: 0 }}>
                            <span style={styles.metaLabel}>Status:</span>
                            <span style={{ ...styles.metaValue, color: '#10b981' }}>{(billData.paymentSummary.status || 'PAID').toUpperCase()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bill To Section */}
            <div style={styles.billToBox}>
                <div style={styles.billToHeader}>BILL TO</div>
                <div style={styles.billToContent}>
                    <h3 style={styles.patientName}>{billData.patientName}</h3>
                    <div style={styles.patientMeta}>
                        <span>📞 +91 {billData.customerPhone}</span>
                        <span>📍 {shopDetails.address?.split(',').slice(-1)[0].trim() || 'Karnataka'}, India</span>
                        <span style={{ marginTop: '8px', fontWeight: 800, color: textMain }}>Doctor: <span style={{ fontWeight: 500 }}>{(!billData.doctorName || billData.doctorName === '-') ? 'Self / Walk-in' : billData.doctorName}</span></span>
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={{ ...styles.th, width: '40px' }}>S.No</th>
                        <th style={{ ...styles.th, textAlign: 'left' }}>Item Name</th>
                        <th style={{ ...styles.th, width: '80px' }}>Batch No.</th>
                        <th style={{ ...styles.th, width: '75px' }}>Expiry</th>
                        <th style={{ ...styles.th, width: '60px' }}>HSN</th>
                        <th style={{ ...styles.th, width: '40px' }}>Qty</th>
                        <th style={{ ...styles.th, width: '70px' }}>MRP</th>
                        <th style={{ ...styles.th, width: '50px' }}>Disc%</th>
                        <th style={{ ...styles.th, width: '50px' }}>GST%</th>
                        <th style={{ ...styles.th, width: '80px', textAlign: 'right', borderRight: 'none' }}>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {(billData.items || []).map((item: any, idx) => {
                        const itemName = item.itemName || item.productName || 'Unknown Item';
                        const batch = item.batchNo || item.batch || item.batchNum || '-';
                        const rawExpiry = item.expiryDate || item.expiry || item.expDate;
                        // Safe date formatting
                        let expiry = '-';
                        if (rawExpiry && rawExpiry !== '-') {
                            try {
                                const d = new Date(rawExpiry);
                                if (!isNaN(d.getTime())) {
                                    expiry = d.toISOString().split('T')[0];
                                }
                            } catch (e) {
                                expiry = String(rawExpiry).split('T')[0];
                            }
                        }
                        const hsn = item.hsn || item.hsnCode || '-';
                        const qty = item.qty || 0;
                        const rate = item.rate || item.unitRate || 0;
                        const mrp = item.mrp || rate;
                        const disc = item.discountPct || item.discount || 0;
                        const gst = item.gstPct || item.gst || 12;
                        const amount = item.amount || item.total || (qty * rate);

                        return (
                            <tr key={idx}>
                                <td style={styles.td}>{idx + 1}</td>
                                <td style={{ ...styles.td, ...styles.tdLeft }}>{itemName}</td>
                                <td style={styles.td}>{batch}</td>
                                <td style={styles.td}>{expiry}</td>
                                <td style={styles.td}>{hsn}</td>
                                <td style={{ ...styles.td, fontWeight: 700 }}>{qty}</td>
                                <td style={styles.td}>₹{mrp.toFixed(2)}</td>
                                <td style={styles.td}>{disc}%</td>
                                <td style={styles.td}>{gst}%</td>
                                <td style={{ ...styles.td, ...styles.tdRight, borderRight: 'none', fontWeight: 800 }}>₹{amount.toFixed(2)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Calculations and Payment Details */}
            <div style={styles.bottomGrid}>
                <div style={styles.calculations}>
                    <div style={styles.calcRow}>
                        <span>Subtotal:</span>
                        <span style={styles.calcValue}>₹{(billData.paymentSummary.subtotal || 0).toFixed(2)}</span>
                    </div>
                    <div style={styles.calcRow}>
                        <span>Discount:</span>
                        <span style={styles.calcValue}>-₹{(billData.paymentSummary.discount || 0).toFixed(2)}</span>
                    </div>
                    <div style={styles.calcRow}>
                        <span>Taxable Amount (GST):</span>
                        <span style={styles.calcValue}>₹{(billData.paymentSummary.taxableAmount || 0).toFixed(2)}</span>
                    </div>
                    <div style={styles.calcRow}>

                    </div>

                    <div style={styles.grandTotalBar}>
                        <span style={styles.gtLabel}>Grand Total:</span>
                        <span style={styles.gtValue}>₹{Math.round(billData.paymentSummary.grandTotal || 0).toLocaleString()}</span>
                    </div>

                    <div style={{ marginTop: '20px' }}>
                        <p style={{ margin: 0, fontWeight: 800, textTransform: 'uppercase', fontSize: '9px', marginBottom: '5px' }}>Terms & Conditions:</p>
                        <ul style={{ margin: 0, paddingLeft: '12px', fontSize: '8px', color: textMuted, listStyle: 'disc' }}>
                            <li>All medicines sold will not be taken back.</li>
                            <li>Please check quantity before leaving the counter.</li>
                            <li>Goods sold are not returnable once the seal is broken.</li>
                        </ul>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={styles.paymentBox}>
                        <div style={styles.paymentHeader}>Payment Details</div>
                        <div style={styles.paymentContent}>
                            <div style={styles.payRow}>
                                <span style={styles.metaLabel}>Paid Amount:</span>
                                <span style={styles.metaValue}>₹{(billData.paymentSummary.paidAmount || 0).toLocaleString()}</span>
                            </div>
                            <div style={styles.payRow}>
                                <span style={styles.metaLabel}>Balance:</span>
                                <span style={styles.metaValue}>₹{(billData.paymentSummary.balanceDue || 0).toLocaleString()}</span>
                            </div>
                            <div style={styles.payRow}>
                                <span style={styles.metaLabel}>Payment Mode:</span>
                                <span style={styles.metaValue}>{billData.paymentSummary.paymentMode || 'Cash'}</span>
                            </div>

                        </div>
                    </div>

                    <div style={{ textAlign: 'center', padding: '15px', background: '#f8fafc', borderRadius: '15px', border: `1px solid ${borderColor}`, marginTop: '10px' }}>
                        <div style={{ color: primaryColor, fontFamily: "'Brush Script MT', cursive", fontSize: '22px', marginBottom: '5px' }}>Get Well Soon!</div>
                        <div style={{ fontWeight: 800, fontSize: '11px', color: primaryColor }}>{shopDetails.name || 'Pharma Staff'}</div>
                        <div style={{ fontSize: '9px', color: textMuted }}>Support: {shopDetails.phone || '-'}</div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div style={styles.footerNote}>
                <div>
                    <span style={{ fontSize: '8px', color: textMuted }}>Printed: {new Date().toLocaleString()}</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '8px', fontWeight: 600 }}>Computer Generated Invoice</span>
                </div>
                <div />
            </div>
        </div>
    );
};

export default PharmacyBillPrint;