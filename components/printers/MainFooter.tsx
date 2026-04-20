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
            padding: '0',
            printColorAdjust: 'exact',
            WebkitPrintColorAdjust: 'exact',
        }}>
            {/* ── Contact Slanted Bars ── */}
                    <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap',
                        alignItems: 'stretch',
                        minHeight: '32px', 
                        marginBottom: '12px', 
                        gap: '2px',
                        borderRadius: '6px',
                        overflow: 'hidden'
                    }}>
                        {details.phone && details.phone !== 'N/A' && details.phone !== 'Phone Number' && (
                            <div style={{
                                flex: '1', 
                                background: '#10b981',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '8px 20px',
                                fontWeight: 800,
                                fontSize: '12px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                <span style={{ marginRight: '8px', fontSize: '14px' }}>📞</span>
                                {details.phone}
                            </div>
                        )}

                        {details.email && details.email !== 'N/A' && details.email !== 'Email Address' && (
                            <div style={{
                                flex: '1.2',
                                background: '#3b82f6',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '8px 20px',
                                fontWeight: 800,
                                fontSize: '12px',
                                textTransform: 'lowercase',
                                letterSpacing: '0.5px'
                            }}>
                                <span style={{ marginRight: '8px', fontSize: '14px' }}>✉️</span>
                                {details.email}
                            </div>
                        )}
                    </div>

            {/* ── Info Wrapper with Border ── */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
                marginTop: '5px',
                gap: '20px',
                padding: '0'
            }}>
                {/* Left: T&C / Disclaimers */}
                <div style={{ flex: '1', minWidth: 0 }}>
                    <ul style={{
                        margin: 0,
                        padding: 0,
                        listStyle: 'none',
                        fontSize: 'clamp(7px, 1.5vw, 9px)',
                        color: '#000000',
                        fontWeight: 700,
                        lineHeight: '1.4'
                    }}>
                        <li>• clinical correlation required</li>
                        <li>• Contact helpdesk for alarms</li>
                        <li>• Not for medico-legal use</li>
                        <li>• * non-NABL accredited</li>
                    </ul>
                </div>

                {/* Right: Address (Now Left Aligned) */}
                <div style={{ flex: '1', minWidth: 0, textAlign: 'left' }}>
                    <p style={{
                        margin: 0,
                        fontSize: 'clamp(7px, 1.5vw, 10px)',
                        fontWeight: 800,
                        color: '#000000', 
                        textTransform: 'uppercase',
                        lineHeight: '1.4',
                        wordBreak: 'break-word'
                    }}>
                        {details.address}
                    </p>
                </div>
            </div>

            {/* ── Disclaimer Note ── */}
            <div style={{
                textAlign: 'center',
                fontSize: '9px',
                color: '#000000', // Changed to BLACK
                marginTop: '10px',
                paddingTop: '6px',
                borderTop: '1px solid #f1f5f9',
                fontWeight: '500'
            }}>
                This is a computer generated document and does not require a physical signature.
            </div>
            {/* Added spacing div */}
            <div style={{ padding: '0 15px' }}></div>
        </div>
    );
};

export default MainFooter;
