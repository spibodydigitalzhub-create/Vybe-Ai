import './globals.css';

export const metadata = {
  title: 'Vybe AI',
  description: 'Unrestricted AI Assistant',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Vybe AI',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#6366f1" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>{children}</body>
    </html>
  );
}
