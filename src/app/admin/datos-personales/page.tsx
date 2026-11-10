import { Suspense } from "react";
import { asc, desc } from "drizzle-orm";
import { exigirRol } from "@/lib/sesion";
import { db } from "@/db";
import * as t from "@/db/esquema";
import { enmascarar } from "@/lib/claves";
import { fechaCorta } from "@/lib/etiquetas";
import { Titulo } from "../componentes";
import { CerrarPeticion, EliminarDatos, NuevaPeticion } from "./clientes";

const TIPOS = { consulta: "Consulta", correccion: "Corrección", eliminacion: "Eliminación", revocatoria: "Revocatoria" } as const;

/** Días hábiles (lunes a viernes) entre dos fechas. No descuenta festivos: avisa un poco antes, nunca después. */
function diasHabiles(desde: Date, hasta: Date) {
  let n = 0;
  const d = new Date(desde);
  while (d < hasta) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) n++;
  }
  return n;
}

export default function DatosPersonales() {
  return (
    <>
      <Titulo sub="Peticiones de los clientes sobre sus datos (Ley 1581 de 2012).">Datos personales</Titulo>
      <Suspense fallback={<p className="mt-8 text-texto-2">Cargando…</p>}>
        <Contenido />
      </Suspense>
    </>
  );
}

async function Contenido() {
  await exigirRol("admin");
  const peticiones = await db.select().from(t.peticionesTitulares).orderBy(asc(t.peticionesTitulares.estado), desc(t.peticionesTitulares.recibidaEn));
  const pendientes = peticiones.filter((p) => p.estado === "pendiente");
  const cerradas = peticiones.filter((p) => p.estado !== "pendiente").slice(0, 20);
  const ahora = new Date();

  return (
    <>
      <h2 className="font-display mt-7 mb-2.5 text-[22px] font-semibold">Pendientes</h2>
      {pendientes.length === 0 && <p className="rounded-xl border border-linea bg-superficie p-4 text-texto-2">No hay peticiones pendientes.</p>}
      <div className="space-y-3">
        {pendientes.map((p) => {
          const plazo = p.tipo === "consulta" ? 10 : 15;
          const restantes = plazo - diasHabiles(p.recibidaEn, ahora);
          return (
            <div key={p.id} className="rounded-xl border border-linea bg-superficie p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <strong>{TIPOS[p.tipo]}</strong> de {p.nombre}
                  <p className="font-mono text-sm text-texto-2">{enmascarar(p.numeroIdentificacion)}</p>
                </div>
                <span className={`rounded px-2 py-0.5 text-[13px] font-semibold ${restantes <= 3 ? "bg-senal-fondo text-senal" : "bg-ambar-fondo text-ambar"}`}>
                  {restantes > 0 ? `Vence en ${restantes} días hábiles` : `Vencida hace ${-restantes} días hábiles`}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-texto-2">Recibida el {fechaCorta(p.recibidaEn)} por {p.canal}.</p>
              {p.detalle && <p className="mt-1.5 text-[15px]">{p.detalle}</p>}
              <div className="flex flex-wrap items-start">
                {p.tipo === "eliminacion" && <EliminarDatos peticionId={p.id} />}
                <CerrarPeticion peticionId={p.id} />
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="font-display mt-8 mb-2.5 text-[22px] font-semibold">Registrar una petición</h2>
      <NuevaPeticion />

      {cerradas.length > 0 && (
        <>
          <h2 className="font-display mt-8 mb-2.5 text-[22px] font-semibold">Atendidas</h2>
          <div className="rounded-xl border border-linea bg-superficie">
            {cerradas.map((p) => (
              <div key={p.id} className="border-b border-linea px-4 py-3 text-[15px] last:border-b-0">
                <strong>{TIPOS[p.tipo]}</strong> de {p.nombre} <span className="font-mono text-sm text-texto-2">{p.numeroIdentificacion}</span>
                <span className={`ml-2 rounded px-2 py-0.5 text-[13px] font-semibold ${p.estado === "atendida" ? "bg-ok-fondo text-ok" : "bg-linea text-texto-2"}`}>{p.estado === "atendida" ? "Atendida" : "Rechazada"}</span>
                <p className="text-sm text-texto-2">{p.respuesta}{p.atendidaEn && `, el ${fechaCorta(p.atendidaEn)}`}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="font-display mt-8 mb-2.5 text-[22px] font-semibold">Por qué no ves los datos de los clientes</h2>
      <p className="rounded-xl border border-linea bg-superficie p-4 text-[15px]">
        Tu cuenta es técnica: ves configuración, registros y errores, pero no los ingresos, cédulas ni referencias de los clientes. Incluso al eliminar los
        datos de un titular solo ves cuántos registros hay, no su contenido. Es el principio de mínimo privilegio: cada cuenta accede solo a lo que necesita.
      </p>
    </>
  );
}
