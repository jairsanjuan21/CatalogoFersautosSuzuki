import { Suspense } from "react";
import { exigirRol } from "@/lib/sesion";
import { fechaCorta, haceCuanto } from "@/lib/etiquetas";
import { plata } from "@/lib/formato";
import { preciosParaPanel, promocionesParaPanel } from "@/modulos/precios/consultas";
import { Cargando, Titulo } from "../componentes";
import { FormularioPromocion, QuitarPromocion, TablaPrecios, type FilaPrecio } from "./clientes";

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

  const filas: FilaPrecio[] = modelos.map((m) => {
    const anterior = m.historial.find((h) => h.precio !== m.precio);
    return {
      id: m.id,
      linea: m.linea,
      tipo: TIPOS[m.tipo] ?? m.tipo,
      precio: m.precio,
      mostrarPrecio: m.mostrarPrecio,
      desactualizado: !!m.desactualizado,
      actualizado: m.vigenteDesde ? haceCuanto(m.vigenteDesde) : "",
      anterior: anterior ? `${plata(anterior.precio)} el ${fechaCorta(anterior.desde)}` : null,
    };
  });
  const vigentes = promociones.filter((p) => !p.vencida);
  const vencidas = promociones.filter((p) => p.vencida);

  return (
    <>
      <h2 className="font-display mt-7 mb-2.5 text-[22px] font-semibold">Subir lista de precios en PDF</h2>
      <div className="rounded-xl border-[1.5px] border-dashed border-linea-2 bg-superficie p-5 text-center text-texto-2">
        Pronto vas a poder subir el PDF que te llega con los precios: el sistema los lee y te los muestra para que los confirmes.
      </div>

      <h2 className="font-display mt-7 mb-2.5 text-[22px] font-semibold">Precios de hoy</h2>
      <TablaPrecios filas={filas} diasVigencia={diasVigencia} />
      <p className="mt-2 text-sm text-texto-2">
        “Guardar precios de hoy” confirma todos los precios, aunque no cambien. Los modelos sin precio visible muestran “Cotizar con Natalia” en el catálogo.
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
