import type { Metadata } from "next";
import { Google_Sans_Flex, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const googleSansFlex = Google_Sans_Flex({
  variable: "--font-google-sans-flex",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Storefront",
  description: "Reviews & releases across Google Play and App Store",
  metadataBase: new URL("https://storefront-taupe-theta.vercel.app"),
  openGraph: {
    title: "Storefront",
    description: "Reviews & releases across Google Play and App Store",
    images: [{ url: "/og.png", width: 1400, height: 900 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Storefront",
    description: "Reviews & releases across Google Play and App Store",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${googleSansFlex.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
