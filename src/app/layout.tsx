import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Shell from "@/components/Shell";
import ThemeProvider from "@/components/ThemeProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tend",
  description: "Your personal command center",
  manifest: "/manifest.json",
  applicationName: "Tend",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Tend",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-icon-152.png", sizes: "152x152" },
      { url: "/icons/apple-icon-167.png", sizes: "167x167" },
      { url: "/icons/apple-icon-180.png", sizes: "180x180" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0d0b09",
};

const themeBootScript = `(function(){try{var s=localStorage.getItem('tend.settings');var id='noir-maison';if(s){var p=JSON.parse(s);if(p&&p.themeId)id=p.themeId;}var valid=['noir-maison','atelier','bibliotheque','coutts','hinoki','amangiri','cartier-rouge','monocle','glazed','mocha','sofia','peony','camellia','marigold'];if(valid.indexOf(id)===-1)id='noir-maison';document.documentElement.setAttribute('data-theme',id);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="noir-maison"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-bg font-sans text-foreground">
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <ThemeProvider>
          <Shell>{children}</Shell>
        </ThemeProvider>
      </body>
    </html>
  );
}
