import React from 'react';
import { PharmacyBill } from '@/lib/integrations/types/pharmacyBilling';

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
            width: '100%',
            height: '100%',
            margin: '0',
            background: '#ffffff',
            color: '#000000',
            padding: '20mm', // Standard letterhead margins for clean look
            fontFamily: 'Arial, sans-serif',
            lineHeight: '1.2',
            position: 'relative' as const,
            userSelect: 'none' as const,
            boxSizing: 'border-box' as const
        },
        outerBorder: {
            border: '2px solid #000000', // Standard border
            display: 'flex',
            flexDirection: 'column' as const,
            padding: '12px',
            minHeight: '255mm', // Standardized height for A4 with margins
            boxSizing: 'border-box' as const
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '20px'
        },
        logoSection: {
            display: 'flex',
            gap: '24px',
            maxWidth: '60%'
        },
        logoBox: {
            width: '140px',
            height: '140px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
        },
        logo: {
            width: '100%',
            height: '100%',
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
                @media print {
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
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                    }
                }
            `}} />
            <div style={styles.outerBorder}>
                {/* Header Section */}
                <div style={styles.header}>
                    {/* Brand Section */}
                    <div style={styles.logoSection}>
                        <div style={styles.logoBox}>
                            {shopDetails.logo ? (
                                <img
                                    src={shopDetails.logo}
                                    alt="Logo"
                                    style={styles.logo}
                                />
                            ) : (
                                <div style={{ fontWeight: 900, fontSize: '36px', color: '#e5e7eb', letterSpacing: '-2px', fontStyle: 'italic' }}>MCH</div>
                            )}
                        </div>
                        <div>
                            <h1 style={styles.hospitalName}>
                                {shopDetails.name || 'HOSPITAL'}
                            </h1>
                            <p style={styles.address}>
                                {shopDetails.address || 'Address not provided'}
                            </p>
                            <div style={{ marginTop: '8px' }}>
                                <p style={{ fontSize: '11px', margin: 0 }}>GSTIN: <span>{shopDetails.gstin || '-'}</span></p>
                                <p style={{ fontSize: '11px', margin: 0 }}>Phone: <span>{shopDetails.phone || '-'}</span></p>
                            </div>
                        </div>
                    </div>

                    {/* Meta Info Box */}
                    <div style={styles.metaBox}>
                        <div style={styles.metaHeader}>
                            <h2 style={styles.metaTitle}>TAX INVOICE</h2>
                        </div>
                        <div style={styles.metaContent}>
                            <div style={styles.metaRow}>
                                <span style={{ fontWeight: 'bold' }}>Invoice No:</span>
                                <span style={{ fontFamily: 'monospace', fontWeight: 900 }}>{billData.invoiceId}</span>
                            </div>
                            <div style={styles.metaRow}>
                                <span style={{ fontWeight: 'bold' }}>Date:</span>
                                <span style={{ fontFamily: 'monospace' }}>{new Date(billData.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            </div>
                            <div style={styles.metaRow}>
                                <span style={{ fontWeight: 'bold' }}>Time:</span>
                                <span style={{ fontFamily: 'monospace' }}>{new Date(billData.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                            </div>
                            <div style={{ ...styles.metaRow, paddingTop: '6px', marginTop: '6px', borderTop: '1px solid #d1d5db' }}>
                                <span style={{ fontWeight: 'bold' }}>Status:</span>
                                <span style={{ fontWeight: 900, textTransform: 'uppercase' }}>{billData.paymentSummary.status}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Separator */}
                <div style={styles.separator}></div>

                {/* Bill To / Ship To Section */}
                <div style={styles.billToSection}>
                    <div style={{ flex: 1 }}>
                        <p style={styles.sectionTitle}>BILL TO:</p>
                        <div>
                            <p style={{ fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>{billData.patientName}</p>
                            <p style={{ fontWeight: 'bold', margin: 0 }}>Phone: <span style={{ fontFamily: 'monospace' }}>{billData.customerPhone}</span></p>
                        </div>
                    </div>
                    <div style={{ flex: 1 }}>
                        <p style={styles.sectionTitle}>SHIP TO:</p>
                        <div>
                            <p style={{ fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>{billData.patientName}</p>
                            <p style={{ fontWeight: 'bold', margin: 0 }}>Place of Supply: <span>Andhra Pradesh</span></p>
                        </div>
                    </div>
                </div>

                {/* Dashed Separator */}
                <div style={styles.dashedSeparator}></div>

                {/* Items Table */}
                <table style={styles.table}>
                    <thead style={styles.tableHeader}>
                        <tr>
                            <th style={{ ...styles.tableHeaderCell, width: '40px', textAlign: 'center' }}>S.NO</th>
                            <th style={styles.tableHeaderCell}>ITEM DESCRIPTION</th>
                            <th style={{ ...styles.tableHeaderCell, width: '112px', textAlign: 'center' }}>HSN</th>
                            <th style={{ ...styles.tableHeaderCell, width: '48px', textAlign: 'center' }}>QTY</th>
                            <th style={{ ...styles.tableHeaderCell, width: '96px', textAlign: 'right' }}>RATE</th>
                            <th style={{ ...styles.tableHeaderCell, width: '80px', textAlign: 'right' }}>GST%</th>
                            <th style={{ ...styles.tableHeaderCell, width: '112px', textAlign: 'right' }}>AMOUNT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {billData.items.map((item, index) => (
                            <tr key={index} style={styles.tableRow}>
                                <td style={{ ...styles.tableCell, textAlign: 'center', fontWeight: 500 }}>{index + 1}</td>
                                <td style={{ ...styles.tableCell, fontWeight: 'bold', textTransform: 'uppercase' }}>{item.itemName}</td>
                                <td style={{ ...styles.tableCell, textAlign: 'center', fontFamily: 'monospace' }}>{item.hsn || '-'}</td>
                                <td style={{ ...styles.tableCell, textAlign: 'center', fontWeight: 900 }}>{item.qty}</td>
                                <td style={{ ...styles.tableCell, textAlign: 'right', fontWeight: 500 }}>₹{Math.round(Number(item.rate || item.unitRate || 0)).toLocaleString()}</td>
                                <td style={{ ...styles.tableCell, textAlign: 'right', fontWeight: 500 }}>{item.gstPct || item.gst || 12}%</td>
                                <td style={{ ...styles.tableCell, textAlign: 'right', fontWeight: 900, fontSize: '12px' }}>₹{Math.round(Number(item.total || item.amount || 0)).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Subtotal Section */}
                <div style={styles.totalSection}>
                    <div style={{ width: '256px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#374151', fontStyle: 'italic', marginBottom: '4px' }}>
                            <span>Subtotal:</span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>₹{Math.round(billData.paymentSummary.subtotal).toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#374151', fontStyle: 'italic', marginBottom: '4px' }}>
                            <span>Discount:</span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>-₹{Math.round(billData.paymentSummary.discount).toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#374151', fontStyle: 'italic' }}>
                            <span>Taxable Amount:</span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>₹{Math.round(billData.paymentSummary.taxableAmount).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Total Row */}
                <div style={styles.totalRow}>
                    <h3 style={styles.totalLabel}>TOTAL AMOUNT:</h3>
                    <span style={styles.totalAmount}>₹{Math.round(billData.paymentSummary.grandTotal).toLocaleString()}</span>
                </div>

                {/* Payment Details */}
                <div style={{ marginTop: '8px', fontSize: '11px', paddingLeft: '8px', paddingRight: '8px', fontWeight: 'bold' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ color: '#4b5563' }}>Paid Amount:</span>
                        <span style={{ fontWeight: 900 }}>₹{Math.round(billData.paymentSummary.paidAmount).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#4b5563' }}>Payment Mode:</span>
                        <span style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.5px' }}>{billData.paymentSummary.paymentMode}</span>
                    </div>
                </div>

                {/* Terms and Conditions */}
                <div style={styles.footer}>
                    <h4 style={styles.termsTitle}>TERMS & CONDITIONS:</h4>
                    <ol style={styles.termsList}>
                        <li>All medicines are billed as per MRP inclusive of applicable GST, unless otherwise mentioned.</li>
                        <li>Once the bill is generated, no changes or cancellations are allowed.</li>
                        <li>Payment must be made in full at the time of purchase (Cash / Card).</li>
                    </ol>
                </div>

                {/* Thank You Section */}
                <div style={styles.thankYou}>
                    <p style={styles.thankYouText}>Thank you for visiting!</p>
                    <p style={styles.disclaimer}>
                        This is a computer generated invoice and does not require signature.
                    </p>
                    <p style={styles.disclaimer}>
                        For queries, contact: {shopDetails.phone}
                    </p>
                </div>
            </div>

            {/* Customer Copy Watermark */}
            <div style={{ position: 'absolute', top: 0, right: 0, padding: '8px', fontSize: '8px', fontWeight: 'bold', color: '#d1d5db', textTransform: 'uppercase', letterSpacing: '2px', pointerEvents: 'none' }}>
                Customer Copy
            </div>
        </div>
    );
};

export default PharmacyBillPrint;
