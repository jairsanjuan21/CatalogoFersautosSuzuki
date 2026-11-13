import { Suspense } from "react";
import { exigirRol } from "@/lib/sesion";
import { fechaCorta, haceCuanto } from "@/lib/etiquetas";
import { nombreVersion, plata } from "@/lib/formato";
import { preciosParaPanel, promocionesParaPanel } from "@/modulos/precios/consultas";
import { Cargando, Titulo } from "../componentes";
import { FormularioPromocion, QuitarPromocion, TablaPrecios, type ModeloPrecios } from "./clientes";
import { LectorPdf } from "./LectorPdf";

const TIPOS: Record<string, string> = { hatchback: "Hatchback", sedan: "Sedán", suv: "SUV", todoterreno: "4x4", familiar: "Familiar 7 puestos" };

export default function Precios() {
  return (
    <>
      <Titulo sub="Lo que guardes aquí se muestra en el catálogo y se precarga en tus solicitudes.">Precios y promociones</Titulo>
      <Suspense fallback={<Cargando />}>
        <Contenido />
      </Suspense>
    </>
  );
}

async function Contenido() {
  await exigirRol("asesora");
  const [{ modelos, diasVigencia }, promociones] = await Promise.all([preciosParaPanel(), promocionesParaPanel()]);
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());

  const tablas: ModeloPrecios[] = modelos.map((m) => ({
    id: m.id,
    linea: m.linea,
    tipo: TIPOS[m.tipo] ?? m.tipo,
    mostrarPrecio: m.mostrarPrecio,
    precioBase: m.precioBase,
    versiones: m.versiones.map((v) => ({
      id: v.id,
      etiqueta: nombreVersion(v),
      precio: v.precio,
      desactualizado: !!v.desactualizado,
      actualizado: v.vigenteDesde ? haceCuanto(v.vigenteDesde) : "",
      anterior: v.anterior ? `${plata(v.anterior.precio)} el ${fechaCorta(v.anterior.desde)}` : null,
    })),
  }));
  const vigentes = promociones.filter((p) => !p.vencida);
  const vencidas = promociones.filter((p) => p.vencida);

  return (
    <>
      <h2 className="font-display mt-7 mb-2.5 text-[22px] font-semibold">Subir lista de precios en PDF</h2>
      <LectorPdf />

      <h2 className="font-display mt-7 mb-2.5 text-[22px] font-semibold">Precios de hoy</h2>
      <TablaPrecios modelos={tablas} diasVigencia={diasVigencia} />
      <p className="mt-2 text-sm text-texto-2">
        “Guardar precios de hoy” confirma el precio de todas las versiones, aunque no cambien. Los modelos sin precio visible muestran “Cotizar con Natalia” en el catálogo.
      </p>

      <h2 className="font-display mt-8 mb-2.5 text-[22px] font-semibold">Promociones</h2>
      <div className="overflow-hidden rounded-xl border border-linea bg-superficie">
        {vigentes.length === 0 && <p className="px-4 py-5 text-center text-texto-2">No tienes promociones activas.</p>}
        {[...vigentes, ...vencidas].map((p) => (
          <div key={p.id} className={`flex items-center gap-3 border-b border-linea px-4 py-3 last:border-b-0 ${p.vencida ? "opacity-60" : ""}`}>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {p.linea}: {p.descripcion}
              </p>
              <p className="text-sm text-texto-2">
                {p.valorBono ? `${plata(p.valorBono)}, ` : ""}
                {p.vencida ? `venció el ${fechaCorta(new Date(p.hasta + "T12:00:00"))}` : `hasta el ${fechaCorta(new Date(p.hasta + "T12:00:00"))}`}
              </p>
            </div>
            {!p.vencida && <QuitarPromocion promocionId={p.id} />}
          </div>
        ))}
      </div>
      <FormularioPromocion modelos={modelos.map((m) => ({ id: m.id, linea: m.linea }))} hoy={hoy} />
    </>
  );
}
