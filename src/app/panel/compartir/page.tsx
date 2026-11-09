import { Suspense } from "react";
import { exigirRol } from "@/lib/sesion";
import { Cargando, Titulo } from "../componentes";
import { CopiarEnlace } from "./CopiarEnlace";

const ENLACES = [
  ["Instagram", "instagram"],
  ["Facebook", "facebook"],
  ["WhatsApp", "whatsapp"],
  ["Estados de WhatsApp", "estados"],
] as const;

export default function Compartir() {
  return (
    <>
      <Titulo sub="Usa un enlace distinto en cada red para saber de dónde llegan tus clientes.">Compartir</Titulo>
      <Suspense fallback={<Cargando />}>
        <Contenido />
      </Suspense>
    </>
  );
}

async function Contenido() {
  await exigirRol("asesora");
  const base = (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return (
    <>
      <h2 className="font-display mt-7 mb-2.5 text-[22px] font-semibold">Formulario de crédito</h2>
      <div className="space-y-3 rounded-xl border border-linea bg-superficie p-4">
        {ENLACES.map(([red, origen]) => (
          <CopiarEnlace key={origen} etiqueta={red} url={`${base}/credito?origen=${origen}`} />
        ))}
      </div>
      <p className="mt-3 text-sm text-texto-2">El código QR y el enlace al catálogo llegan en la fase 4.</p>
    </>
  );
}
