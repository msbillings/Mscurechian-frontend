'use client';
import React, { useState } from 'react';
import { Heart, Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram, Youtube, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const Footer = () => {
    const currentYear = new Date().getFullYear();
    const [formData, setFormData] = useState({
        name: '', email: '', mobile: '', address: '', reason: ''
    });
    
    // Validation State
    const [errors, setErrors] = useState({
        name: '', email: '', mobile: '', address: '', reason: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        // Clear error when user starts typing
        if (errors[e.target.name as keyof typeof errors]) {
            setErrors({ ...errors, [e.target.name]: '' });
        }
    };

    const handleWhatsAppSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Custom validatons
        let isValid = true;
        const newErrors = { name: '', email: '', mobile: '', address: '', reason: '' };

        if (formData.name.trim().length < 3) {
            newErrors.name = "Full name must be at least 3 characters.";
            isValid = false;
        }
        
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(formData.email)) {
            newErrors.email = "Please enter a valid email format.";
            isValid = false;
        }

        const phonePattern = /^\+?[0-9]{10,14}$/;
        if (!phonePattern.test(formData.mobile)) {
            newErrors.mobile = "Please enter a valid 10+ digit mobile number.";
            isValid = false;
        }

        if (formData.address.trim().length < 4) {
            newErrors.address = "Please provide your city/location.";
            isValid = false;
        }

        if (formData.reason.trim().length < 10) {
            newErrors.reason = "Please provide a brief requirement (min 10 chars).";
            isValid = false;
        }

        setErrors(newErrors);

        if (!isValid) return;

        const { name, email, mobile, address, reason } = formData;
        
        // Formatted cleanly without stars and easily readable
        const message = `New Inquiry Submitted 🚀\n\nName: ${name}\nEmail: ${email}\nMobile: ${mobile}\nLocation: ${address}\n\nReason for Contact:\n${reason}`;
        
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/919032223352?text=${encodedMessage}`, '_blank');
        
        // Clear form after success
        setFormData({ name: '', email: '', mobile: '', address: '', reason: '' });
    };

    return (
        <footer className="bg-[#050B14] text-slate-300 font-sans mt-32 relative overflow-hidden">
            {/* Background Image Overlay - Increased visibility */ }
            <div 
                className="absolute inset-0 bg-cover bg-center opacity-[0.18] pointer-events-none"
                style={{ backgroundImage: "url('/assets/lan.png')" }}
            />
            {/* Soft top border glow */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary-theme to-transparent opacity-50" />

            {/* Top Section: Hero / Form area */}
            <div className="max-w-7xl mx-auto px-6 pt-20 pb-16 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
                    
                    {/* Left: Typography (Takes 7 columns to squeeze the form) */}
                    <div className="lg:col-span-7 space-y-8 pr-0 lg:pr-10">
                        <div className="space-y-6">
                            <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.15]">
                                Ready to scale <br className="hidden md:block"/>
                                your digital <br className="hidden md:block"/>
                                <span className="text-primary-theme italic font-medium">healthcare?</span>
                            </h2>
                            <p className="text-[17px] text-slate-400 leading-relaxed max-w-lg">
                                Drop your details below and we'll get back to you securely via WhatsApp. Let's discuss your next big leap.
                            </p>
                        </div>
                        
                        <div className="pt-4 flex flex-col gap-8">
                            <div className="flex items-center gap-5 group cursor-pointer w-fit">
                                <div className="w-12 h-12 rounded-full border border-slate-700/50 flex flex-shrink-0 items-center justify-center text-primary-theme group-hover:bg-primary-theme group-hover:text-white transition-all duration-300">
                                    <Phone size={20} />
                                </div>
                                <div className="pt-1">
                                    <p className="text-[12px] uppercase tracking-widest text-slate-500 font-bold mb-1">Direct Line</p>
                                    <p className="text-lg text-white font-medium group-hover:text-primary-theme transition-colors">+91 9032223352</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-5 group cursor-pointer w-fit">
                                <div className="w-12 h-12 rounded-full border border-red-900/40 bg-red-500/10 flex flex-shrink-0 items-center justify-center text-red-500 group-hover:bg-red-600 group-hover:text-white transition-all duration-300 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                                    <Heart size={20} className="animate-pulse" />
                                </div>
                                <div className="pt-1">
                                    <p className="text-[12px] uppercase tracking-widest text-red-500/80 font-bold mb-1">24/7 Emergency</p>
                                    <p className="text-lg text-white font-medium group-hover:text-red-400 transition-colors">Call 108</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Sleek Form (Takes 5 columns, making width narrower) */}
                    <div className="lg:col-span-5 w-full max-w-md mx-auto lg:max-w-none bg-slate-900/40 backdrop-blur-md p-8 rounded-3xl border border-slate-800 shadow-2xl">
                        <form onSubmit={handleWhatsAppSubmit} className="space-y-6">
                            
                            <div className="relative group">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Your Name</label>
                                <input name="name" value={formData.name} onChange={handleChange} className={`w-full bg-transparent border-b ${errors.name ? 'border-red-500' : 'border-slate-700 focus:border-primary-theme'} text-white pb-2 pt-1 outline-none transition-colors placeholder:text-slate-600 text-[15px]`} placeholder="e.g. John Doe" />
                                {errors.name ? (
                                    <p className="text-red-500 text-[11px] mt-1.5">{errors.name}</p>
                                ) : (
                                    <p className="text-slate-500 text-[11px] mt-1.5">Enter your full legal name</p>
                                )}
                            </div>

                            <div className="relative group">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Email Address</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} className={`w-full bg-transparent border-b ${errors.email ? 'border-red-500' : 'border-slate-700 focus:border-primary-theme'} text-white pb-2 pt-1 outline-none transition-colors placeholder:text-slate-600 text-[15px]`} placeholder="e.g. hello@example.com" />
                                {errors.email ? (
                                    <p className="text-red-500 text-[11px] mt-1.5">{errors.email}</p>
                                ) : (
                                    <p className="text-slate-500 text-[11px] mt-1.5">We'll use this for formal communication</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="relative group">
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Mobile Number</label>
                                    <input type="tel" name="mobile" value={formData.mobile} onChange={handleChange} className={`w-full bg-transparent border-b ${errors.mobile ? 'border-red-500' : 'border-slate-700 focus:border-primary-theme'} text-white pb-2 pt-1 outline-none transition-colors placeholder:text-slate-600 text-[15px]`} placeholder="+91 90000 00000" />
                                    {errors.mobile && <p className="text-red-500 text-[11px] mt-1.5 leading-tight">{errors.mobile}</p>}
                                </div>
                                <div className="relative group">
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Location</label>
                                    <input name="address" value={formData.address} onChange={handleChange} className={`w-full bg-transparent border-b ${errors.address ? 'border-red-500' : 'border-slate-700 focus:border-primary-theme'} text-white pb-2 pt-1 outline-none transition-colors placeholder:text-slate-600 text-[15px]`} placeholder="City, Country" />
                                    {errors.address && <p className="text-red-500 text-[11px] mt-1.5 leading-tight">{errors.address}</p>}
                                </div>
                            </div>

                            <div className="relative group pt-2">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">How can we help?</label>
                                <textarea name="reason" value={formData.reason} onChange={handleChange} rows={2} className={`w-full bg-transparent border-b ${errors.reason ? 'border-red-500' : 'border-slate-700 focus:border-primary-theme'} text-white pb-2 pt-1 outline-none transition-colors placeholder:text-slate-600 resize-none text-[15px]`} placeholder="Tell us about your requirements..." />
                                {errors.reason ? (
                                    <p className="text-red-500 text-[11px] mt-1.5">{errors.reason}</p>
                                ) : (
                                    <p className="text-slate-500 text-[11px] mt-1.5">Briefly describe your project or needs.</p>
                                )}
                            </div>

                            <div className="pt-6">
                                <button type="submit" className="w-full bg-primary-theme hover:bg-primary-theme/90 text-white font-bold text-[14px] px-8 py-4 rounded-xl transition-all duration-200 hover:-translate-y-1 active:scale-[0.97] active:translate-y-0 active:shadow-none flex items-center justify-center gap-3 shadow-[0_10px_20px_rgba(37,99,235,0.2)]">
                                    Start the Conversation
                                    <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Divider */}
            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="w-full h-px bg-slate-800" />
            </div>

            {/* Main Links */}
            <div className="max-w-7xl mx-auto px-6 py-16 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12">
                    {/* Brand */}
                    <div className="lg:col-span-4 space-y-6 pr-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center shrink-0">
                                <img className="w-16 h-16 sm:w-20 sm:h-20 object-contain" src="/assets/logo.png" alt="MSCureChain Logo" />
                            </div>
                            <span className="text-3xl sm:text-4xl font-bold tracking-tight text-white">MSCureChain</span>
                        </div>
                        <p className="text-slate-400 text-[16px] leading-relaxed">
                            Pioneering the future of healthcare management through seamless integration and digital innovation.
                        </p>
                        <div className="flex items-center gap-4 pt-2">
                            {[
                                { icon: Facebook, href: "https://www.facebook.com/profile.php?id=61585136090341" },
                                { icon: Twitter, href: "http://x.com/Mscurechain" },
                                { icon: Instagram, href: "https://www.instagram.com/mscurechain?igsh=MXVtdXJkdmwwbGMxcQ==" },
                                { icon: Youtube, href: "https://www.youtube.com/@MscureChain" },
                                { icon: Linkedin, href: "#" },
                            ].map((social, idx) => (
                                <a key={idx} href={social.href} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-primary-theme hover:bg-primary-theme transition-all duration-300">
                                    <social.icon size={16} />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Company */}
                    <div className="lg:col-span-2 space-y-6">
                        <h4 className="text-white font-semibold text-[17px]">Company</h4>
                        <ul className="space-y-4">
                            {[{ name: "About Us", href: "/about" }, { name: "Solutions", href: "/solutions" }, { name: "Careers", href: "#" }, { name: "Our Blog", href: "#" }].map((link, idx) => (
                                <li key={idx}><Link href={link.href} className="text-slate-400 hover:text-primary-theme text-[16px] transition-colors">{link.name}</Link></li>
                            ))}
                        </ul>
                    </div>

                    {/* Services */}
                    <div className="lg:col-span-3 space-y-6">
                        <h4 className="text-white font-semibold text-[17px]">Our Portals</h4>
                        <ul className="space-y-4">
                            {[{ name: "Helpdesk & Reception", href: "/about/helpdesk-reception" }, { name: "Doctor Terminal", href: "/about/doctor-terminal" }, { name: "Lab & Pharma Integrations", href: "/about/lab-diagnostics" }, { name: "IPD Bed Management", href: "/about/nurse-portal" }, { name: "Hospital Administration", href: "/about/hospital-admin" }].map((link, idx) => (
                                <li key={idx}><Link href={link.href} className="text-slate-400 hover:text-primary-theme text-[16px] transition-colors">{link.name}</Link></li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact details */}
                    <div className="lg:col-span-3 space-y-6">
                        <h4 className="text-white font-semibold text-[17px]">Headquarters</h4>
                        <div className="flex flex-col gap-3 text-slate-400 text-[16px]">
                            <p className="leading-relaxed">near Gurukul Vidyapeeth, CMR Palli, Kadapa, <br/>Chinna Chauku, Andhra Pradesh 516001</p>
                            <a href="mailto:info@mscurechain.com" className="hover:text-primary-theme transition-colors flex items-center gap-3 mt-2">
                                <Mail size={18} className="text-primary-theme" /> info@mscurechain.com
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-slate-900 relative z-10">
                <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-slate-500 text-[14px]">© {currentYear} MSCureChain. All rights reserved.</p>
                    <div className="flex gap-8 text-[14px] text-slate-500">
                        <Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
                        <Link href="/terms" className="hover:text-slate-300 transition-colors">Terms of Service</Link>
                        <Link href="/cookies" className="hover:text-slate-300 transition-colors">Cookie Policy</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;