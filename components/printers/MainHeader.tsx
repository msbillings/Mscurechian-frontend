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
            marginBottom: '15px',
            printColorAdjust: 'exact',
            WebkitPrintColorAdjust: 'exact',
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                padding: '20px 0',
            }}>
                {/* Logo Section */}
                <div style={{
                    flex: '0 0 fit-content',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    paddingRight: '10px',
                }}>
                    {details.logo ? (
                        <img
                            src={details.logo}
                            alt="Hospital Logo"
                            style={{ maxWidth: '200px', maxHeight: '140px', objectFit: 'contain' }}
                        />
                    ) : (
                        <div style={{
                            width: '120px',
                            height: '120px',
                            border: '1px dashed #cbd5e1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#94a3b8',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}>LOGO</div>
                    )}
                </div>

                {/* Vertical Divider */}
                <div style={{
                    width: '1px',
                    height: '100px',
                    backgroundColor: '#e2e8f0',
                    marginLeft: '15px',
                    marginRight: '20px'
                }}></div>

                {/* DETAILS SECTION */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                }}>
                    <h1 style={{
                        margin: 0,
                        fontWeight: 'bold',
                        color: '#1e40af', // Deep Blue
                        lineHeight: '1.2',
                        textAlign: 'left',
                        fontSize: '28px'
                    }}>
                        {details.name}
                    </h1>

                    {/* Phone Pill */}
                    <div style={{
                        display: 'flex',
                        backgroundColor: '#22c55e', // Vibrant Green
                        color: '#ffffff',
                        padding: '4px 12px',
                        borderRadius: '4px',
                        alignItems: 'center',
                        gap: '6px',
                        width: 'fit-content',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        marginTop: '2px'
                    }}>
                        <Phone size={14} fill="white" strokeWidth={0} />
                        <span>{details.phone}</span>
                    </div>

                    {/* Email */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#1d4ed8',
                        fontSize: '12px',
                        fontWeight: '600'
                    }}>
                        <Mail size={14} fill="#1d4ed8" color="#ffffff" strokeWidth={1} />
                        <span>{details.email}</span>
                    </div>

                    {/* Address */}
                    <p style={{
                        margin: 0,
                        fontSize: '10px',
                        color: '#64748b',
                        fontWeight: '700',
                        maxWidth: '100%',
                        lineHeight: '1.4',
                        textAlign: 'left',
                        textTransform: 'uppercase'
                    }}>
                        {details.address}
                    </p>
                </div>
            </div>

            {/* Bottom Green line */}
            <div style={{
                width: '100%',
                height: '4px',
                backgroundColor: '#22c55e',
                borderRadius: '2px'
            }}></div>
        </div>
    );
};

export default MainHeader;