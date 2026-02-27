import React, { useEffect, useState } from 'react';
import { LabSettingsService, LabSettings } from '@/lib/integrations/services/labSettings.service';
import { Phone, Mail } from 'lucide-react';

const HeaderPrint: React.FC = () => {
    const [settings, setSettings] = useState<LabSettings>({
        name: 'Lifeline Diagnostic Labs',
        address: 'Shop No. B-97, Near Vyom Hospital\nOkhla, New Delhi-110025',
        phone: '+91 85xxxxxx20, +91 85xxxxxx20',
        email: 'lifelinelabofflabs@gmail.com',
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await LabSettingsService.getSettings();
                if (data) {
                    setSettings(prev => ({ ...prev, ...data }));
                }
            } catch (error) {
                console.error('Error fetching lab settings:', error);
            }
        };
        fetchSettings();
    }, []);

    const phones = settings.phone ? settings.phone.split(',').map(p => p.trim()) : [];

    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        backgroundColor: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        marginBottom: '20px',
    };

    const topSectionStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: '8px 0 15px 0',
        gap: '20px', 
    };

    const logoContainerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0',
        backgroundColor: '#ffffff',
        minWidth: '100px',
        maxWidth: '150px',
    };

    const logoStyle: React.CSSProperties = {
        width: 'auto',
        maxWidth: '100%',
        maxHeight: '100px',
        objectFit: 'contain',
    };

    const dividerStyle: React.CSSProperties = {
        height: '80px',
        width: '2px',
        background: 'linear-gradient(to bottom, transparent, #e2e8f0, transparent)',
        flexShrink: 0,
    };

    const rightSectionStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        flex: 1,
        gap: '2px',
    };

    const titleStyle: React.CSSProperties = {
        fontSize: '38px', 
        fontWeight: '900',
        fontFamily: '"Exo 2", "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
        color: '#1e3a8a',
        margin: '0',
        textTransform: 'uppercase',
        letterSpacing: '-0.01em',
        lineHeight: '1',
    };

    const phoneBannerStyle: React.CSSProperties = {
        display: 'flex',
        backgroundColor: '#15803d', // Professional forest green
        color: '#ffffff',
        padding: '4px 12px',
        borderRadius: '4px',
        alignItems: 'center',
        fontSize: '14px',
        fontWeight: '700',
        marginBottom: '6px',
        width: 'fit-content',
    };

    const phoneItemStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    };

    const emailStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: '#1e3a8a',
        fontSize: '13px',
        fontWeight: '700',
        marginBottom: '2px',
    };

    const addressStyle: React.CSSProperties = {
        color: '#475569',
        fontSize: '13px',
        margin: 0,
        fontWeight: '600',
        lineHeight: '1.3',
    };

    const bottomLineStyle: React.CSSProperties = {
        width: '100%',
        height: '4px',
        backgroundColor: '#15803d',
        borderRadius: '2px',
    };

    return (
        <div style={containerStyle}>
            {/* Top section with Logo and Contact Info */}
            <div style={topSectionStyle}>

                {/* Left Side: Logo */}
                <div style={logoContainerStyle}>
                    {settings.logo ? (
                        <img src={settings.logo} alt="Lab Logo" style={logoStyle} />
                    ) : (
                        <div style={{ ...logoStyle, width: '120px', height: '80px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontWeight: 'bold', borderRadius: '8px' }}>
                            {settings.name || 'LOGO'}
                        </div>
                    )}
                </div>

                <div style={dividerStyle} />

                {/* Right Side: Contact Details */}
                <div style={rightSectionStyle}>
                    <h1 style={titleStyle}>{settings.name}</h1>

                    <div style={emailStyle}>
                        <Mail size={14} fill="#1e3a8a" color="#ffffff" strokeWidth={1} />
                        <span>{settings.email || 'lifelinelabofflabs@gmail.com'}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', flexWrap: 'wrap' }}>
                        <p style={addressStyle}>
                            {settings.address ? settings.address.replace(/\n/g, ', ') : 'Shop No. B-97, Near Vyom Hospital, Okhla, New Delhi-110025'}
                        </p>
                        
                        <div style={{ height: '12px', width: '1px', backgroundColor: '#cbd5e1' }} />

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', fontSize: '13px', fontWeight: '700' }}>
                            <Phone size={14} fill="#15803d" strokeWidth={0} />
                            <span>
                                {phones.length > 0 ? phones.join(' | ') : '+91 85xxxxxx20'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Border Line */}
            <div style={bottomLineStyle}></div>
        </div>
    );
};

export default HeaderPrint;