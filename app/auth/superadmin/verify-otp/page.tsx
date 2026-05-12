'use client';

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from '@/stores/authStore';
import { 
  Loader2, 
  ShieldCheck, 
  ArrowLeft, 
  Mail, 
  Timer, 
  RefreshCcw,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

export default function SuperAdminVerifyOtp() {
  const router = useRouter();
  const { verifySuperAdminOtp, resendSuperAdminOtp, isLoading } = useAuthStore();
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [email, setEmail] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = React.useMemo(() => [
    React.createRef<HTMLInputElement>(),
    React.createRef<HTMLInputElement>(),
    React.createRef<HTMLInputElement>(),
    React.createRef<HTMLInputElement>(),
    React.createRef<HTMLInputElement>(),
    React.createRef<HTMLInputElement>(),
  ], []);

  useEffect(() => {
    const storedEmail = sessionStorage.getItem('msc_2fa_email');
    const storedToken = sessionStorage.getItem('msc_2fa_temp_token');
    
    if (!storedToken) {
      router.replace('/auth/login');
      return;
    }
    
    setEmail(storedEmail || 'your email');
    setTempToken(storedToken);
    
    // Focus first input
    inputRefs[0].current?.focus();
    
    // Timer logic
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [router, inputRefs]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');

    if (value && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const data = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(data)) return;

    const newOtp = [...otp];
    data.split('').forEach((char, i) => {
      if (i < 6) newOtp[i] = char;
    });
    setOtp(newOtp);
    
    if (data.length === 6) {
      inputRefs[5].current?.focus();
    } else {
      inputRefs[data.length].current?.focus();
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    try {
      await verifySuperAdminOtp(otpString, tempToken);
      setSuccess('Verified successfully! Redirecting...');
      sessionStorage.removeItem('msc_2fa_temp_token');
      sessionStorage.removeItem('msc_2fa_email');
      
      setTimeout(() => {
        router.push('/admin');
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Please try again.');
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    
    try {
      await resendSuperAdminOtp(tempToken);
      setSuccess('New OTP sent to your email');
      setTimeLeft(600);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      inputRefs[0].current?.focus();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to resend OTP');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-3xl shadow-2xl border border-border/50">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 bg-primary-theme/10 rounded-2xl flex items-center justify-center text-primary-theme mb-4">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Two-Step Verification</h1>
          <p className="text-muted text-sm leading-relaxed">
            We've sent a 6-digit code to <br />
            <span className="font-bold text-foreground">{email}</span>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleVerify} className="space-y-8">
          <div className="flex justify-between gap-2">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={inputRefs[index]}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                disabled={isLoading}
                className="w-12 h-14 text-center text-xl font-black rounded-xl border-2 border-border bg-muted/5 focus:border-primary-theme focus:bg-background outline-none transition-all disabled:opacity-50"
              />
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-bold">
              <CheckCircle2 size={16} />
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || otp.join('').length !== 6}
            className="w-full bg-primary-theme hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-2xl text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-primary-theme/20 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Verify & Login"}
          </button>
        </form>

        {/* Footer */}
        <div className="pt-6 border-t border-border/50 space-y-4">
          <div className="flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-2 text-muted">
              <Timer size={14} />
              <span>Expires in:</span>
            </div>
            <span className={timeLeft < 60 ? "text-red-500" : "text-primary-theme"}>
              {formatTime(timeLeft)}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleResend}
              disabled={!canResend || isLoading}
              className="flex items-center justify-center gap-2 text-xs font-bold text-primary-theme hover:opacity-80 disabled:opacity-30 transition-all"
            >
              <RefreshCcw size={14} className={isLoading ? "animate-spin" : ""} />
              Resend Code
            </button>
            
            <button
              onClick={() => router.push('/auth/login')}
              className="flex items-center justify-center gap-2 text-xs font-bold text-muted hover:text-foreground transition-all"
            >
              <ArrowLeft size={14} />
              Back to Login
            </button>
          </div>
        </div>

        <p className="text-[10px] text-center text-muted/60 font-medium">
          Secure Session provided by MSCureChain Shield. <br />
          Do not share your OTP with anyone.
        </p>
      </div>
    </div>
  );
}
