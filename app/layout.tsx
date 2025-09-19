import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Raul Adell - Barcelona Startup Stories",
  description: "From neural circuits to production code. Documenting Barcelona's startup ecosystem, one coffee at a time.",
  openGraph: {
    title: "Raul Adell - Barcelona Startup Stories",
    description: "From neural circuits to production code. Documenting Barcelona's startup ecosystem, one coffee at a time.",
    url: "https://rauladell.com",
    siteName: "Raul Adell",
    images: [
      {
        url: "/social-preview.png",
        width: 1200,
        height: 630,
        alt: "Raul Adell - Barcelona Startup Stories",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Raul Adell - Barcelona Startup Stories",
    description: "From neural circuits to production code. Documenting Barcelona's startup ecosystem, one coffee at a time.",
    images: ["/social-preview.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
