import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import AuthInitializer from "@/components/AuthInitializer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Minimalist Writer App",
  description: "Focus on your writing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-100 text-gray-900 dark:bg-slate-950`}>
        <AuthInitializer />
        {children}
        <Toaster 
          position="bottom-right" 
          toastOptions={{
            className: 'text-sm',
            duration: 5000,
            style: {
              background: '#ffffff',
              color: '#333333',
              border: '1px solid #e5e7eb',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10B981',
                secondary: '#FFFFFF',
              },
              style: {
                background: '#F0FDF4',
                color: '#14532D',
                border: '1px solid #10B981',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#EF4444',
                secondary: '#FFFFFF',
              },
              style: {
                background: '#FEF2F2',
                color: '#7F1D1D',
                border: '1px solid #EF4444',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
