import "server-only";
import { randomUUID } from "node:crypto";
import sharp, { type Metadata } from "sharp";
import { almacenamiento } from "@/lib/almacenamiento";

/**
 * FOTOS PÚBLICAS (catálogo y foto de Natalia)
 * Cada foto se guarda en dos tamaños WebP: 600 px para tarjetas y celulares,
 * 1200 px para la ficha en pantallas grandes. El navegador elige con srcset.
 * Se re-codifican siempre: eso borra el EXIF (ubicación, modelo del celular).
 */

export const TAMANOS = [600, 1200] as const;
export type Tamano = (typeof TAMANOS)[number];

export class ErrorFoto extends Error {}

export async function guardarFotoPublica(original: Buffer, carpeta: "modelos" | "asesora", subcarpeta?: string) {
  let meta: Metadata;
  try {
    meta = await sharp(original, { failOn: "error" }).metadata();
  } catch {
    throw new ErrorFoto("No pudimos leer esa imagen. Usa una foto JPG, PNG o WebP.");
  }
  if (!meta.width || !meta.height || Math.min(meta.width, meta.height) < 400) {
    throw new ErrorFoto("La foto es muy pequeña: debe medir al menos 400 píxeles por lado.");
  }
  const base = ["publico", carpeta, subcarpeta, randomUUID()].filter(Boolean).join("/");
  for (const ancho of TAMANOS) {
    const datos = await sharp(original)
      .rotate()
      .resize({ width: ancho, height: ancho, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    await almacenamiento.guardar(`${base}-${ancho}.webp`, datos, "image/webp");
  }
  return base;
}

export async function borrarFotoPublica(base: string) {
  await Promise.allSettled(TAMANOS.map((t) => almacenamiento.borrar(`${base}-${t}.webp`)));
}

/** URL pública de una foto en un tamaño */
export const urlFoto = (base: string, tamano: Tamano) => `/api/fotos/${base}-${tamano}.webp`;

/** Atributos listos para <img>: el navegador descarga solo el tamaño que necesita */
export const atributosFoto = (base: string, sizes = "(min-width: 768px) 50vw, 100vw") => ({
  src: urlFoto(base, 600),
  srcSet: TAMANOS.map((t) => `${urlFoto(base, t)} ${t}w`).join(", "),
  sizes,
});
