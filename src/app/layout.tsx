import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TeachingContextProvider } from "@/context/TeachingContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CBC Teacher Workspace",
  description: "KICD-aligned workspace for CBC Teachers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TeachingContextProvider>
          {children}
        </TeachingContextProvider>
      </body>
    </html>
  );
}
