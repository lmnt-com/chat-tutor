import type { Metadata } from "next";
import "./globals.css";
import { lato, comicNeue, cinzel, lora } from "./fonts";

export const metadata: Metadata = {
  title: "LMNT Tutor Demo",
  description: "Learn history with a tutor",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${lato.variable} ${comicNeue.variable} ${cinzel.variable} ${lora.variable} antialiased`}
        style={{ fontFamily: "var(--font-lato)" }}
      >
        {children}
      </body>
    </html>
  );
}
