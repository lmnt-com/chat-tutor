import {
  Comic_Neue,
  Cinzel,
  Lora,
  Crimson_Text,
  MedievalSharp,
  Architects_Daughter,
  Lato,
} from "next/font/google";

export const crimsonText = Crimson_Text({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-crimson-text",
});

export const comicNeue = Comic_Neue({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-comic-neue",
});

export const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-cinzel",
});

export const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-lora",
});

export const medievalSharp = MedievalSharp({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-medieval-sharp",
});

export const architectsDaughter = Architects_Daughter({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-architects-daughter",
});

export const lato = Lato({
  subsets: ["latin"],
  weight: ["100", "300", "400", "700", "900"],
  display: "swap",
  variable: "--font-lato",
});
