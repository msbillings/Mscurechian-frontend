'use client';

import React from 'react';
import { Headset } from 'lucide-react';

interface SupportFloatingButtonProps {
    onClick: () => void;
    label?: string;
}

const SupportFloatingButton: React.FC<SupportFloatingButtonProps> = ({ onClick, label = "HELP & SUPPORT" }) => {
    return (
        <div className="fixed bottom-8 right-8 z-[60] flex items-center justify-center group">
            {/* Rotating Text Outside the Button */}
            <div className="absolute w-24 h-24 sm:w-28 sm:h-28 animate-[spin_10s_linear_infinite] pointer-events-none">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                    <defs>
                        <path
                            id="supportCirclePath"
                            d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
                        />
                    </defs>
                    <text className="text-[8.5px] font-black uppercase tracking-[0.2em] fill-black">
                        <textPath xlinkHref="#supportCirclePath">
                            {label} • {label} •
                        </textPath>
                    </text>
                </svg>
            </div>

            <button
                onClick={onClick}
                className="relative w-14 h-14 sm:w-16 sm:h-16 bg-primary-theme rounded-full flex items-center justify-center text-white transform hover:scale-110 active:scale-95 transition-all duration-300 shadow-2xl shadow-primary-theme/40 z-10"
                aria-label="Support and Feedback"
            >
                {/* Background Animation Effect */}
                <div className="absolute inset-0 bg-white/10 translate-y-full hover:translate-y-0 transition-transform duration-500 rounded-full overflow-hidden" />

                {/* Pulse Effect */}
                <div className="absolute inset-0 animate-pulse bg-primary-theme/20 rounded-full pointer-events-none" />

                <div className="relative flex flex-col items-center">
                    <Headset className="w-7 h-7 sm:w-8 sm:h-8 text-white group-hover:rotate-12 transition-transform duration-300" />
                </div>
            </button>
        </div>
    );
};

export default SupportFloatingButton;
