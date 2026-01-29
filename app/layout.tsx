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
    title: 'मतदार यादीत नाव शोधा - तळेगाव नगरपरिषद',
    description: 'तळेगाव नगरपरिषद मतदारसंघातील मतदार यादीत आपले नाव तपासा',
    url: 'https://meghaprashantbhagwat.com/',
    siteName: 'मतदार यादीत नाव शोधा - तळेगाव नगरपरिषद',
    images: [
      {
        url: 'https://meghaprashantbhagwat.com/banner.jpeg',
        width: 1200,
        height: 630,
        alt: 'मतदार यादीत नाव शोधा - तळेगाव नगरपरिषद',
      },
    ],
    locale: 'mr_IN',
    type: 'website',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'मतदार यादीत नाव शोधा - तळेगाव नगरपरिषद',
    description: 'तळेगाव नगरपरिषद मतदारसंघातील मतदार यादीत आपले नाव तपासा',
    images: ['https://meghaprashantbhagwat.com/banner.jpeg'],
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
