import React, { useEffect, useState } from 'react';
import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';
import { Mail, Phone } from 'lucide-react';
import { usePrintStore } from '@/stores/printStore';

export interface ShopDetails {
    name: string;
    address: string;
    phone: string;
    email: string;
}

interface MainFooterProps {
    initialDetails?: ShopDetails;
    instructions?: string[];
}

const MainFooter: React.FC<MainFooterProps> = ({ initialDetails, instructions }) => {
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
                        name: (prev.name === 'Hospital Name' || prev.name === 'CureChain Hospital' || prev.name === ' Hospital' || !prev.name) ? (h.name || prev.name) : prev.name,
                        address: (prev.address === 'Hospital Address' || prev.address === 'Hospital Address details here' || !prev.address) ? (h.address || prev.address) : prev.address,
                        phone: (prev.phone === 'Phone Number' || prev.phone === '+91-XXXXXXXXXX' || !prev.phone || prev.phone === 'N/A') ? (h.phone || prev.phone) : prev.phone,
                        email: (prev.email === 'Email Address' || !prev.email || prev.email === 'N/A') ? (h.email || prev.email) : prev.email,
                    }));
                }
            } catch (error) {
                console.error('Error fetching hospital details for footer:', error);
            }
        };
        fetchHospital();
    }, []);

    const defaultInstructions = [
        'clinical correlation required',
        'Contact helpdesk for alarms',
        'Not for medico-legal use',
        '* non-NABL accredited'
    ];

    const { printWithHeader, footerTerms } = usePrintStore.getState();
    
    // Parse footerTerms into an array of lines, falling back to instructions prop or defaultInstructions
    const customInstructions = footerTerms 
        ? footerTerms.split('\n').filter(t => t.trim() !== '') 
        : null;
    const displayInstructions = customInstructions || instructions || defaultInstructions;

    if (!printWithHeader) {
        return <div style={{ height: '80px', width: '100%' }}></div>;
    }

    return (
        <div style={{
            width: '100%',
            fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            marginTop: '20px',
            padding: '0 2px',
            printColorAdjust: 'exact',
            WebkitPrintColorAdjust: 'exact',
        }}>
            {/* ── Contact Large Blocks (Image 2 Style) ── */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'stretch',
                minHeight: '40px',
                marginBottom: '15px',
                gap: '8px',
                width: '100%'
            }}>
                {details.phone && details.phone !== 'N/A' && details.phone !== 'Phone Number' && (
                    <div style={{
                        flex: '1',
                        background: '#22c55e',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        fontWeight: 900,
                        fontSize: '14px',
                        letterSpacing: '0.5px'
                    }}>
                        <div style={{ marginRight: '10px', display: 'flex', alignItems: 'center' }}>
                            <Phone size={14} fill="white" color="white" />
                        </div>
                        {details.phone}
                    </div>
                )}

                {details.email && details.email !== 'N/A' && details.email !== 'Email Address' && (
                    <div style={{
                        flex: '1',
                        background: '#3b82f6',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        fontWeight: 900,
                        fontSize: '14px',
                        letterSpacing: '0.5px'
                    }}>
                        <div style={{ marginRight: '10px', display: 'flex', alignItems: 'center' }}>
                            <Mail size={14} fill="white" color="white" />
                        </div>
                        {details.email}
                    </div>
                )}
            </div>

            {/* ── Instructions & Address Grid (Dual Column) ── */}
            <div style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                width: '100%',
                gap: '20px',
                marginTop: '10px',
                padding: '0 4px',
                boxSizing: 'border-box'
            }}>
                {/* Left: Instructions - Grow dynamically to take remaining space */}
                <div style={{ flex: '2 1 auto', minWidth: '0' }}>
                    <ul style={{
                        margin: 0,
                        padding: 0,
                        listStyle: 'none',
                        fontSize: '12px',
                        color: '#1e293b',
                        fontWeight: '700',
                        lineHeight: '1.6'
                    }}>
                        {displayInstructions.map((inst, index) => (
                            <li key={index} style={{ marginBottom: '2px', wordBreak: 'break-word' }}>• {inst}</li>
                        ))}
                    </ul>
                </div>

                {/* Right: Address - Fixed width to allow instructions to take up remaining space */}
                <div style={{ flex: '1 1 250px', textAlign: 'left', minWidth: '0' }}>
                    <p style={{
                        margin: 0,
                        fontSize: '12px',
                        fontWeight: '800',
                        color: '#0f172a',
                        textTransform: 'uppercase',
                        lineHeight: '1.5',
                        maxWidth: 'none',
                        wordBreak: 'break-word'
                    }}>
                        {details.address}
                    </p>
                </div>
            </div>

            
            {/* Print spacing */}
            <div style={{ height: '10px' }}></div>
        </div>
    );
};


export default MainFooter;