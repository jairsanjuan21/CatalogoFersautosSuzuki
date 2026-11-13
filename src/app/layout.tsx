import type { Metadata } from "next";
import { Barlow_Semi_Condensed, Inter, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { SCRIPT_TEMA } from "@/lib/tema";

// Las mismas fuentes que aprobó Natalia en los prototipos
const display = Barlow_Semi_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});
// Inter: la tipografía del diseño de los paneles (el catálogo público mantiene las suyas)
const panel = Inter({
  variable: "--font-panel-base",
  subsets: ["latin"],
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
    // suppressHydrationWarning: el script cambia data-tema antes de que React hidrate
    <html lang="es" className={`${display.variable} ${sans.variable} ${panel.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
