import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { clausulas, configuracion, modelos } from "@/db/esquema";
import { FormularioCredito } from "./FormularioCredito";

export const metadata: Metadata = {
  title: "Solicita tu crédito Suzuki | Fersautos Cúcuta",
  description: "Llena tu solicitud de crédito desde el celular en unos 8 minutos.",
  openGraph: {
    title: "Solicita tu crédito Suzuki",
    description: "Llena tu solicitud de crédito desde el celular en unos 8 minutos.",
  },
};

export default function Credito() {
  return (
    <main className="mx-auto max-w-2xl px-5">
      <Suspense fallback={<p className="pt-10 text-texto-2">Cargando formulario…</p>}>
        <Cargar />
      </Suspense>
    </main>
  );
}

async function Cargar() {
  await connection();
  const [[conf], [clausula], lineas] = await Promise.all([
    db.select().from(configuracion).limit(1),
    db.select().from(clausulas).orderBy(desc(clausulas.version)).limit(1),
    db.select({ linea: modelos.linea }).from(modelos).where(eq(modelos.visible, true)).orderBy(asc(modelos.orden)),
  ]);

  if (!conf || !clausula) {
    return <p className="pt-10 text-senal">El formulario aún no está configurado. Corre npm run db:seed.</p>;
  }

  return (
    <FormularioCredito
      config={{
        asesoraNombre: conf.asesoraNombre,
        asesoraWhatsapp: conf.asesoraWhatsapp,
        sede: conf.sede,
        ciudad: conf.ciudad,
        plazos: conf.plazosMeses,
        clausula: { version: clausula.version, texto: clausula.texto },
        lineas: lineas.map((l) => l.linea),
      }}
    />
  );
}
