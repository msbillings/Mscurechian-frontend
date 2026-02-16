'use client';

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import {
    UserPlus,
    Save,
    RotateCcw,
    Shield,
    AlertCircle,
    CheckCircle2,
    Loader2,
    ChevronRight,
    ArrowLeft,
    Activity,
    User,
    Phone,
    MapPin,
    Calendar,
    Droplets,
    Heart,
    Clock
} from "lucide-react";
import { helpdeskService, ipdService } from "@/lib/integrations";
import { HelpdeskDoctor, Bed } from "@/lib/integrations/types";
import toast from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface FieldError {
    [key: string]: string;
}

export default function PatientRegistration() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<FieldError>({});
    const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

    const [formData, setFormData] = useState({
        honorific: 'Mr',
        name: '',
        age: '',
        dob: '',
        gender: 'male',
        address: '',
        mobile: '',
        emergencyContact: '',
        emergencyContactEmail: '',
        bloodGroup: 'Unknown',
        allergies: '',
        medicalHistory: '',
        registrationType: 'OPD' as 'OPD' | 'IPD'
    });

    const [doctors, setDoctors] = useState<HelpdeskDoctor[]>([]);
    const [beds, setBeds] = useState<Bed[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);
    const [selectedDept, setSelectedDept] = useState<string>('');
    const [loadingInitial, setLoadingInitial] = useState(true);

    useEffect(() => {
        const initialType = searchParams.get('type') as 'OPD' | 'IPD' || 'OPD';
        const initialBed = searchParams.get('bedId') || '';

        setFormData(prev => ({
            ...prev,
            registrationType: initialType
        }));

        const loadInit = async () => {
            try {
                const [docsData, bedsData] = await Promise.all([
                    helpdeskService.getDoctors(),
                    ipdService.getBeds({ status: 'Vacant' })
                ]);
                setDoctors(docsData);
                setBeds(bedsData);

                const depts = Array.from(new Set(docsData.map(d => d.department).filter(Boolean)));
                setDepartments(depts as string[]);
            } catch (e) {
                toast.error("Failed to load initial data");
            } finally {
                setLoadingInitial(false);
            }
        };
        loadInit();
    }, [searchParams]);

    // Auto-calculate age from DOB
    useEffect(() => {
        if (formData.dob) {
            const birthDate = new Date(formData.dob);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();

            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }

            if (age >= 0) {
                setFormData(prev => ({ ...prev, age: age.toString() }));
            }
        }
    }, [formData.dob]);

    // Auto-set gender based on honorific
    useEffect(() => {
        if (formData.honorific === 'Mr') {
            setFormData(prev => ({ ...prev, gender: 'male' }));
        } else if (formData.honorific === 'Mrs' || formData.honorific === 'Ms') {
            setFormData(prev => ({ ...prev, gender: 'female' }));
        }
    }, [formData.honorific]);

    const validateField = (name: string, value: string): string => {
        const trimmed = value.trim();
        switch (name) {
            case 'name':
                if (!trimmed) return 'Patient Name Required';
                if (trimmed.length < 2) return 'Minimum 2 characters expected';
                if (trimmed.length > 150) return 'Name cannot exceed 150 characters';
                if (!/^[a-zA-Z\s.]+$/.test(trimmed)) return 'Only letters and dots allowed';
                return '';
            case 'mobile':
                if (!trimmed) return 'Mobile Number Required';
                if (!/^[6-9][0-9]{9}$/.test(trimmed.replace(/\D/g, ''))) return 'Invalid 10-digit number';
                return '';
            case 'emergencyContact':
                if (trimmed && !/^[6-9][0-9]{9}$/.test(trimmed.replace(/\D/g, ''))) return 'Invalid 10-digit number';
                return '';
            case 'emergencyContactEmail':
                if (trimmed && trimmed.length > 100) return 'Email cannot exceed 100 characters';
                if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Invalid email format';
                return '';
            case 'address':
                if (!trimmed) return 'Residential Address Required';
                if (trimmed.length < 5) return 'Full address required (min 5 chars)';
                if (trimmed.length > 300) return 'Address cannot exceed 300 characters';
                return '';
            case 'age':
                if (!trimmed && !formData.dob) return 'Age Required';
                if (!trimmed) return ''; // Let auto-fill handle it
                const ageNum = Number(trimmed);
                if (isNaN(ageNum) || ageNum < 0 || ageNum > 125) return 'Age must be between 0-125';
                return '';
            case 'dob':
                if (!trimmed) return 'DOB Required';
                const date = new Date(trimmed);
                if (date > new Date()) return 'Future dates not allowed';
                if (date < new Date('1900-01-01')) return 'Invalid date (too old)';
                return '';
            case 'allergies':
                if (trimmed.length > 200) return 'Allergies cannot exceed 200 characters';
                return '';
            case 'medicalHistory':
                if (trimmed.length > 400) return 'History cannot exceed 400 characters';
                return '';
            default:
                return '';
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        let processedValue = value;
        if (name === 'mobile' || name === 'emergencyContact') {
            processedValue = value.replace(/\D/g, '').slice(0, 10);
        } else if (name === 'name') {
            processedValue = value.slice(0, 150);
        } else if (name === 'address') {
            processedValue = value.slice(0, 300);
        } else if (name === 'allergies') {
            processedValue = value.slice(0, 200);
        } else if (name === 'medicalHistory') {
            processedValue = value.slice(0, 400);
        } else if (name === 'emergencyContactEmail') {
            processedValue = value.slice(0, 100);
        }

        setFormData(prev => ({ ...prev, [name]: processedValue }));

        if (touched[name]) {
            const error = validateField(name, processedValue);
            setErrors(prev => ({ ...prev, [name]: error }));
        }
    };

    const handleBlur = (name: string) => {
        setTouched(prev => ({ ...prev, [name]: true }));
        const error = validateField(name, (formData as any)[name]);
        setErrors(prev => ({ ...prev, [name]: error }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate all fields
        const newErrors: FieldError = {};
        let hasError = false;

        ['name', 'mobile', 'address', 'age', 'dob'].forEach(field => {
            const err = validateField(field, (formData as any)[field]);
            if (err) {
                newErrors[field] = err;
                hasError = true;
            }
        });

        setErrors(newErrors);
        setTouched({
            name: true, mobile: true, address: true, age: true, dob: true
        });

        if (hasError) {
            toast.error("Please fix form errors");
            return;
        }

        try {
            setSubmitting(true);
            const registrationData = {
                ...formData,
                age: parseInt(formData.age),
                name: formData.name.trim(),
                address: formData.address.trim(),
                allergies: formData.allergies ? [formData.allergies] : []
            };

            const res = await helpdeskService.registerPatient(registrationData as any);

            toast.success(`Successfully Registered: ${res.patient.mrn}`);
            setTimeout(() => {
                router.push(`/helpdesk/appointment-booking?patientId=${res.patient.id}&type=${formData.registrationType}`);
            }, 1000);
        } catch (error: any) {
            toast.error(error.message || "Failed to register");
        } finally {
            setSubmitting(false);
        }
    };

    const filteredDoctors = selectedDept
        ? doctors.filter(d => d.department === selectedDept)
        : doctors;

    return (
        <div className="space-y-4 animate-in fade-in duration-500 pb-12">

            {/* HEADER */}
            <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-3 border-b border-slate-200 pb-3 max-w-full mx-auto">
                <div className="flex items-center gap-4">
                    <Link href="/helpdesk" className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:text-teal-600 transition-all shadow-sm">
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                            Patient Registration
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Reception / Patient Admission • Registry Manifest</p>
                    </div>
                </div>

                {/* GLOWING MESSAGE - CENTERED */}
                <div className="hidden md:flex justify-center">
                    <p className="text-xs font-bold text-teal-600 uppercase tracking-widest" style={{ animation: 'glow 2s ease-in-out infinite' }}>
                        ✨ Your data is storing continuously
                    </p>
                </div>

                <div className="hidden md:flex justify-end gap-2 text-slate-400">
                    <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                        <Clock size={14} className="text-teal-500" />
                        <span className="text-[10px] font-bold uppercase tracking-tight text-slate-500">
                            {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>
            </div>

            <div className="max-w-full mx-auto">
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-4 md:p-6">

                    <div className="space-y-5">
                        {/* REGISTRATION TYPE TOGGLE */}


                        {/* PERSONAL INFORMATION SECTION */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                                <User size={16} className="text-teal-600" />
                                <h2 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Personal Information</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                <div className="md:col-span-2">
                                    <FormInput label="Honorific" required component={
                                        <select name="honorific" value={formData.honorific} onChange={handleChange} className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold transition-all">
                                            <option value="Mr">Mr.</option>
                                            <option value="Mrs">Mrs.</option>
                                            <option value="Ms">Ms.</option>
                                            <option value="Dr">Dr.</option>
                                        </select>
                                    } />
                                </div>
                                <div className="md:col-span-5">
                                    <FormInput label="Full Name" required error={touched.name ? errors.name : ''} component={
                                        <input name="name" value={formData.name} onChange={handleChange} onBlur={() => handleBlur('name')} placeholder="Name" className={`w-full px-3 py-2 rounded-xl bg-slate-50 border ${errors.name && touched.name ? 'border-rose-500' : 'border-slate-200'} focus:border-teal-500 focus:bg-white outline-none text-sm font-bold transition-all`} />
                                    } />
                                </div>
                                <div className="md:col-span-5">
                                    <FormInput label="Mobile Number" required error={touched.mobile ? errors.mobile : ''} component={
                                        <input name="mobile" value={formData.mobile} onChange={handleChange} onBlur={() => handleBlur('mobile')} placeholder="10-digit number" className={`w-full px-3 py-2 rounded-xl bg-slate-50 border ${errors.mobile && touched.mobile ? 'border-rose-500' : 'border-slate-200'} focus:border-teal-500 focus:bg-white outline-none text-sm font-bold transition-all`} />
                                    } />
                                </div>
                                <div className="md:col-span-4">
                                    <FormInput label="Date of Birth" required error={touched.dob ? errors.dob : ''} component={
                                        <input type="date" name="dob" value={formData.dob} onChange={handleChange} onBlur={() => handleBlur('dob')} className={`w-full px-3 py-2 rounded-xl bg-slate-50 border ${errors.dob && touched.dob ? 'border-rose-500' : 'border-slate-200'} focus:border-teal-500 focus:bg-white outline-none text-sm font-bold transition-all`} />
                                    } />
                                </div>
                                <div className="md:col-span-3">
                                    <FormInput label="Age" required={!formData.dob} error={touched.age ? errors.age : ''} component={
                                        <input name="age" type="number" value={formData.age} onChange={handleChange} onBlur={() => handleBlur('age')} placeholder="Age" readOnly className={`w-full px-3 py-2 rounded-xl bg-slate-100 border ${errors.age && touched.age ? 'border-rose-500' : 'border-slate-200'} cursor-not-allowed text-sm font-bold transition-all opacity-70`} />
                                    } />
                                </div>
                                <div className="md:col-span-5">
                                    <FormInput label="Gender" required component={
                                        <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white outline-none text-sm font-bold transition-all">
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                        </select>
                                    } />
                                </div>
                            </div>
                        </section>

                        {/* ADDRESS & CONTACT SECTION */}
                        <section className="grid grid-cols-1 md:grid-cols-12 gap-6">
                            <div className="md:col-span-8 space-y-4">
                                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                                    <MapPin size={16} className="text-teal-600" />
                                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Address Details</h2>
                                </div>
                                <FormInput label="Residential Address" required error={touched.address ? errors.address : ''} component={
                                    <div className="relative">
                                        <textarea name="address" value={formData.address} onChange={handleChange} onBlur={() => handleBlur('address')} rows={2} placeholder="Full address" className={`w-full px-3 py-2 rounded-xl bg-slate-50 border ${errors.address && touched.address ? 'border-rose-500' : 'border-slate-200'} focus:border-teal-500 focus:bg-white outline-none text-sm font-bold resize-none transition-all`} />
                                        <div className="absolute bottom-2 right-3 text-[9px] font-bold text-slate-400 pointer-events-none uppercase">
                                            {formData.address.length}/300
                                        </div>
                                    </div>
                                } />
                            </div>
                            <div className="md:col-span-4 space-y-4">
                                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                                    <Phone size={16} className="text-teal-600" />
                                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Emergency Contact</h2>
                                </div>
                                <FormInput label="Emergency Mobile" error={touched.emergencyContact ? errors.emergencyContact : ''} component={
                                    <input name="emergencyContact" value={formData.emergencyContact} onChange={handleChange} onBlur={() => handleBlur('emergencyContact')} placeholder="10-digit number" className={`w-full px-3 py-2 rounded-xl bg-slate-50 border ${errors.emergencyContact && touched.emergencyContact ? 'border-rose-500' : 'border-slate-200'} outline-none text-sm font-bold transition-all`} />
                                } />
                                <FormInput label="Email Address" error={touched.emergencyContactEmail ? errors.emergencyContactEmail : ''} component={
                                    <input name="emergencyContactEmail" type="email" value={formData.emergencyContactEmail} onChange={handleChange} onBlur={() => handleBlur('emergencyContactEmail')} placeholder="patient@example.com" className={`w-full px-3 py-2 rounded-xl bg-slate-50 border ${errors.emergencyContactEmail && touched.emergencyContactEmail ? 'border-rose-500' : 'border-slate-200'} focus:border-teal-500 focus:bg-white outline-none text-sm font-bold transition-all`} />
                                } />
                            </div>
                        </section>

                        {/* MEDICAL INFORMATION SECTION */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                                <Heart size={16} className="text-teal-600" />
                                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Medical Information</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                <div className="md:col-span-3">
                                    <FormInput label="Blood Group" component={
                                        <select
                                            name="bloodGroup"
                                            value={formData.bloodGroup}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white outline-none text-sm font-bold transition-all"
                                        >
                                            <option value="Unknown">Unknown</option>
                                            <option value="O+">O+</option>
                                            <option value="O-">O-</option>
                                            <option value="A+">A+</option>
                                            <option value="A-">A-</option>
                                            <option value="B+">B+</option>
                                            <option value="B-">B-</option>
                                            <option value="AB+">AB+</option>
                                            <option value="AB-">AB-</option>
                                        </select>
                                    } />
                                </div>

                                <div className="md:col-span-4">
                                    <FormInput label="Previous Allergies" error={touched.allergies ? errors.allergies : ''} component={
                                        <div className="relative">
                                            <input
                                                name="allergies"
                                                value={formData.allergies}
                                                onChange={handleChange}
                                                onBlur={() => handleBlur('allergies')}
                                                placeholder="Known allergies..."
                                                className={`w-full px-3 py-2 rounded-xl bg-slate-50 border ${errors.allergies && touched.allergies ? 'border-rose-500' : 'border-slate-200'} focus:border-teal-500 focus:bg-white outline-none text-sm font-bold transition-all`}
                                            />
                                            <div className="absolute top-1/2 -translate-y-1/2 right-3 text-[9px] font-bold text-slate-300 pointer-events-none uppercase">
                                                {formData.allergies.length}/200
                                            </div>
                                        </div>
                                    } />
                                </div>

                                <div className="md:col-span-5">
                                    <FormInput label="Health Issues / History" error={touched.medicalHistory ? errors.medicalHistory : ''} component={
                                        <div className="relative">
                                            <textarea
                                                name="medicalHistory"
                                                value={formData.medicalHistory}
                                                onChange={handleChange}
                                                onBlur={() => handleBlur('medicalHistory')}
                                                rows={2}
                                                placeholder="Conditions..."
                                                className={`w-full px-3 py-2 rounded-xl bg-slate-50 border ${errors.medicalHistory && touched.medicalHistory ? 'border-rose-500' : 'border-slate-200'} focus:border-teal-500 focus:bg-white outline-none text-sm font-bold resize-none transition-all`}
                                            />
                                            <div className="absolute bottom-2 right-3 text-[9px] font-bold text-slate-400 pointer-events-none uppercase">
                                                {formData.medicalHistory.length}/400
                                            </div>
                                        </div>
                                    } />
                                </div>
                            </div>
                        </section>

                        {/* SUBMIT BUTTON */}
                        <div className="pt-6 flex justify-end gap-3">
                            <button type="button" onClick={() => router.back()} className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2">
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting || Object.values(errors).some(e => !!e)}
                                className="px-10 py-2.5 bg-teal-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-teal-700 transition-all shadow-lg active:scale-95 disabled:opacity-30 flex items-center gap-2"
                            >
                                {submitting ? <Loader2 className="animate-spin" size={14} /> : (
                                    <>
                                        {formData.registrationType === 'IPD' ? 'Complete Admission' : 'Complete Registration'}
                                        <ChevronRight size={14} />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            <style jsx global>{`
                @keyframes glow {
                    0%, 100% {
                        text-shadow: 0 0 5px rgba(13, 148, 136, 0.5), 0 0 10px rgba(13, 148, 136, 0.3);
                        opacity: 1;
                    }
                    50% {
                        text-shadow: 0 0 10px rgba(13, 148, 136, 0.8), 0 0 20px rgba(13, 148, 136, 0.5);
                        opacity: 0.8;
                    }
                }
            `}</style>
        </div>
    );
}

function FormInput({ label, required, component, error }: any) {
    return (
        <div className="space-y-1.5 flex flex-col">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                {label} {required && <span className="text-rose-500">*</span>}
            </label>
            <div className="relative">{component}</div>
            {error && <p className="text-[10px] font-bold text-rose-500 uppercase mt-1 ml-1 flex items-center gap-1"><AlertCircle size={10} /> {error}</p>}
        </div>
    );
}