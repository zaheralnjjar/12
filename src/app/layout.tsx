import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";

const cairo = Cairo({
  subsets: ["arabic"],
  variable: "--font-cairo",
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "منصّتي الذكية - My Smart Platform",
  description: "منصة ويب احترافية لتحسين الإنتاجية وإدارة الحياة",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body
        className={`${cairo.variable} font-sans antialiased bg-slate-50 text-slate-900`}
      >
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 md:mr-64 p-4 md:p-8 pt-16 md:pt-8 transition-all duration-300">
             <div className="max-w-7xl mx-auto">
              {children}
             </div>
          </main>
        </div>
      </body>
    </html>
  );
}
