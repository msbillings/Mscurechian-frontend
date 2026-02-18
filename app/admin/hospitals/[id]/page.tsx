'use client';

import React, { useEffect, useState, use } from "react";
import { 
  Building2, 
  User, 
  Stethoscope, 
  MapPin, 
  Mail, 
  ShieldCheck, 
  Users, 
  ArrowLeft,
  ChevronRight,
  ClipboardList,
  FlaskConical,
  Pill,
  Ambulance,
  Headphones,
  Lock,
  Smartphone,
  Search
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { adminService } from '@/lib/integrations';
import { 
  Badge, 
  Button 
} from '@/components/admin';
import Link from "next/link";

const HospitalPersonnelPage = ({ params }: { params: Promise<{ id: string }> }) => {
    const router = useRouter();
    const resolvedParams = use(params);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('doctors');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchPersonnel();
    }, [resolvedParams.id]);

    const fetchPersonnel = async () => {
        setLoading(true);
        try {
            const result = await adminService.getHospitalPersonnelClient(resolvedParams.id);
            setData(result);
        } catch (err: any) {
            console.error("Failed to fetch personnel", err);
            toast.error("Failed to load hospital directory.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 text-sm font-medium">Loading hospital directory...</p>
            </div>
        );
    }

    if (!data || !data.hospital) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <div className="p-4 bg-gray-100 rounded-full mb-4">
                    <Building2 size={32} className="text-gray-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Hospital not found</h2>
                <p className="text-gray-500 mt-1 mb-6">The hospital you are looking for does not exist in our registry.</p>
                <Button onClick={() => router.back()} variant="outline">
                    Go Back
                </Button>
            </div>
        );
    }

    const { hospital, personnel } = data;

    const tabs = [
        { id: 'doctors', label: 'Doctors', icon: <Stethoscope size={18} />, count: personnel.doctors?.length || 0 },
        { id: 'nurses', label: 'Nurses', icon: <Users size={18} />, count: personnel.nurses?.length || 0 },
        { id: 'hospitalAdmins', label: 'Admins', icon: <ShieldCheck size={18} />, count: personnel.hospitalAdmins?.length || 0 },
        { id: 'helpdesk', label: 'Frontdesk', icon: <Headphones size={18} />, count: personnel.helpdesk?.length || 0 },
        { id: 'pharma', label: 'Pharmacy', icon: <Pill size={18} />, count: personnel.pharma?.length || 0 },
        { id: 'lab', label: 'Lab Staff', icon: <FlaskConical size={18} />, count: personnel.lab?.length || 0 },
        { id: 'emergency', label: 'Ambulance', icon: <Ambulance size={18} />, count: personnel.emergency?.length || 0 },
        { id: 'staff', label: 'Support Staff', icon: <ClipboardList size={18} />, count: personnel.staff?.length || 0 },
    ];

    const currentPersonnel = (personnel[activeTab] || []).filter((person: any) => 
        person.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        person.mobile?.includes(searchQuery) ||
        person.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-6xl mx-auto py-6 px-4 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-8">
                <div>
                    <button 
                        onClick={() => router.back()}
                        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 font-medium mb-3 transition-colors"
                    >
                        <ArrowLeft size={16} /> Back to Hospitals
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                            <Building2 size={32} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{hospital.name}</h1>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                <span className="flex items-center gap-1.5"><MapPin size={14} /> {hospital.address}</span>
                                <span className="flex items-center gap-1.5"><Smartphone size={14} /> {hospital.phone}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Badge className="bg-green-100 text-green-700 border-green-200 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                        {hospital.status || 'Active'}
                    </Badge>
                    <div className="bg-gray-100 px-4 py-2 rounded-xl text-center">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-tight">Total Staff</p>
                        <p className="text-lg font-bold text-gray-900 leading-tight">
                            {Object.values(personnel).reduce((acc: number, curr: any) => acc + (curr?.length || 0), 0)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Content Hub */}
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Left Tabs */}
                <div className="w-full lg:w-64 shrink-0 space-y-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                setSearchQuery('');
                            }}
                            className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all text-sm font-semibold ${
                                activeTab === tab.id 
                                ? 'bg-blue-600 text-white shadow-md' 
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                {tab.icon}
                                <span>{tab.label}</span>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Right Personnel Panel */}
                <div className="flex-1 space-y-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                             List of {tabs.find(t => t.id === activeTab)?.label}
                        </h2>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                                type="text"
                                placeholder="Search by name or ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                        </div>
                    </div>

                    {currentPersonnel.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {currentPersonnel.map((person: any) => (
                                <div key={person._id} className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex items-start gap-4 group">
                                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors shrink-0">
                                        <User size={24} />
                                    </div>
                                    <div className="grow min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="font-bold text-gray-900 truncate">{person.name}</h3>
                                            <Badge className="bg-green-50 text-green-600 border-0 text-[10px] uppercase font-black px-2">
                                                Active
                                            </Badge>
                                        </div>
                                        
                                        <div className="space-y-1.5 mt-3">
                                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                                <Smartphone size={12} className="text-gray-400" />
                                                <span className="font-mono font-bold text-blue-600">{person.mobile}</span>
                                                <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">(Login ID)</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                                <Mail size={12} className="text-gray-400" />
                                                <span className="truncate">{person.email || 'No email registered'}</span>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                {person.profile?.specialization || person.profile?.designation || activeTab}
                                            </span>
                                            <Link href={`/admin/users?search=${person.mobile}`}>
                                                <button className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1">
                                                    Audit Users <ChevronRight size={12} />
                                                </button>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center bg-gray-50 border border-dashed border-gray-200 rounded-2xl">
                            <Users className="mx-auto text-gray-300 mb-3" size={48} />
                            <p className="text-gray-500 font-medium">No personnel found in this category.</p>
                            {searchQuery && <p className="text-xs text-gray-400 mt-1">Try a different search term.</p>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HospitalPersonnelPage;
