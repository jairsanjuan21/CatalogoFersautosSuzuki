import type { Metadata } from "next";
import { Barlow_Semi_Condensed, Source_Sans_3 } from "next/font/google";
import "./globals.css";

// Las mismas fuentes que aprobó Natalia en los prototipos
const display = Barlow_Semi_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});
const sans = Source_Sans_3({
  variable: "--font-sans-base",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Estrena tu Suzuki con Natalia García | Fersautos Cúcuta",
  description: "Catálogo Suzuki y solicitud de crédito en línea con Natalia García, Fersautos sede Diagonal Santander.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
