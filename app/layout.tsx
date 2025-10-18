import { ReactNode } from "react";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata = {
  title: "Purchase Flow",
  description: "Next.js 15 + TypeScript SaaS",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-100">
        <Navbar />
        <div className="flex">
          <main className="flex-1 p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
