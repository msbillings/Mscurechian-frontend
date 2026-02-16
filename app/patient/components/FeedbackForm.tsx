"use client";

import React, { useState } from 'react';
import { Star, MessageSquare, Send, CheckCircle2, ChevronRight, X } from 'lucide-react';
import { feedbackService } from '@/lib/integrations/services/feedback.service';
import toast from 'react-hot-toast';

export default function FeedbackForm() {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [category, setCategory] = useState({ label: '', icon: '' });
    const [comment, setComment] = useState('');
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const categories = [
        { label: 'Clinical Care', icon: '🩺' },
        { label: 'Staff Behavior', icon: '🤝' },
        { label: 'Facilities', icon: '🏥' },
        { label: 'Wait Time', icon: '⏳' },
        { label: 'Billing', icon: '💳' },
        { label: 'Other', icon: '📝' }
    ];

    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async () => {
        if (!isConfirmed) {
            toast.error("Please confirm you are ready to submit.");
            return;
        }

        setIsSubmitting(true);
        try {
            await feedbackService.createFeedback({
                rating,
                category: category.label,
                comment,
                isAnonymous: false
            });
            setIsSuccess(true);
            setTimeout(() => {
                setIsOpen(false);
                resetForm();
            }, 5000);
        } catch (error) {
            console.error("Feedback submit error:", error);
            toast.error("Failed to submit feedback. Please try again.");
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setStep(1);
        setRating(0);
        setCategory({ label: '', icon: '' });
        setComment('');
        setIsConfirmed(false);
        setIsSubmitting(false);
        setIsSuccess(false);
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all transform hover:scale-105 active:scale-95"
            >
                <MessageSquare className="w-5 h-5" />
                <span className="font-bold">Feedback</span>
            </button>
        );
    }

    if (isSuccess) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                <div className="bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] p-0 max-w-sm w-full text-center animate-in zoom-in-95 duration-300 flex flex-col items-center relative overflow-hidden border border-white/50 ring-1 ring-slate-100">

                    {/* Top Decor */}
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none" />

                    <div className="p-8 pb-10 flex flex-col items-center w-full z-10">
                        {/* Success Icon with Pulse */}
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
                            <div className="w-20 h-20 bg-gradient-to-tr from-green-500 to-emerald-400 rounded-full flex items-center justify-center shadow-lg shadow-green-200 ring-4 ring-white relative z-10">
                                <CheckCircle2 className="w-10 h-10 text-white" strokeWidth={3} />
                            </div>
                        </div>

                        {/* Title */}
                        <h2 className="text-xl font-black text-slate-800 mb-2 tracking-tight">
                            Feedback Submitted!
                        </h2>

                        {/* Subtitle */}
                        <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-[260px] mx-auto mb-8">
                            Your feedback helps us improve the hospital experience for everyone.
                        </p>

                        {/* Doctor Section - Premium Card Style */}
                        <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden group">
                            {/* Subtle bg pattern */}
                            <div className="absolute right-0 top-0 w-20 h-20 bg-blue-100/50 rounded-full blur-2xl -mr-10 -mt-10"></div>

                            <img
                                src="/assets/doctor-feedback-success.png"
                                alt="Dr."
                                className="w-16 h-16 object-contain drop-shadow-md relative z-10 group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="text-left relative z-10">
                                <p className="font-bold text-slate-800 text-sm leading-tight">Thank you for sharing</p>
                                <p className="font-bold text-slate-800 text-sm leading-tight">your experience!</p>
                                <div className="flex items-center gap-1.5 mt-2">
                                    <span className="flex h-2 w-2 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Recorded</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar - Bottom Border Style */}
                    <div className="w-full bg-slate-100 h-1.5 mt-auto">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-green-500 animate-[progress_5s_linear_forwards] w-full origin-left"></div>
                    </div>

                </div>
                {/* Animation Keyframes */}
                <style jsx>{`
                    @keyframes progress {
                        from { width: 100%; }
                        to { width: 0%; }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">

                {/* Header with Title & Stepper */}
                <div className="p-6 bg-white border-b border-gray-100">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Patient Feedback</h2>
                            <p className="text-sm text-gray-500">We value your opinion</p>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Clean Stepper */}
                    <div className="flex items-center justify-between px-2 w-full max-w-sm mx-auto">

                        {/* Step 1: Rate */}
                        <div className="flex flex-col items-center gap-1 relative z-10 w-16">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 border-[3px] ${step > 1 ? 'bg-green-500 border-green-500 text-white' :
                                step === 1 ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-400'
                                }`}>
                                {step > 1 ? <CheckCircle2 size={20} /> : '1'}
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>RATE</span>
                        </div>

                        {/* Line 1-2 */}
                        <div className="flex-1 h-1 mx-2 rounded-full overflow-hidden bg-gray-100">
                            <div className={`h-full transition-all duration-500 ease-out ${step >= 2 ? 'bg-green-500 w-full' : 'w-0'}`} />
                        </div>

                        {/* Step 2: Topic */}
                        <div className="flex flex-col items-center gap-1 relative z-10 w-16">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 border-[3px] ${step > 2 ? 'bg-green-500 border-green-500 text-white' :
                                step === 2 ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-400'
                                }`}>
                                {step > 2 ? <CheckCircle2 size={20} /> : '2'}
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>TOPIC</span>
                        </div>

                        {/* Line 2-3 */}
                        <div className="flex-1 h-1 mx-2 rounded-full overflow-hidden bg-gray-100">
                            <div className={`h-full transition-all duration-500 ease-out ${step >= 3 ? 'bg-green-500 w-full' : 'w-0'}`} />
                        </div>

                        {/* Step 3: Submit */}
                        <div className="flex flex-col items-center gap-1 relative z-10 w-16">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 border-[3px] ${step > 3 ? 'bg-green-500 border-green-500 text-white' :
                                step === 3 ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-400'
                                }`}>
                                {step > 3 ? <CheckCircle2 size={20} /> : '3'}
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>SUBMIT</span>
                        </div>

                    </div>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar min-h-[300px]">

                    {/* Step 1: Rating */}
                    {step === 1 && (
                        <div className="flex flex-col items-center justify-center py-8 space-y-6 animate-in slide-in-from-right-8 duration-300 fade-in">
                            <p className="text-lg font-medium text-gray-700">How was your experience?</p>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        onClick={() => { setRating(star); setTimeout(() => setStep(2), 200); }}
                                        className="transform transition-all duration-200 hover:scale-110 focus:outline-none p-1"
                                    >
                                        <Star
                                            size={44}
                                            className={`${star <= (hoverRating || rating)
                                                ? 'fill-amber-400 text-amber-500'
                                                : 'fill-gray-50 text-gray-200'
                                                } transition-colors duration-200`}
                                        />
                                    </button>
                                ))}
                            </div>
                            <p className="text-sm font-medium text-gray-400 h-6">
                                {hoverRating === 1 ? "Very Poor" :
                                    hoverRating === 2 ? "Poor" :
                                        hoverRating === 3 ? "Average" :
                                            hoverRating === 4 ? "Good" :
                                                hoverRating === 5 ? "Excellent" : ""}
                            </p>
                        </div>
                    )}

                    {/* Step 2: Category */}
                    {step === 2 && (
                        <div className="space-y-4 animate-in slide-in-from-right-8 duration-300 fade-in">
                            <p className="text-lg font-medium text-gray-700 text-center mb-4">What is this about?</p>
                            <div className="grid grid-cols-2 gap-3">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.label}
                                        onClick={() => { setCategory(cat); setTimeout(() => setStep(3), 200); }}
                                        className={`p-4 rounded-xl border text-left transition-all duration-200 hover:shadow-md ${category.label === cat.label
                                            ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-500'
                                            : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <span className="text-2xl mb-2 block filter grayscale-[0.2]">{cat.icon}</span>
                                        <span className="font-semibold text-sm">{cat.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Details & Confirm */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 duration-300 fade-in">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Additional Comments (Optional)</label>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    autoFocus
                                    placeholder="Tell us more about your experience..."
                                    className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none h-32 text-sm"
                                />
                            </div>

                            <div
                                onClick={() => setIsConfirmed(!isConfirmed)}
                                className={`flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all border ${isConfirmed ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'
                                    }`}
                            >
                                <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isConfirmed ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
                                    }`}>
                                    {isConfirmed && <CheckCircle2 size={14} className="text-white" />}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900 leading-tight">I am ready to submit my feedback.</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        By checking this box, you confirm that your feedback is genuine and helpful.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-gray-100 flex justify-between bg-white">
                    {step > 1 ? (
                        <button
                            onClick={() => setStep(step - 1)}
                            className="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors text-sm"
                        >
                            Back
                        </button>
                    ) : (
                        <div></div>
                    )}

                    {step === 3 && (
                        <button
                            onClick={handleSubmit}
                            disabled={!isConfirmed || isSubmitting}
                            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm shadow-blue-200 transform transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                            {!isSubmitting && <Send size={16} />}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
