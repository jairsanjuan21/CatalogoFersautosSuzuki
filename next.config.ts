import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Indicador de desarrollo (la "N" flotante): solo existe con `npm run dev`. Abajo a la
  // izquierda tapaba "Cerrar sesión" en el menú lateral; abajo a la derecha no estorba.
  devIndicators: { position: "bottom-right" },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
