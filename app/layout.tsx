// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'मतदार यादीत नाव शोधा - तळेगाव नगरपरिषद',
  description: 'तळेगाव नगरपरिषद मतदारसंघातील मतदार यादीत आपले नाव तपासा',

  icons: {
    icon: '/banner.jpeg',
    apple: '/banner.jpeg',
  },

  openGraph: {
    title: 'मतदार शोध प्रणाली - इंदुरी',
    description: 'इंदुरी ग्रामपंचायत मतदार शोध प्रणाली',
    url: 'https://voter-search-steel.vercel.app/',
    siteName: 'मतदार शोध प्रणाली - इंदुरी',
    images: [
      {
        url: 'https://voter-search-steel.vercel.app/banner.jpeg',
        width: 1200,
        height: 630,
        alt: 'मतदार शोध प्रणाली - इंदुरी',
      },
    ],
    locale: 'mr_IN',
    type: 'website',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'मतदार शोध प्रणाली - इंदुरी',
    description: 'इंदुरी ग्रामपंचायत मतदार शोध प्रणाली',
    images: ['https://voter-search-steel.vercel.app/banner.jpeg'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="mr">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
