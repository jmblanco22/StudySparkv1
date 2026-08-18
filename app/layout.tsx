import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavBottom from "@/app/components/NavBottom";
import ChatWidget from "@/app/components/ChatWidget";
import { PageContentProvider } from "@/app/context/PageContentContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StudySpark",
  icons: {
    icon: "/favicons.ico",
    shortcut: "/favicons.ico",
    apple: "/studysparklogoapp.png",
  },
  description: "Your Study Buddy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PageContentProvider>
          {children}
          <NavBottom />
          <ChatWidget />
        </PageContentProvider>
      </body>
    </html>
  );
}