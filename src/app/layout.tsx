import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InkFlow - Premium Reader",
  description: "Your Manhwa Aggregation Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="referrer" content="no-referrer" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`bg-background-dark text-white font-body antialiased h-screen w-full overflow-auto`}
      >
        {children}
      </body>
    </html>
  );
}
