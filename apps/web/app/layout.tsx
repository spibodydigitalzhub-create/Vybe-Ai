import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vybe AI',
  description: 'Unrestricted AI Assistant',
  manifest: '/manifest.json',
  icons: {
    icon: 'https://i.imgur.com/7RKmZ8q.jpeg',
    apple: 'https://i.imgur.com/7RKmZ8q.jpeg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Vybe AI',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#0a0a0f" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="bg-[#0a0a0f]">{children}</body>
    </html>
  );
}
