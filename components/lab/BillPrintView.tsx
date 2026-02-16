import React from 'react';
import { BillPayload } from '@/lib/integrations/types/labBilling';
import Image from 'next/image';
import { LabSettingsService, LabSettings } from '@/lib/integrations/services/labSettings.service';

interface BillPrintViewProps {
    billData: BillPayload;
    invoiceId?: string; // Optional because previews might not have it yet
    date?: string;
}

// This component is designed to look like the reference image when printed
// It should be wrapped in a container that typically handles visibility (hidden on screen, visible on print)
// OR used in a modal that is then printed.

const BillPrintView: React.FC<BillPrintViewProps> = ({ billData, invoiceId, date }) => {
    const currentDate = date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const [labSettings, setLabSettings] = React.useState<LabSettings>({
        name: 'MediLab Laboratory',
        address: 'Please set your lab address',
        phone: '7987654321',
        email: 'admin@medilab.com',
        gstin: '23NA23492N34455'
    });

    React.useEffect(() => {
        const fetchSettings = async () => {
            try {
                const settings = await LabSettingsService.getSettings();
                if (settings) {
                    setLabSettings(settings);
                }
            } catch (error) {
                console.error('Failed to load lab settings for invoice:', error);
                // Keep default values
            }
        };
        fetchSettings();
    }, []);

    return (
        <div className="p-8 bg-white text-black font-sans max-w-4xl mx-auto" id="printable-bill">
            {/* Header with Logo - Centered */}
            <div className="flex flex-col items-center mb-6">
                {/* Logo - Larger Size */}
                <div className="w-32 h-32 relative mb-3">
                    {labSettings.logo ? (
                        <img src={labSettings.logo} alt="Lab Logo" className="w-full h-full object-contain rounded-full" />
                    ) : (
                        <div className="w-full h-full rounded-full border-4 border-black flex items-center justify-center text-black font-bold bg-white text-lg">
                            LOGO
                        </div>
                    )}
                </div>
                <h1 className="text-xl font-bold text-black uppercase tracking-wide">{labSettings.name || 'MediLab Laboratory'}</h1>
                <p className="text-xs text-black mt-1">{labSettings.address || 'Please set your lab address'}</p>
                <p className="text-xs text-black">Contact: {labSettings.phone || '7987654321'} | Email: {labSettings.email || 'admin@medilab.com'}</p>
                <p className="text-xs text-black">GST: {labSettings.gstin || '23NA23492N34455'}</p>
            </div>

            <div className="flex justify-center mb-6 relative">
                <h2 className="text-base font-bold border-b-2 border-black pb-1 uppercase absolute top-[-10px] bg-white px-2">INVOICE</h2>
                <div className="w-full border-t border-black mt-3"></div>
            </div>


            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-0 border border-black mb-6">

                {/* Invoice Info */}
                <div className="border-r border-black p-4">
                    <h3 className="font-bold text-xs uppercase mb-3 text-black">INVOICE INFORMATION</h3>
                    <div className="grid grid-cols-[100px_1fr] gap-y-1 text-xs">
                        <span className="font-semibold text-black">Invoice ID:</span>
                        <span>{invoiceId && invoiceId.length >= 24 ? `LAB-${invoiceId.slice(-6).toUpperCase()}` : (invoiceId || 'N/A')}</span>

                        <span className="font-semibold text-black">Date:</span>
                        <span>{currentDate}</span>

                        <span className="font-semibold text-black">Payment Mode:</span>
                        <span>{billData.paymentMode}</span>

                        <span className="font-semibold text-black">Status:</span>
                        <span>{billData.balance > 0 ? (billData.paidAmount > 0 ? "Partial" : "Due") : "Paid"}</span>
                    </div>
                </div>

                {/* Patient Info */}
                <div className="p-4">
                    <h3 className="font-bold text-xs uppercase mb-3 text-black">PATIENT INFORMATION</h3>
                    <div className="grid grid-cols-[100px_1fr] gap-y-1 text-xs">
                        <span className="font-semibold text-black">Name:</span>
                        <span>{billData.patientDetails.name}</span>

                        <span className="font-semibold text-black">Age / Gender:</span>
                        <span>
                            {(() => {
                                const age = billData.patientDetails?.age;
                                const gender = billData.patientDetails?.gender;
                                const ageUnit = billData.patientDetails?.ageUnit || 'Years';

                                const ageDisplay =
                                    age === undefined || age === null || String(age) === 'N/A' || String(age) === ''
                                        ? '-'
                                        : `${age} ${ageUnit}`;

                                const genderDisplay = !gender ? '-' : gender;

                                return `${ageDisplay} / ${genderDisplay}`;
                            })()}
                        </span>

                        <span className="font-semibold text-black">Mobile:</span>
                        <span>{billData.patientDetails.mobile}</span>

                        <span className="font-semibold text-black">Ref. Doctor:</span>
                        <span>{billData.patientDetails.refDoctor || '-'}</span>
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <table className="w-full border-collapse border border-black mb-2 text-xs">
                <thead>
                    <tr className="bg-gray-200 text-black">
                        <th className="border border-black p-2 text-left w-16">S.No</th>
                        <th className="border border-black p-2 text-left">Test / Service</th>
                        <th className="border border-black p-2 text-right w-24">Price (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    {billData.items && billData.items.length > 0 ? (
                        billData.items.map((item, index) => (
                            <tr key={index}>
                                <td className="border border-black p-2 text-center">{index + 1}</td>
                                <td className="border border-black p-2 font-medium">{item.testName}</td>
                                <td className="border border-black p-2 text-right font-bold">₹{item.price?.toFixed(2) || '0.00'}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={3} className="border border-black p-4 text-center text-black">
                                No tests/items in this invoice
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Totals Section - Two Column Layout */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Left: Payment Summary */}
                <div className="border border-black text-xs">
                    <div className="flex justify-between p-2 border-b border-black">
                        <span className="font-bold text-black">Payment Mode:</span>
                        <span>{billData.paymentMode}</span>
                    </div>
                    <div className="flex justify-between p-2 border-b border-black">
                        <span className="font-bold text-black">Payment Status:</span>
                        <span className="font-bold">{billData.balance > 0 ? "Partially Paid" : "Fully Paid"}</span>
                    </div>

                    <div className="flex justify-between p-2 border-b border-black">
                        <span className="font-bold text-black">Bill Date:</span>
                        <span>{currentDate}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-200">
                        <span className="font-bold text-black">Bill Time:</span>
                        <span>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>

                {/* Right: Totals Box */}
                <div className="border border-black text-xs">
                    <div className="flex justify-between p-2 border-b border-black">
                        <span className="font-bold text-black">Total Amount:</span>
                        <span className="font-bold">₹{billData.totalAmount.toFixed(2)}</span>
                    </div>
                    {billData.discount > 0 && (
                        <div className="flex justify-between p-2 border-b border-black">
                            <span className="font-bold text-black">Discount:</span>
                            <span>- ₹{billData.discount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between p-2 border-b border-black">
                        <span className="font-bold text-black">Final Amount:</span>
                        <span className="font-bold">₹{billData.finalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-2 border-b border-black">
                        <span className="font-bold text-black">Paid Amount:</span>
                        <span className="font-bold">₹{billData.paidAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-200">
                        <span className="font-bold text-black">Balance Due:</span>
                        <span className="font-bold text-right">₹{billData.balance.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Terms */}
            <div className="border border-black p-3 mb-8" style={{ fontSize: '10px' }}>
                <h4 className="font-bold text-black uppercase mb-1">TERMS & CONDITIONS</h4>
                <ol className="list-decimal list-inside space-y-1">
                    <li>Reports are for clinical correlation only.</li>
                    <li>In case of any disparity, please repeat the test.</li>
                </ol>
            </div>

            {/* Footer */}
            <div className="text-center italic text-black" style={{ fontSize: '10px' }}>
                This is a computer-generated invoice. No signature required.
            </div>

            {/* Print Styles Injection */}
            <style jsx global>{`
        @media print {
            body * {
                visibility: hidden;
            }
            #printable-bill, #printable-bill * {
                visibility: visible;
            }
            #printable-bill {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 20px;
                border: none; /* Remove border for print if browser adds margins */
            }
             /* Small fix to hide Next.js dev overlays if present */
            nextjs-portal, #__next-build-watcher {
                display: none !important;
            }
        }
      `}</style>
        </div>
    );
};

export default BillPrintView;
