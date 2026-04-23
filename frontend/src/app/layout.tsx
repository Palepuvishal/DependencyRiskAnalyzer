import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Topbar } from "@/components/layout/Topbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { ProjectProvider } from "@/lib/ProjectContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });

export const metadata: Metadata = {
  title: "SecOps Sentinel",
  description: "Dependency Risk Analyzer",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${spaceGrotesk.variable} antialiased bg-[#0c0e12] text-[#e2e2e8] min-h-screen`}>
        <ProjectProvider>
          <Topbar />
          <div className="flex">
            <Sidebar />
            <main className="flex-1 lg:ml-[280px] min-h-[calc(100vh-3.5rem)]">
              {children}
            </main>
          </div>
        </ProjectProvider>
      </body>
    </html>
  );
}
