import React, { useEffect, useState } from 'react';
import { Phone, Mail } from 'lucide-react';
import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';

export interface ShopDetails {
    name: string;
    address: string;
    phone: string;
    email: string;
    logo?: string;
}

interface MainHeaderProps {
    initialDetails?: ShopDetails;
}

const MainHeader: React.FC<MainHeaderProps> = ({ initialDetails }) => {
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
                        logo: !prev.logo ? (h.logo || prev.logo) : prev.logo
                    }));
                }
            } catch (error) {
                console.error('Error fetching hospital details for header:', error);
            }
        };
        fetchHospital();
    }, []);

    return (
        <div style={{
            width: '100%',
            backgroundColor: '#ffffff',
            fontFamily: "'Segoe UI', Roboto, Arial, sans-serif",
            marginBottom: '10px',
            printColorAdjust: 'exact',
            WebkitPrintColorAdjust: 'exact',
            padding: '0',
            boxSizing: 'border-box'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start', 
                flexWrap: 'wrap', 
                gap: 'clamp(8px, 1.5vw, 20px)', 
                padding: '6px 0',
                width: '100%',
                boxSizing: 'border-box'
            }}>
                {/* Logo Section */}
                <div style={{
                    flex: '0 0 fit-content',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    paddingRight: '15px',
                }}>
                    {details.logo ? (
                        <img
                            src={details.logo}
                            alt="Hospital Logo"
                            style={{
                                maxWidth: 'clamp(80px, 18vw, 160px)', 
                                maxHeight: '100px',
                                objectFit: 'contain',
                                flexShrink: 0
                            }}
                        />
                    ) : (
                        <div style={{
                            width: '100px',
                            height: '100px',
                            border: '1px solid #000',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#e2e8f0',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}></div>
                    )}
                </div>


                {/* Vertical Divider (Desktop Only) */}
                <div style={{
                    width: '1px',
                    height: '50px',
                    backgroundColor: '#e2e8f0',
                    display: 'block' 
                }}></div>

                {/* DETAILS SECTION */}
                <div style={{
                    flex: '1', 
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 'clamp(4px, 0.8vw, 10px)',
                    padding: '2px 0',
                    overflow: 'hidden'
                }}>
                    <h1 style={{
                        margin: 0,
                        fontWeight: '900',
                        color: '#1e3a8a', 
                        lineHeight: '1.2',
                        textAlign: 'left',
                        fontSize: 'clamp(16px, 4vw, 32px)', 
                        textTransform: 'uppercase',
                        letterSpacing: '0.2px',
                        wordBreak: 'break-word',
                        width: '100%'
                    }}>
                        {details.name}
                    </h1>

                    {/* Email Row */}
                    {details.email && details.email !== 'N/A' && details.email !== 'Email Address' && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'clamp(4px, 1vw, 8px)',
                            color: '#1e40af',
                            fontSize: 'clamp(9px, 1.5vw, 13px)',
                            fontWeight: '700'
                        }}>
                            <div style={{
                                width: '10px',
                                height: '10px',
                                backgroundColor: '#1e3a8a',
                                borderRadius: '1px',
                                flexShrink: 0
                            }}></div>
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{details.email}</span>
                        </div>
                    )}

                    {/* Address & Phone Row */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap', 
                        gap: 'clamp(6px, 1.5vw, 12px)',
                        fontSize: 'clamp(8px, 1.2vw, 12px)',
                        color: '#334155',
                        fontWeight: '700',
                        marginTop: '1px',
                        width: '100%',
                        overflow: 'hidden'
                    }}>
                        {details.address && details.address !== 'N/A' && details.address !== 'Hospital Address' && (
                            <span style={{ color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{details.address}</span>
                        )}
                        {details.address && details.phone && details.phone !== 'N/A' && (
                            <div style={{ width: '1px', height: 'clamp(8px, 1.2vw, 12px)', backgroundColor: '#cbd5e1', flexShrink: 0 }}></div>
                        )}
                        {details.phone && details.phone !== 'N/A' && details.phone !== 'Phone Number' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                <Phone size={12} fill="#22c55e" color="#22c55e" strokeWidth={0} />
                                <span style={{ color: '#22c55e' }}>{details.phone}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Gradient line */}
            <div style={{
                width: '100%',
                height: '3px',
                background: 'linear-gradient(to right, #22c55e, #10b981, #3b82f6)',
                marginTop: '8px',
                marginBottom: '8px',
                borderRadius: '2px'
            }}></div>
        </div>
    );
};

export default MainHeader;
