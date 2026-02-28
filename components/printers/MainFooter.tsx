import React, { useEffect, useState } from 'react';
import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';

export interface ShopDetails {
    name: string;
    address: string;
    phone: string;
    email: string;
}

interface MainFooterProps {
    initialDetails?: ShopDetails;
}

const MainFooter: React.FC<MainFooterProps> = ({ initialDetails }) => {
    const [details, setDetails] = useState<ShopDetails>(initialDetails || {
        name: 'Hospital Name',
        address: 'Hospital Address',
        phone: 'Phone Number',
        email: 'Email Address',
    });

    useEffect(() => {
        const fetchHospital = async () => {
            try {
                const response = await hospitalAdminService.getHospital();
                if (response?.hospital) {
                    const h = response.hospital;
                    setDetails(prev => ({
                        name: (prev.name === 'Hospital Name' || !prev.name) ? (h.name || prev.name) : prev.name,
                        address: (prev.address === 'Hospital Address' || !prev.address) ? (h.address || prev.address) : prev.address,
                        phone: (prev.phone === 'Phone Number' || !prev.phone || prev.phone === 'N/A') ? (h.phone || prev.phone) : prev.phone,
                        email: (prev.email === 'Email Address' || !prev.email || prev.email === 'N/A') ? (h.email || prev.email) : prev.email,
                    }));
                }
            } catch (error) {
                console.error('Error fetching hospital details for footer:', error);
            }
        };
        fetchHospital();
    }, []);

    return (
        <div style={{
            width: '100%',
            fontFamily: "'Segoe UI', Roboto, Arial, sans-serif",
            marginTop: '10px',
            printColorAdjust: 'exact',
            WebkitPrintColorAdjust: 'exact',
        }}>
            {/* ── Contact Slanted Bars ── */}
            {((details.phone && details.phone !== 'N/A' && details.phone !== 'Phone Number') ||
                (details.email && details.email !== 'N/A' && details.email !== 'Email Address')) && (
                    <div style={{ display: 'flex', height: '40px', marginBottom: '15px', position: 'relative' }}>
                        {details.phone && details.phone !== 'N/A' && details.phone !== 'Phone Number' && (
                            <div style={{
                                flex: 1,
                                background: '#22c55e',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '0 40px',
                                fontWeight: 900,
                                fontSize: '16px',
                                clipPath: 'polygon(0 0, 100% 0, 90% 100%, 0 100%)',
                                zIndex: 2
                            }}>
                                <span style={{ marginRight: '10px' }}>📞</span>
                                {details.phone}
                            </div>
                        )}

                        {details.email && details.email !== 'N/A' && details.email !== 'Email Address' && (
                            <div style={{
                                flex: 1,
                                background: '#3b82f6',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 900,
                                fontSize: '16px',
                                clipPath: 'polygon(10% 0, 100% 0, 100% 100%, 0 100%)',
                                marginLeft: details.phone ? '-40px' : '0',
                                zIndex: 1,
                                paddingLeft: details.phone ? '40px' : '0'
                            }}>
                                <span style={{ marginRight: '10px' }}>✉️</span>
                                {details.email}
                            </div>
                        )}
                    </div>
                )}

            {/* ── Info Wrapper with Border ── */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginTop: '10px'
            }}>
                {/* Left: T&C / Disclaimers */}
                <div style={{ flex: 1.5 }}>
                    <ul style={{
                        margin: 0,
                        padding: 0,
                        listStyle: 'none',
                        fontSize: '10px',
                        color: '#000000', // Changed to BLACK
                        fontWeight: 700,
                        lineHeight: '1.5'
                    }}>
                        <li>• All results should be co-related clinically</li>
                        <li>• If results are alarming or unexpected, contact the Helpdesk immediately</li>
                        <li>• Not valid for medico-legal purposes</li>
                        <li>• The test with an asterisk(*) are not accredited by NABL</li>
                    </ul>
                </div>

                {/* Right: Address */}
                <div style={{ flex: 1.2, textAlign: 'right' }}>
                    <p style={{
                        margin: 0,
                        fontSize: '10px',
                        fontWeight: 800,
                        color: '#000000', // Changed to BLACK
                        textTransform: 'uppercase',
                        lineHeight: '1.4',
                        maxWidth: '300px',
                        marginLeft: 'auto'
                    }}>
                        {details.address}
                    </p>
                </div>
            </div>

            {/* ── Disclaimer Note ── */}
            <div style={{
                textAlign: 'center',
                fontSize: '10px',
                color: '#000000', // Changed to BLACK
                marginTop: '15px',
                paddingTop: '10px',
                borderTop: '1px solid #f1f5f9',
                fontWeight: '500'
            }}>
                This is a computer generated document and does not require a physical signature.
            </div>
        </div>
    );
};

export default MainFooter;