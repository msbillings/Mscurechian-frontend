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
    logo?: string;
}

interface PharmacyBillPrintProps {
    billData: PharmacyBill;
    shopDetails: ShopDetails;
}

/**
 * PharmacyBillPrint Component - Pure Inline Styles Version
 * Uses only inline styles to work with PDF generation (no external CSS dependencies)
 */
const PharmacyBillPrint: React.FC<PharmacyBillPrintProps> = ({ billData, shopDetails }) => {
    const styles = {
        container: {
            width: '210mm',
            height: '296mm',
            margin: '0 auto',
            background: '#ffffff',
            color: '#000000',
            padding: '10mm 15mm 10mm 25mm', 
            fontFamily: 'Inter, Arial, sans-serif',
            lineHeight: '1.2',
            position: 'relative' as const,
            userSelect: 'none' as const,
            boxSizing: 'border-box' as const,
            display: 'flex' as const,
            flexDirection: 'column' as const,
            overflow: 'hidden' as const
        },
        logo: {
            maxWidth: '180px',
            maxHeight: '120px',
            objectFit: 'contain' as const
        },
        hospitalName: {
            fontSize: '24px', // More professional header size
            fontWeight: 900,
            textTransform: 'uppercase' as const,
            letterSpacing: '-0.5px',
            color: '#000000',
            lineHeight: '1',
            marginBottom: '12px',
            margin: 0
        },
        address: {
            fontSize: '15px',
            fontWeight: 500,
            color: '#374151',
            lineHeight: '1.4',
            maxWidth: '450px',
            margin: 0
        },
        metaBox: {
            width: '300px',
            border: '2px solid #000000',
            overflow: 'hidden',
            borderRadius: '4px'
        },
        metaHeader: {
            background: '#ffffff',
            borderBottom: '2px solid #000000',
            textAlign: 'center' as const,
            padding: '10px 0'
        },
        metaTitle: {
            fontSize: '18px',
            fontWeight: 900,
            textTransform: 'uppercase' as const,
            letterSpacing: '2px',
            margin: 0
        },
        metaContent: {
            padding: '16px',
            fontSize: '14px'
        },
        metaRow: {
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '10px'
        },
        separator: {
            width: '100%',
            height: '2px',
            background: '#000000',
            marginBottom: '24px'
        },
        dashedSeparator: {
            width: '100%',
            borderTop: '2px dashed #000000',
            marginBottom: '24px'
        },
        billToSection: {
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '14px',
            marginBottom: '32px',
            gap: '56px'
        },
        sectionTitle: {
            fontWeight: 900,
            fontSize: '16px',
            textTransform: 'uppercase' as const,
            letterSpacing: '1px',
            textDecoration: 'underline',
            marginBottom: '12px',
            fontStyle: 'italic'
        },
        table: {
            width: '100%',
            fontSize: '14px',
            borderCollapse: 'collapse' as const
        },
        tableHeader: {
            borderTop: '2.5px solid #000000',
            borderBottom: '2.5px solid #000000',
            textAlign: 'left' as const
        },
        tableHeaderCell: {
            padding: '16px',
            fontWeight: 900,
            textTransform: 'uppercase' as const
        },
        tableRow: {
            borderBottom: '1px solid #e5e7eb'
        },
        tableCell: {
            padding: '16px'
        },
        totalSection: {
            marginTop: '32px',
            paddingTop: '8px',
            borderTop: '2px dashed #000000',
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'flex-end',
            fontSize: '15px'
        },
        totalRow: {
            marginTop: '32px',
            padding: '16px 0',
            borderTop: '3px solid #000000',
            borderBottom: '3px solid #000000',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingLeft: '16px',
            paddingRight: '16px'
        },
        totalLabel: {
            fontSize: '28px',
            fontWeight: 900,
            textTransform: 'uppercase' as const,
            letterSpacing: '-0.5px',
            fontStyle: 'italic'
        },
        totalAmount: {
            fontSize: '42px',
            fontWeight: 900
        },
        footer: {
            marginTop: 'auto',
            paddingTop: '32px',
            borderTop: '2px solid #000000'
        },
        termsTitle: {
            fontSize: '16px',
            fontWeight: 900,
            textTransform: 'uppercase' as const,
            textDecoration: 'underline',
            marginBottom: '12px',
            fontStyle: 'italic'
        },
        termsList: {
            fontSize: '13px',
            color: '#1f2937',
            lineHeight: '1.6',
            paddingLeft: '24px',
            margin: 0
        },
        thankYou: {
            marginTop: '40px',
            paddingTop: '32px',
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            textAlign: 'center' as const
        },
        thankYouText: {
            fontSize: '18px',
            fontWeight: 900,
            fontStyle: 'italic',
            margin: 0,
            marginBottom: '8px'
        },
        disclaimer: {
            fontSize: '12px',
            fontWeight: 500,
            color: '#6b7280',
            marginTop: '6px',
            margin: 0
        }
    };

    return (
        <div style={styles.container} id="printable-pharmacy-invoice" className="bg-white">
            <style dangerouslySetInnerHTML={{
                __html: `
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
                @media print {
                    @page { size: A4; margin: 0; }
                    body * {
                        visibility: hidden !important;
                    }
                    #printable-pharmacy-invoice, #printable-pharmacy-invoice * {
                        visibility: visible !important;
                    }
                    #printable-pharmacy-invoice {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 210mm !important;
                        height: 296mm !important;
                        margin: 0 !important;
                        padding: 10mm 15mm 10mm 25mm !important;
                        border: none !important;
                        display: flex !important;
                        flex-direction: column !important;
                    }
                }
            `}} />
            
            <MainHeader initialDetails={{
                name: shopDetails.name,
                address: shopDetails.address,
                phone: shopDetails.phone,
                email: shopDetails.email,
                logo: shopDetails.logo
            }} />

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Meta Info Box */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>TAX INVOICE</h1>
                    </div>
                    <div style={styles.metaBox}>
                        <div style={styles.metaContent}>
                            <div style={styles.metaRow}>
                                <span style={{ fontWeight: 'bold' }}>Invoice No:</span>
                                <span style={{ fontFamily: 'monospace', fontWeight: 900 }}>{billData.invoiceId}</span>
                            </div>
                            <div style={styles.metaRow}>
                                <span style={{ fontWeight: 'bold' }}>Date:</span>
                                <span style={{ fontFamily: 'monospace' }}>{new Date(billData.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bill To Section */}
                <div style={styles.billToSection}>
                    <div style={{ flex: 1 }}>
                        <p style={styles.sectionTitle}>BILL TO:</p>
                        <div>
                            <p style={{ fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>{billData.patientName}</p>
                            <p style={{ fontWeight: 'bold', margin: 0 }}>Phone: <span style={{ fontFamily: 'monospace' }}>{billData.customerPhone}</span></p>
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <table style={styles.table}>
                    <thead style={styles.tableHeader}>
                        <tr>
                            <th style={{ ...styles.tableHeaderCell, width: '40px', textAlign: 'center' }}>S.NO</th>
                            <th style={styles.tableHeaderCell}>ITEM DESCRIPTION</th>
                            <th style={{ ...styles.tableHeaderCell, width: '48px', textAlign: 'center' }}>QTY</th>
                            <th style={{ ...styles.tableHeaderCell, width: '96px', textAlign: 'right' }}>RATE</th>
                            <th style={{ ...styles.tableHeaderCell, width: '112px', textAlign: 'right' }}>AMOUNT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {billData.items.map((item, index) => (
                            <tr key={index} style={styles.tableRow}>
                                <td style={{ ...styles.tableCell, textAlign: 'center', fontWeight: 500 }}>{index + 1}</td>
                                <td style={{ ...styles.tableCell, fontWeight: 'bold', textTransform: 'uppercase' }}>{item.itemName}</td>
                                <td style={{ ...styles.tableCell, textAlign: 'center', fontWeight: 900 }}>{item.qty}</td>
                                <td style={{ ...styles.tableCell, textAlign: 'right', fontWeight: 500 }}>₹{Math.round(Number(item.rate || item.unitRate || 0)).toLocaleString()}</td>
                                <td style={{ ...styles.tableCell, textAlign: 'right', fontWeight: 900, fontSize: '12px' }}>₹{Math.round(Number(item.total || item.amount || 0)).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Total Row */}
                <div style={styles.totalRow}>
                    <h3 style={styles.totalLabel}>TOTAL AMOUNT:</h3>
                    <span style={styles.totalAmount}>₹{Math.round(billData.paymentSummary.grandTotal).toLocaleString()}</span>
                </div>
            </div>

            <MainFooter initialDetails={{
                name: shopDetails.name,
                address: shopDetails.address,
                phone: shopDetails.phone,
                email: shopDetails.email
            }} />

            {/* Customer Copy Watermark */}
            <div style={{ position: 'absolute', top: 0, right: 0, padding: '8px', fontSize: '8px', fontWeight: 'bold', color: '#d1d5db', textTransform: 'uppercase', letterSpacing: '2px', pointerEvents: 'none' }}>
                Customer Copy
            </div>
        </div>
    );
};

export default PharmacyBillPrint;