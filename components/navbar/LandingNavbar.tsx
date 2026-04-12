'use client';

import React, { useState, useEffect } from "react";
import {
    Menu,
    X,
    ArrowLeft
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface LandingNavbarProps {
    variant?: 'home' | 'about' | 'detail' | 'pricing';
    title?: string;
    onProtectedClick?: (path: string) => void;
}

function LandingNavbar({ variant = 'home', title, onProtectedClick }: LandingNavbarProps) {
    const router = useRouter();
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [hasAgreed, setHasAgreed] = useState(false);

    useEffect(() => {
        const agreed = localStorage.getItem('mscurechain_terms_accepted');
        if (agreed === 'true') {
            setHasAgreed(true);
        }
    }, []);

    useEffect(() => {
        // Force Light Mode on all pages using this navbar
        document.documentElement.classList.remove('dark');
        localStorage.setItem("theme", "light");
        document.documentElement.style.colorScheme = 'light';

        // Inject high-specificity styles to override extensions like Dark Reader
        const styleId = 'force-light-mode-style';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                html, body {
                    background-color: #ffffff !important;
                    color: #0f172a !important;
                    color-scheme: light !important;
                }
                /* Attempt to override Dark Reader's dynamic variables */
                [data-darkreader-scheme="dark"] {
                    --darkreader-bg--background: #ffffff !important;
                    --darkreader-text--foreground: #0f172a !important;
                }
            `;
            document.head.appendChild(style);
        }

        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    const handleProtectedClick = (path: string) => {
        if (onProtectedClick) {
            onProtectedClick(path);
            return;
        }

        if (hasAgreed) {
            router.push(path);
        } else {
            const element = document.getElementById('terms-section');
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            } else {
                router.push('/#terms-section');
            }
        }
    };

    const navLinks = [
        { name: 'Features', href: '/features' },
        { name: 'Portals', href: '/portals' },
        { name: 'Blogs', href: '/blogs' },
        { name: 'Solutions', href: '/solutions' },
        { name: 'Pricing', href: '/pricing' },
        { name: 'About', href: '/about' }
    ];

    const isSticky = scrolled || mobileMenuOpen || variant === 'detail' || variant === 'pricing';

    return (
        <nav className={`fixed top-0 w-full z-50 ${isSticky
            ? 'bg-white/95 backdrop-blur-md  shadow-sm py-3'
            : 'bg-transparent py-5'
            }`}>
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                {/* Logo Section */}
                <div
                    className="flex items-center gap-2 lg:gap-3 group cursor-pointer"
                    onClick={() => router.push('/')}
                >
                    <div className="flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                        <img src="/assets/logo.png" alt="Logo" className="w-12 h-12 sm:w-14 sm:h-14 object-contain" />
                    </div>
                    <span className="text-2xl font-bold bg-linear-to-r from-primary-theme to-blue-400 bg-clip-text text-transparent tracking-tight">
                        MSCureChain
                    </span>
                </div>

                {/* Desktop Menu */}
                <div className="hidden lg:flex items-center gap-8">
                    {navLinks.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`text-[18px] font-medium relative group ${variant === 'about' && item.name === 'About'
                                ? 'text-primary-theme'
                                : 'text-muted hover:text-primary-theme'
                                }`}
                        >
                            {item.name}
                            <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-primary-theme origin-left scale-x-0 group-hover:scale-x-100" />
                        </Link>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 sm:gap-3">


                    <button
                        type="button"
                        suppressHydrationWarning
                        onClick={() => handleProtectedClick('/auth/login')}
                        className="hidden sm:block bg-primary-theme hover:bg-primary-theme/90 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-primary-theme/20 hover:-translate-y-0.5"
                    >
                        {variant === 'detail' ? 'Sign In' : 'Get Started'}
                    </button>

                    {/* Mobile Menu Toggle */}
                    <button
                        type="button"
                        suppressHydrationWarning
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="lg:hidden p-2.5 rounded-xl hover:bg-muted/10 text-muted"
                    >
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            <div className={`lg:hidden fixed inset-x-0 top-[72px] bg-background border-b border-border overflow-hidden ${mobileMenuOpen ? 'max-h-screen py-8 opacity-100' : 'max-h-0 py-0 opacity-0'
                }`}>
                <div className="flex flex-col items-center gap-6 px-6">
                    {navLinks.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className="text-lg font-semibold text-foreground hover:text-primary-theme w-full text-center"
                        >
                            {item.name}
                        </Link>
                    ))}
                    <button
                        type="button"
                        suppressHydrationWarning
                        onClick={() => {
                            setMobileMenuOpen(false);
                            handleProtectedClick('/auth/login');
                        }}
                        className="w-full bg-primary-theme text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary-theme/20"
                    >
                        Get Started
                    </button>
                </div>
            </div>
        </nav>
    );
}

export default React.memo(LandingNavbar);
