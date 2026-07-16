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




            
            {/* Print spacing */}
            <div style={{ height: '10px' }}></div>
        </div>
    );
};


export default MainFooter;