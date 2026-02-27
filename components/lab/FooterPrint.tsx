import React, { useEffect, useState } from 'react';
import { LabSettingsService, LabSettings } from '@/lib/integrations/services/labSettings.service';
import { Phone, Mail } from 'lucide-react';

const FooterPrint: React.FC = () => {
    const [settings, setSettings] = useState<LabSettings>({
        name: 'MediLab Laboratory',
        address: 'RAM MAIN ROAD, BESIDE APOLLO PHARMACY, RENIGUNTA - 517 520',
        phone: '9059373238',
        email: 'blueskydiagnostics.scan@gmail.com',
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await LabSettingsService.getSettings();
                if (data) {
                    setSettings(prev => ({ ...prev, ...data }));
                }
            } catch (error) {
                console.error('Error fetching lab settings for footer:', error);
            }
        };
        fetchSettings();
    }, []);

    const phones = settings.phone ? settings.phone.split(',').map(p => p.trim()) : [];

    return (
        <div style={{ width: '100%', fontFamily: 'Arial, sans-serif', marginTop: '24px' }}>

            {/* ── Contact Banner Row ── */}
            <div style={{ display: 'flex', width: '100%', marginBottom: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>

                {/* Green phone side — takes ~50% width */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#15803d',
                    color: '#ffffff',
                    padding: '8px 20px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    width: '50%',
                    clipPath: 'polygon(0 0, 95% 0, 100% 50%, 95% 100%, 0 100%)',
                    boxSizing: 'border-box',
                }}>
                    <Phone size={15} fill="white" strokeWidth={0} style={{ flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap' }}>
                        {phones.join('  |  ') || '0000000000'}
                    </span>
                </div>

                {/* Blue email side — takes remaining space */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '8px',
                    backgroundColor: '#1e3a8a',
                    color: '#ffffff',
                    padding: '8px 20px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    flex: 1,
                    marginLeft: '-15px',
                    clipPath: 'polygon(5% 0, 100% 0, 100% 100%, 5% 100%, 0 50%)',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                }}>
                    <Mail size={15} style={{ flexShrink: 0 }} />
                    <span style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}>
                        {settings.email || 'admin@medilab.com'}
                    </span>
                </div>
            </div>

            {/* ── Disclaimers + Address Row ── */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                padding: '2px 4px 0 4px',
                gap: '16px',
            }}>
                {/* Left: Disclaimers */}
                <ul style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    color: '#1e3a8a',
                    fontSize: '11px',
                    lineHeight: '1.6',
                    fontWeight: '700',
                    flex: '0 0 auto',
                    maxWidth: '58%',
                }}>
                    <li>• Results clinically correlation recommended</li>
                    <li>• Contact lab immediately for alarming results</li>
                    <li>• Not for medico-legal purposes</li>
                    <li>• (*) Tests are not NABL accredited</li>
                </ul>

                {/* Right: Address */}
                <p style={{
                    margin: 0,
                    color: '#1a3c5a',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    textAlign: 'right',
                    flex: '0 0 auto',
                    maxWidth: '40%',
                    lineHeight: '1.6',
                    wordBreak: 'break-word',
                }}>
                    {settings.address || 'RAM MAIN ROAD, BESIDE APOLLO PHARMACY, RENIGUNTA - 517 520'}
                </p>
            </div>
        </div>
    );
};

export default FooterPrint;