'use client';

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from '@/stores/authStore';
import toast from "react-hot-toast";

import {
    Eye,
    EyeOff,
    User as UserIcon,
    Loader2,
    Lock,
    ArrowLeft,
    ChevronRight,
    Briefcase,
    ShieldCheck
} from "lucide-react";

/**
 * ROOT-LEVEL HR LOGIN PAGE
 */
const HRLoginPage = () => {
    const { login, logout, isLoading } = useAuthStore();
    const router = useRouter();

    // ✅ SPEED FIX: Prefetch dashboard
    React.useEffect(() => {
        router.prefetch('/hr');
    }, [router]);

    const [form, setForm] = useState({
        identifier: "",
        password: "",
    });

    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [serverMsg, setServerMsg] = useState("");

    const validate = () => {
        const err: Record<string, string> = {};

        if (!form.identifier || !form.identifier.trim()) {
            err.identifier = "Enter your credential.";
        }

        if (!form.password || form.password.length < 6) {
            err.password = "Password must be at least 6 characters.";
        }

        setErrors(err);
        return Object.keys(err).length === 0;
    };

    const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (errors.identifier) setErrors({ ...errors, identifier: '' });
        if (serverMsg) setServerMsg('');

        setForm({ ...form, identifier: value });
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (errors.password) setErrors({ ...errors, password: '' });
        if (serverMsg) setServerMsg('');
        setForm({ ...form, password: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setServerMsg("");
        setErrors({});

        try {
            await login(form.identifier, form.password);
            const user = useAuthStore.getState().user;

            if (!user) {
                throw new Error("Login failed to retrieve user session.");
            }

            // Roles allowed for HR
            const allowedRoles = ["hr", "admin", "super-admin", "hospital-admin"];
            const role = user.role.toLowerCase();

            if (!allowedRoles.includes(role)) {
                logout(); 
                setServerMsg(`Unauthorized access – Your role (${user.role}) is not authorized for HR Management.`);
                toast.error("Unauthorized access for HR Management", {
                    icon: '🚫',
                });
                return;
            }

            toast.success("Access Granted to HR Portal", {
                icon: '👥',
                style: {
                    borderRadius: '1rem',
                    background: '#1e293b',
                    color: '#fff',
                    fontWeight: 'bold'
                }
            });

            // Redirect to normal hr root, or tenant prefixed hr
            const hospitalId = (user as any).hospitalId || (user as any).hospital;
            if (hospitalId) {
                router.push(`/${hospitalId}/hr`);
            } else {
                router.push('/hr');
            }
        } catch (err: any) {
            const errorMessage = err?.message || err?.response?.data?.message || 'Login failed. Please check your credentials.';
            setServerMsg(errorMessage);
        }
    };

    return (
        <div className="min-h-screen w-full flex justify-center items-center p-0 sm:p-4 lg:p-8 bg-background text-slate-900">
            <div className="flex w-full max-w-6xl bg-card sm:rounded-lg overflow-hidden shadow-2xl border-0 sm:border border-slate-200 min-h-screen sm:min-h-[600px] lg:min-h-[700px]">

                {/* Left Side: Illustration & Branding */}
                <div className="hidden lg:flex w-5/12 flex-col justify-between p-12 relative overflow-hidden bg-slate-50 border-r border-slate-200">
                    <div className="absolute top-0 left-0 w-full h-full -z-10 text-slate-900">
                        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-blue-500/5 rounded-full blur-[100px]" />
                        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-slate-500/5 rounded-full blur-[80px]" />
                    </div>

                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
                        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center p-2">
                             <ShieldCheck size={24} className="text-white" />
                        </div>
                        <span className="text-xl font-bold tracking-tighter text-slate-900">
                            MSCureChain
                        </span>
                    </div>

                    <div className="space-y-6">
                        <div className="relative group">
                            <div className="absolute -inset-2 bg-slate-900/5 rounded-3xl blur-xl" />
                             <div className="relative w-full aspect-square bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center p-12 overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800" alt="HR" className="w-full h-full object-cover rounded-xl" />
                             </div>
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-3xl font-black tracking-tight leading-tight uppercase">
                                Talent Management. <br />
                                <span className="text-slate-500">Payroll & Staff Affairs.</span>
                            </h2>
                            <p className="text-slate-500 text-sm leading-relaxed max-w-sm font-medium">
                                Empowering hospital administration with comprehensive HR solutions for managing the entire workforce efficiently.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-16 relative bg-white">
                    {/* Header for mobile only */}
                    <div className="flex lg:hidden items-center gap-2 mb-8 absolute top-6 left-6">
                        <div
                            onClick={() => router.push('/')}
                            className="p-2 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center"
                        >
                            <ArrowLeft size={18} />
                        </div>
                        <span className="text-sm font-black tracking-tighter text-slate-900 uppercase">HR Portal</span>
                    </div>

                    <button
                        onClick={() => router.push('/')}
                        className="hidden lg:flex absolute top-8 left-8 p-2 rounded-xl hover:bg-slate-50 text-slate-500 items-center gap-2 text-xs font-bold"
                    >
                        <ArrowLeft size={16} /> Back to Home
                    </button>

                    <div className="w-full max-w-[400px] space-y-8 mt-12 lg:mt-0">
                        <div className="text-center lg:text-left space-y-2">
                            <h1 className="text-3xl font-black tracking-tight underline decoration-slate-900/10 underline-offset-8">HR Login</h1>
                            <p className="text-slate-500 text-sm font-medium">Secure access for Human Resources personnel.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">
                                    Email / Mobile
                                </label>
                                <div className={`group flex items-center bg-slate-50 border rounded-lg px-4 py-3.5 sm:py-4 focus-within:border-slate-900 focus-within:bg-white ${errors.identifier ? 'border-red-500/50 bg-red-500/5' : 'border-slate-200'
                                    }`}>
                                    <UserIcon size={20} className={`mr-3 ${errors.identifier ? 'text-red-500' : 'text-slate-400 group-focus-within:text-slate-900'}`} />
                                    <input
                                        type="text"
                                        className="w-full bg-transparent outline-none placeholder:text-slate-300 text-slate-900 font-medium text-base sm:text-sm"
                                        placeholder="Enter registered credential"
                                        value={form.identifier}
                                        onChange={handleIdentifierChange}
                                        suppressHydrationWarning
                                    />
                                </div>
                                {errors.identifier && (
                                    <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider mt-1 ml-1">{errors.identifier}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                        Password
                                    </label>
                                </div>
                                <div className={`group flex items-center bg-slate-50 border rounded-lg px-4 py-3.5 sm:py-4 focus-within:border-slate-900 focus-within:bg-white relative ${errors.password ? 'border-red-500/50 bg-red-500/5' : 'border-slate-200'
                                    }`}>
                                    <Lock size={20} className={`mr-3 ${errors.password ? 'text-red-500' : 'text-slate-400 group-focus-within:text-slate-900'}`} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className="w-full bg-transparent outline-none placeholder:text-slate-300 text-slate-900 font-medium text-base sm:text-sm"
                                        placeholder="••••••••"
                                        value={form.password}
                                        onChange={handlePasswordChange}
                                        suppressHydrationWarning
                                    />
                                    <button
                                        type="button"
                                        className="p-1 text-slate-400 hover:text-slate-900"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider mt-1 ml-1">{errors.password}</p>
                                )}
                            </div>

                            {serverMsg && (
                                <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-bold text-center">
                                    {serverMsg}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed py-4 sm:py-4.5 rounded-2xl text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-900/10 active:scale-[0.98] flex items-center justify-center gap-3"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        <span>Verifying...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Secure Login</span>
                                        <ChevronRight size={18} />
                                    </>
                                )}
                            </button>

                            <div className="flex items-center gap-4 py-2 sm:py-4">
                                <div className="grow h-px bg-slate-100" />
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Personnel Authorization</span>
                                <div className="grow h-px bg-slate-100" />
                            </div>

                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                                    Authorized clinical roles: HR Manager, Admin
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(HRLoginPage);
