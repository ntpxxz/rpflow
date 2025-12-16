import { ReactNode } from "react";
import Navbar from "@/components/Navbar";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";
import { GoogleAnalytics } from '@next/third-parties/google'

export const metadata = {
  title: "Purchase Flow",
  description: "Next.js 15 + TypeScript SaaS",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <SessionProviderWrapper>
        {children}
        </SessionProviderWrapper>
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID || ""} />
      </body>
    </html>
  );
}