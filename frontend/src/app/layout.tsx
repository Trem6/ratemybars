import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/lib/toast-context";
import Navbar from "@/components/Navbar";
import ConditionalFooter from "@/components/ConditionalFooter";
import ToastContainer from "@/components/Toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "RateMyBars - Rate College Party Venues",
  description:
    "Discover and rate the best bars, nightclubs, frat parties, and party venues near every college in the US.",
  keywords: ["college", "party", "bars", "nightclub", "frat", "rating", "review"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans bg-zinc-950 text-white antialiased`}>
        <AuthProvider>
          <ToastProvider>
            <Navbar />
            <main className="pt-14">{children}</main>
            <ConditionalFooter />
            <ToastContainer />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
