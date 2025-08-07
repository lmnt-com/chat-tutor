import type { Metadata } from "next";
import "./globals.css";
import {
  crimsonText,
  comicNeue,
  cinzel,
  lora,
  medievalSharp,
  architectsDaughter,
  lato,
} from "./fonts";

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
        className={`${crimsonText.variable} ${comicNeue.variable} ${cinzel.variable} ${lora.variable} ${medievalSharp.variable} ${architectsDaughter.variable} ${lato.variable} antialiased`}
        style={{ fontFamily: "var(--font-crimson-text)" }}
      >
        {children}
      </body>
    </html>
  );
}
