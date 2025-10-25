import { ReactNode } from "react";
import Navbar from "@/components/Navbar";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";
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
      </body>
    </html>
  );
}