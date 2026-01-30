// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'मतदार यादीत नाव शोधा - ',
  description: 'इंदोरी वराळे जिल्हा परिषद पंचायत गट मतदारसंघातील मतदार यादीत आपले नाव तपासा',

  icons: {
    icon: '/banner.jpeg',
    apple: '/banner.jpeg',
  },

  openGraph: {
    title: 'मतदार यादीत नाव शोधा - ',
    description: 'इंदोरी वराळे जिल्हा परिषद पंचायत गट मतदारसंघातील मतदार यादीत आपले नाव तपासा',
    url: 'https://meghaprashantbhagwat.com/',
    siteName: 'मतदार यादीत नाव शोधा - इंदोरी वराळे जिल्हा परिषद पंचायत गट',
    images: [
      {
        url: 'https://meghaprashantbhagwat.com/banner.jpeg',
        width: 1200,
        height: 800, // Changed from 630 to 800 for taller image
        alt: 'मतदार यादीत नाव शोधा - इंदोरी वराळे जिल्हा परिषद पंचायत गट',
      },
    ],
    locale: 'mr_IN',
    type: 'website',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'मतदार यादीत नाव शोधा - ',
    description: 'इंदोरी वराळे जिल्हा परिषद पंचायत गट मतदारसंघातील मतदार यादीत आपले नाव तपासा',
    images: [
      {
        url: 'https://meghaprashantbhagwat.com/banner.jpeg',
        width: 1200,
        height: 800, // Changed from 630 to 800 for taller image
        alt: 'मतदार यादीत नाव शोधा - इंदोरी वराळे जिल्हा परिषद पंचायत गट',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="mr">
      <head>
        {/* WhatsApp specific meta tags for better sharing */}
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="800" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:alt" content="मतदार यादीत नाव शोधा - इंदोरी वराळे जिल्हा परिषद पंचायत गट" />
        
        {/* Optional: Additional meta for better WhatsApp display */}
        <meta property="og:site_name" content="मतदार यादीत नाव शोधा" />
        <meta property="og:locale" content="mr_IN" />
        <meta property="og:type" content="website" />
      </head>
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}