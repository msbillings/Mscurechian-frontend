import React from 'react';
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Optimized Inter font with display swap and preload
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
  fallback: ['system-ui', 'arial'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://mscurechain.com'),
  title: {
    default: "MSCureChain - Modern Hospital Management System",
    template: "%s | MSCureChain"
  },
  description: "Comprehensive digital healthcare platform providing seamless patient care, appointment booking, electronic health records, and integrated hospital management. Transform your healthcare experience with MSCureChain.",
  keywords: [
    "hospital management system",
    "healthcare software",
    "patient portal",
    "doctor terminal",
    "electronic health records",
    "EHR system",
    "hospital administration",
    "medical records",
    "appointment booking",
    "digital prescriptions",
    "lab management",
    "pharmacy POS",
    "hospital software",
    "healthcare technology",
    "MSCureChain",
    "clinical management system"
  ],
  authors: [{ name: "MS Tech Hive", url: "https://mstechhive.com" }],
  creator: "MS Tech Hive",
  publisher: "MS Tech Hive",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/assets/logo.png', sizes: 'any' },
      { url: '/assets/logo.png', type: 'image/png' },
    ],
    apple: [
      { url: '/assets/logo.png' },
    ],
    shortcut: ['/assets/logo.png'],
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://mscurechain.com',
    siteName: 'MSCureChain',
    title: 'MSCureChain - Modern Hospital Management System',
    description: 'Comprehensive digital healthcare platform providing seamless patient care, appointment booking, electronic health records, and integrated hospital management.',
    images: [
      {
        url: '/assets/logo.png',
        width: 1200,
        height: 630,
        alt: 'MSCureChain Hospital Management System',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MSCureChain - Modern Hospital Management System',
    description: 'Comprehensive digital healthcare platform providing seamless patient care, appointment booking, and integrated hospital management.',
    creator: '@MSTECHHIVE',
    site: '@MSTECHHIVE',
    images: ['/assets/logo.png'],
  },
  verification: {
    google: 'google-site-verification-code',
  },
  category: 'Healthcare',
  alternates: {
    canonical: 'https://mscurechain.com',
  },
};

import { Toaster } from 'react-hot-toast';
import FloatingChat from '@/components/chat/FloatingChat';
import Providers from './providers';

function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preload logo to prevent duplicate requests */}
        <link rel="preload" href="/assets/logo.png" as="image" type="image/png" />

        <script
          dangerouslySetInnerHTML={{
            __html: `
               (function() {
                 try {
                   var path = window.location.pathname;
                   var isLanding = path === '/' || 
                                   path.startsWith('/about') || 
                                   path.startsWith('/features') || 
                                   path.startsWith('/pricing') || 
                                   path.startsWith('/solutions') || 
                                   path.startsWith('/portals');
                                   
                   if (isLanding) {
                     document.documentElement.classList.remove('dark');
                     document.documentElement.style.colorScheme = 'light';
                     document.documentElement.setAttribute('data-theme', 'light');
                     document.documentElement.setAttribute('data-force-light', 'true');
                     // Dark Reader Lock
                     var meta = document.createElement('meta');
                     meta.name = 'darkreader-lock';
                     meta.content = 'yes';
                     document.head.appendChild(meta);
                     return;
                   }

                   var storage = localStorage.getItem('theme-storage');
                   var theme = 'light';
                   if (storage) {
                     var parsed = JSON.parse(storage);
                     if (parsed && parsed.state && parsed.state.theme) {
                       theme = parsed.state.theme;
                     }
                   }
                   document.documentElement.setAttribute('data-theme', theme);
                   if (theme === 'dark') {
                     document.documentElement.classList.add('dark');
                   } else {
                     document.documentElement.classList.remove('dark');
                   }
                 } catch (e) {}
               })();
             `,
          }}
        />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          <Toaster position="top-center" />
          {children}
          <FloatingChat />
        </Providers>
      </body>
    </html>
  );
}

export default React.memo(RootLayout);
