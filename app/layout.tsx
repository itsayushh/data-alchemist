import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DataProvider } from "@/contexts/DataContext";
import "./globals.css";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import Navbar from "@/components/navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Data Alchemist",
  description: "Transform your messy spreadsheets into clean, validated data",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <DataProvider>
        <SidebarProvider>
          {/* Sidebar Component */}
          <div className="flex">
            <AppSidebar />
            <div className="flex-1 max-w-full w-full">
              {/* Navbar Component */}
              <Navbar/>
              {/* Main Content Area */}
              <main className="w-[100%]">
                  {children}
              </main>
            </div>
          </div>
        </SidebarProvider>
        </DataProvider>
      </body>
    </html>
  );
}
