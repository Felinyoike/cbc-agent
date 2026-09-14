import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TeachingContextProvider } from "@/context/TeachingContext";
import { WorkspaceProvider } from "@/context/WorkspaceContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "CBC Teacher Workspace",
  description:
    "A KICD-grounded planning workspace for Kenyan CBC teachers — curriculum evidence, term plans, daily lessons and post-lesson reflection.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <TeachingContextProvider>
          <WorkspaceProvider>{children}</WorkspaceProvider>
        </TeachingContextProvider>
      </body>
    </html>
  );
}
