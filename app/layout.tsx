import type { Metadata, Viewport } from "next";
import { ServiceWorker } from "../components/layout/ServiceWorker";
import { SiteNav } from "../components/layout/SiteNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shepherd's Desk",
  description: "A focused workspace for Bible study and sermon preparation.",
  applicationName: "Shepherd's Desk",
  appleWebApp: { capable: true, title: "Shepherd's Desk", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#25231f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ServiceWorker />
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
