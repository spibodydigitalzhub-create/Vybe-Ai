import "./globals.css";

export const metadata = {
  title: "VYBE AI",
  description: "Your AI assistant. Your ideas. Your space."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
