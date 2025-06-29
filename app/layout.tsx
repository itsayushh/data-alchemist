import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono, Inter, Schibsted_Grotesk } from "next/font/google";
import { DataProvider } from "@/contexts/DataContext";
import "./globals.css";
import { SidebarProvider} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Navbar from "@/components/navbar";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

const schibstedGrotesk = Schibsted_Grotesk({
  variable: "--font-schibsted-grotesk",
  subsets: ["latin"],
})

const bricolageGrotesk = Bricolage_Grotesque({
  variable: "--font-bricolage-grotesk",
  subsets: ["latin"],
})

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
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${schibstedGrotesk.variable} ${bricolageGrotesk.variable} font-schibsted-grotesk antialiased`}>
        <ThemeProvider
            attribute="class"
            defaultTheme="light"
            disableTransitionOnChange
          >
        <DataProvider>
          <SidebarProvider>
            <div className="flex min-h-screen w-full">
              <AppSidebar />
              <div className="flex-1 flex flex-col">
                <Navbar />
                <main className="flex-1 w-full">
                  {children}
                </main>
                <Analytics />
              </div>
            </div>
          </SidebarProvider>
        </DataProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}