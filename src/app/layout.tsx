import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InkFlow - Premium Reader",
  description: "Your Manhwa Aggregation Platform",
};

import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

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
        className={`bg-background-dark text-white font-body antialiased h-screen w-full overflow-hidden flex`}
      >
        <Sidebar />
        <main className="flex-1 flex flex-col h-full relative ml-0 lg:ml-0 pl-20">
          <Navbar />
          <div className="flex-1 overflow-y-auto overflow-x-hidden pb-10 scroll-smooth">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
