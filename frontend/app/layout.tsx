import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { FirebaseAnalytics } from "@/components/firebase-analytics";
import { Providers } from "@/components/providers";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Momentra",
  description: "Momentra frontend",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-context="business" className={`${plusJakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <FirebaseAnalytics />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
