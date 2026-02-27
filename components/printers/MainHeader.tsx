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
        // Only fetch if initialDetails wasn't provided (e.g., standard UI use)
        if (initialDetails) return;

        const fetchHospital = async () => {
            try {
                const response = await hospitalAdminService.getHospital();
                if (response?.hospital) {
                    const h = response.hospital;
                    setDetails({
                        name: h.name || 'Hospital Name',
                        address: h.address || 'Hospital Address',
                        phone: h.phone || 'Phone Number',
                        email: h.email || 'Email Address',
                        logo: h.logo
                    });
                }
            } catch (error) {
                console.error('Error fetching hospital details for header:', error);
            }
        };
        fetchHospital();
    }, [initialDetails]);

    return (
        <div style={{
            width: '100%',
            backgroundColor: '#ffffff',
            fontFamily: "'Segoe UI', Roboto, Arial, sans-serif",
            marginBottom: '10px',
            printColorAdjust: 'exact',
            WebkitPrintColorAdjust: 'exact',
            
            padding: '10px',
            boxSizing: 'border-box'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                padding: '10px 0',
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
                                maxWidth: '160px', 
                                maxHeight: '110px', 
                                objectFit: 'contain',
                                border: '1px solid #000' // Matching the boxed logo look if applicable
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
                            color: '#000',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}>LOGO</div>
                    )}
                </div>

                {/* Vertical Divider */}
                <div style={{
                    width: '1px',
                    height: '80px',
                    backgroundColor: '#e2e8f0',
                    marginRight: '20px'
                }}></div>

                {/* DETAILS SECTION */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '6px',
                }}>
                    <h1 style={{
                        margin: 0,
                        fontWeight: '800',
                        color: '#1e40af', // Deep Blue
                        lineHeight: '1.1',
                        textAlign: 'left',
                        fontSize: '30px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        {details.name}
                    </h1>

                    {/* Email Row */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#1e40af',
                        fontSize: '14px',
                        fontWeight: '700'
                    }}>
                        <div style={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: '#1e40af',
                            borderRadius: '1px'
                        }}></div>
                        <span>{details.email}</span>
                    </div>

                    {/* Address & Phone Row */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        fontSize: '14px',
                        color: '#334155',
                        fontWeight: '700',
                        marginTop: '2px'
                    }}>
                        <span style={{ color: '#64748b' }}>{details.address}</span>
                        <div style={{ width: '1px', height: '14px', backgroundColor: '#cbd5e1' }}></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Phone size={16} fill="#22c55e" color="#22c55e" strokeWidth={0} />
                            <span style={{ color: '#22c55e' }}>{details.phone}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Green line */}
            <div style={{
                width: '100%',
                height: '4px',
                backgroundColor: '#22c55e',
                marginTop: '10px'
            }}></div>
        </div>
    );
};

export default MainHeader;