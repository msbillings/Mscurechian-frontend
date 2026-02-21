'use client';

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from '@/stores/authStore';

import {
  Eye,
  EyeOff,
  QrCode,
  ShieldCheck,
  Building,
  Smartphone,
  Loader2,
  Mail,
  User as UserIcon,
  Lock,
  ArrowLeft
} from "lucide-react";

const LoginPage = () => {
  const { login, isLoading } = useAuthStore();
  const router = useRouter();

  // ✅ SPEED FIX: Prefetch dashboards while user is on login page
  React.useEffect(() => {
    router.prefetch('/hospital-admin');
    router.prefetch('/doctor');
  }, [router]);

  const [form, setForm] = useState({
    identifier: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverMsg, setServerMsg] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);
  const [dashboardName, setDashboardName] = useState("");

  // Forgot Password State
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [fpForm, setFpForm] = useState({ email: "" });
  const [fpLoading, setFpLoading] = useState(false);
  const [fpErrors, setFpErrors] = useState<Record<string, string>>({});
  const [fpServerMsg, setFpServerMsg] = useState("");

  const mobileRegex = /^[6-9]\d{9}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validate = () => {
    const err: Record<string, string> = {};

    if (!form.identifier || !form.identifier.trim()) {
      err.identifier = "Enter mobile number or doctor ID.";
    } else if (!mobileRegex.test(form.identifier) && form.identifier.trim().length < 3) {
      err.identifier = "Enter valid mobile number or doctor ID.";
    }

    if (!form.password || form.password.length < 6) {
      err.password = "Password must be at least 6 characters.";
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Clear identifier error when user starts typing
    if (errors.identifier) {
      setErrors({ ...errors, identifier: '' });
    }
    if (serverMsg) {
      setServerMsg('');
    }

    // Check if the first character is a digit
    if (/^\d/.test(value)) {
      // If it starts with a digit, enforce numeric only and max 10 chars
      const numericValue = value.replace(/\D/g, '').slice(0, 10);
      setForm({ ...form, identifier: numericValue });
    } else {
      // Allow alphanumeric for Doctor ID
      setForm({ ...form, identifier: value });
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Clear password error when user starts typing
    if (errors.password) {
      setErrors({ ...errors, password: '' });
    }
    if (serverMsg) {
      setServerMsg('');
    }

    setForm({ ...form, password: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setServerMsg("");
    setErrors({});

    try {
      await login(form.identifier, form.password);

      const { user, logout } = useAuthStore.getState();
      
      // ✅ UNIVERSAL LOGIN ROLES ONLY
      const ALLOWED_ROLES = [
        'admin', 'super-admin', 'doctor', 'hospital-admin', 
        'helpdesk', 'staff', 'patient'
      ];

      const role = user?.role?.toLowerCase() || '';
      const hospitalId = (user as any).hospitalId || (user as any).hospital;

      if (user && !ALLOWED_ROLES.includes(role)) {
        logout();
        setServerMsg(`Access Denied: The "${user.role}" role must use its dedicated secure login page.`);
        return;
      }

      // 🚀 MULTI-TENANCY REDIRECTION LOGIC (Allowed Roles Only)
      let finalPath = '/hospital-admin'; // Default fallback
      let dashboardLabel = "Dashboard";

      if (role === 'admin' || role === 'super-admin') {
        finalPath = '/admin';
        dashboardLabel = "Super Admin Panel";
      } else if (role === 'patient') {
        finalPath = '/patient/dashboard';
        dashboardLabel = "Patient Portal";
      } else if (hospitalId) {
        // Map roles to their respective portal paths
        const rolePathMap: Record<string, string> = {
          'doctor': 'doctor',
          'hospital-admin': 'hospital-admin',
          'helpdesk': 'helpdesk',
          'staff': 'staff',
        };

        const portal = rolePathMap[role] || 'hospital-admin';
        finalPath = `/${hospitalId}/${portal}`;
        
        // Pretty name for the feedback UI
        dashboardLabel = portal.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') + " Portal";
      } else {
        // Fallback for users without hospital assignment 
        finalPath = role ? `/${role}` : '/auth/login';
        dashboardLabel = "User Portal";
      }

      // Show navigation feedback
      setDashboardName(dashboardLabel);
      setIsNavigating(true);

      // Use replace for login to prevent user from going back to login page
      router.replace(finalPath);
    } catch (err: any) {
      // Extract error message
      const errorMessage = err?.message || err?.response?.data?.message || err?.error?.message || '';

      // Handle network errors
      if (errorMessage.includes('Cannot connect to server') || errorMessage.includes('Failed to fetch')) {
        setServerMsg(`Cannot connect to server. Please ensure the backend is running.`);
        return;
      }

      // Map backend error messages to form fields
      const fieldErrors: Record<string, string> = {};

      if (errorMessage.toLowerCase().includes('password is wrong') ||
        errorMessage.toLowerCase().includes('password') && errorMessage.toLowerCase().includes('wrong')) {
        fieldErrors.password = 'Incorrect password. Please try again.';
      } else if (errorMessage.toLowerCase().includes('mobile number is wrong') ||
        errorMessage.toLowerCase().includes('mobile') && errorMessage.toLowerCase().includes('wrong')) {
        fieldErrors.identifier = 'Mobile number not found. Please check and try again.';
      } else if (errorMessage.toLowerCase().includes('doctor id is wrong') ||
        errorMessage.toLowerCase().includes('doctor id') && errorMessage.toLowerCase().includes('wrong')) {
        fieldErrors.identifier = 'Doctor ID not found. Please check and try again.';
      } else if (errorMessage.toLowerCase().includes('invalid doctor id')) {
        fieldErrors.identifier = 'Invalid Doctor ID access.';
      } else if (errorMessage) {
        // For other errors, show as server message 
        setServerMsg(errorMessage);
        return;
      } else {
        setServerMsg('Login failed. Please check your credentials.');
        return;
      }

      // Set field-specific errors
      setErrors(fieldErrors);
    }
  };

  const validateFp = () => {
    const newErrors: Record<string, string> = {};
    if (!emailRegex.test(fpForm.email)) {
      newErrors.email = "Enter a valid email address.";
    }
    setFpErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateFp()) return;

    setFpServerMsg("");
    setFpLoading(true);

    try {
      // TODO: Implement forgot password
      setFpServerMsg("Reset link sent.");
    } catch (err: any) {
      setFpServerMsg(err?.message || "Server error");
    } finally {
      setFpLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex justify-center items-center p-0 sm:p-4 lg:p-8 bg-background">
      <div className="flex w-full max-w-6xl bg-card sm:rounded-[0.5rem] overflow-hidden shadow-2xl border-0 sm:border  border-primary-theme/30 min-h-screen sm:min-h-[600px] lg:min-h-[700px]">

        {/* Left Side: Illustration & Branding - Hidden on touch devices/small screens */}
        <div className="hidden lg:flex w-5/12 flex-col justify-between p-12 relative overflow-hidden bg-muted/5 border-r border-border/50">
          {/* Background Decor */}
          <div className="absolute top-0 left-0 w-full h-full -z-10">
            <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-primary-theme/5 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-blue-400/5 rounded-full blur-[80px]" />
          </div>

          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>

            <span className="text-2xl absolute top-15 left-40  max-ms:top-5 max-ms:left-5 font-bold bg-linear-to-r from-primary-theme to-blue-400 bg-clip-text text-transparent">
              MSCureChain
            </span>
          </div>

          <div className="space-y-6">
            <div className="relative group">
              <div className="absolute -inset-2 bg-primary-theme/10 rounded-3xl blur-xl group-hover:bg-primary-theme/20" />
              <img
                src="/assets/image.png"
                className="relative w-full rounded-2xl  border  border-primary-theme/30 "
                alt="Health Portal"
              />
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-black tracking-tight leading-tight">
                Secure. Patient Centric. <br />
                <span className="text-primary-theme">Future Ready.</span>
              </h2>
              <p className="text-muted text-sm leading-relaxed max-w-sm">
                Empowering healthcare providers with real-time data insights and seamless patient management workflows.
              </p>
            </div>
          </div>


        </div>

        {/* Right Side: Form */}
        <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-16 relative bg-card">
          {/* Header for mobile only */}
          <div className="flex lg:hidden items-center gap-2 mb-8 absolute top-6 left-6">
            <div
              onClick={() => router.push('/')}
              className="p-2 rounded-xl bg-muted/10 text-muted flex items-center justify-center"
            >
              <ArrowLeft size={18} />
            </div>
            <img src="/assets/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
            <span className="text-sm font-black tracking-tighter text-primary-theme uppercase">MSCureChain</span>
          </div>

          <button
            onClick={() => router.push('/')}
            className="hidden lg:flex absolute top-8 left-8 p-2 rounded-xl hover:bg-muted/10 text-muted items-center gap-2 text-xs font-bold"
          >
            <ArrowLeft size={16} /> Back to Home
          </button>

          <div className="w-full max-w-[400px] space-y-8 mt-12 lg:mt-0">
            {!showForgotPassword ? (
              <>
                <div className="text-center lg:text-left space-y-2">
                  <h1 className="text-3xl font-black tracking-tight">Login Portal</h1>
                  <p className="text-muted text-sm">Welcome back! Please enter your credentials.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted ml-1">
                      User Identifier
                    </label>
                    <div className={`group flex items-center bg-muted/5 border rounded-[0.4rem] px-4 py-3.5 sm:py-4 focus-within:border-primary-theme focus-within:bg-background ${errors.identifier ? 'border-red-500/50 bg-red-500/5' : 'border-border'
                      }`}>
                      <UserIcon size={20} className={`mr-3 ${errors.identifier ? 'text-red-500' : 'text-muted group-focus-within:text-primary-theme'}`} />
                      <input
                        type="text"
                        className="w-full bg-transparent outline-none placeholder:text-muted/50 text-foreground font-medium text-base sm:text-sm"
                        placeholder="Mobile or Doctor ID"
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
                      <label className="text-xs font-bold uppercase tracking-widest text-muted">
                        Password
                      </label>

                    </div>
                    <div className={`group flex items-center bg-muted/5 border-1 rounded-[0.4rem] px-4 py-3.5 sm:py-4 focus-within:border-primary-theme focus-within:bg-background relative ${errors.password ? 'border-red-500/50 bg-red-500/5' : 'border-border'
                      }`}>
                      <Lock size={20} className={`mr-3 ${errors.password ? 'text-red-500' : 'text-muted group-focus-within:text-primary-theme'}`} />
                      <input
                        type={showPassword ? "text" : "password"}
                        className="w-full bg-transparent outline-none placeholder:text-muted/50 text-foreground font-medium text-base sm:text-sm"
                        placeholder="••••••••"
                        value={form.password}
                        onChange={handlePasswordChange}
                        suppressHydrationWarning
                      />
                      <button
                        type="button"
                        className="p-1 text-muted hover:text-foreground"
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
                    <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-bold text-center animate-shake">
                      {serverMsg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || isNavigating}
                    className="w-full bg-primary-theme hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed py-4 sm:py-4.5 rounded-2xl text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-primary-theme/20 hover:shadow-primary-theme/30 active:scale-[0.98] flex items-center justify-center gap-3"
                  >
                    {isLoading || isNavigating ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      "Sign In Account"
                    )}
                  </button>

                  {isNavigating && (
                    <div className="flex items-center justify-center gap-2 text-primary-theme animate-pulse py-2">
                      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></div>
                      <span className="text-[10px] font-black uppercase tracking-widest italic ml-1">Navigating to {dashboardName}...</span>
                    </div>
                  )}

                  <div className="flex items-center gap-4 py-2 sm:py-4">
                    <div className="grow h-px bg-border/50" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Secure Login</span>
                    <div className="grow h-px bg-border/50" />
                  </div>


                </form>
              </>
            ) : (
              // Forgot Password UI (keeping logic, improvising UI)
              <>
                <div className="text-center lg:text-left space-y-2">
                  <h1 className="text-3xl font-black tracking-tight">Recovery</h1>
                  <p className="text-muted text-sm">Recover access via your registered email.</p>
                </div>

                <form onSubmit={handleFpSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted ml-1">
                      Email Address
                    </label>
                    <div className={`group flex items-center bg-muted/5 border-2 rounded-2xl px-4 py-3.5 focus-within:border-primary-theme focus-within:bg-background ${fpErrors.email ? 'border-red-500/50 bg-red-500/5' : 'border-border'
                      }`}>
                      <Mail size={20} className="mr-3 text-muted group-focus-within:text-primary-theme" />
                      <input
                        type="email"
                        className="w-full bg-transparent outline-none placeholder:text-muted/50 text-foreground font-medium text-base sm:text-sm"
                        placeholder="doctor@curechain.com"
                        value={fpForm.email}
                        onChange={(e) => setFpForm({ ...fpForm, email: e.target.value })}
                      />
                    </div>
                    {fpErrors.email && (
                      <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider mt-1 ml-1">{fpErrors.email}</p>
                    )}
                  </div>

                  {fpServerMsg && (
                    <div className={`p-3.5 rounded-2xl text-[11px] font-bold text-center ${fpServerMsg.includes('sent') ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'
                      } border`}>
                      {fpServerMsg}
                    </div>
                  )}

                  <div className="space-y-3">
                    <button
                      type="submit"
                      disabled={fpLoading}
                      className="w-full bg-primary-theme py-4 rounded-2xl text-white font-black text-sm uppercase tracking-widest  flex items-center justify-center gap-3 active:scale-[0.98]"
                    >
                      {fpLoading ? <Loader2 size={20} className="animate-spin" /> : "Request Reset Link"}
                    </button>
                    <button
                      type="button"
                      className="w-full py-2 text-xs font-bold text-muted hover:text-foreground"
                      onClick={() => setShowForgotPassword(false)}
                    >
                      Back to Secure Login
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;