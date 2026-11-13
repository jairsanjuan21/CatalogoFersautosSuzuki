"use client";

import { startTransition, useActionState, useRef, useState, useTransition, type FormEvent } from "react";
import { borrarFotoGaleria, cambiarVisibilidadFoto, subirFotoGaleria, type ResultadoGaleria } from "@/modulos/galeria/acciones";
import { comprimirImagen } from "@/lib/comprimir-imagen";

const claseInput =
  "min-h-11 w-full rounded-lg border border-linea-2 bg-superficie px-3 text-base outline-none focus:border-azul focus:ring-2 focus:ring-azul/40 aria-invalid:border-senal";

export function SubirFoto({ modelos }: { modelos: { id: string; linea: string }[] }) {
  const formulario = useRef<HTMLFormElement>(null);
  const [foto, setFoto] = useState<{ blob: Blob; url: string }>();
  const [procesando, setProcesando] = useState(false);
  const [hayMenores, setHayMenores] = useState(false);
  const [estado, accion, pendiente] = useActionState(async (previo: ResultadoGaleria, datos: FormData) => {
    const r = await subirFotoGaleria(previo, datos);
    if (r.ok) {
      // Solo se limpia si salió bien: con un error, lo escrito y la foto se conservan
      formulario.current?.reset();
      setFoto(undefined);
      setHayMenores(false);
    }
    return r;
  }, { ok: true });
  const err = estado.errores ?? {};

  async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setProcesando(true);
    try {
      const blob = await comprimirImagen(archivo, 2000);
      setFoto({ blob, url: URL.createObjectURL(blob) });
    } finally {
      setProcesando(false);
    }
  }

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    datos.delete("archivo"); // el original pesa varios MB: se envía la versión comprimida
    if (foto) datos.set("foto", foto.blob, "foto.jpg");
    startTransition(() => accion(datos));
  }

  return (
    <form ref={formulario} onSubmit={enviar} className="grid gap-3.5 rounded-xl border border-linea bg-superficie p-4 sm:grid-cols-[200px_1fr]">
      <div>
        <label className={`grid aspect-[4/3] cursor-pointer place-items-center overflow-hidden rounded-lg border-[1.5px] border-dashed text-center text-sm ${err.foto ? "border-senal" : "border-linea-2"} focus-within:ring-2 focus-within:ring-azul`}>
          <input type="file" name="archivo" accept="image/*" onChange={elegir} className="sr-only" />
          {foto ? (
            // eslint-disable-next-line @next/next/no-img-element -- vista previa local
            <img src={foto.url} alt="Vista previa" className="size-full object-cover" />
          ) : (
            <span className="px-3 text-azul-texto">{procesando ? "Preparando…" : <><b>Toca para elegir la foto</b><br /><span className="text-texto-2">de la entrega</span></>}</span>
          )}
        </label>
        {err.foto && <p className="mt-1 text-sm text-senal">{err.foto}</p>}
      </div>
      <div className="grid content-start gap-3">
        <fieldset>
          <legend className="mb-1 text-sm font-semibold">Sección</legend>
          <div className="flex flex-wrap gap-2">
            {[["familia", "Familia Suzuki"], ["clientes", "Clientes felices"]].map(([v, t], i) => (
              <label key={v} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-linea-2 px-3.5 has-checked:border-azul has-checked:bg-azul has-checked:font-semibold has-checked:text-white">
                <input type="radio" name="seccion" value={v} defaultChecked={i === 0} className="sr-only" />
                {t}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="g-pie" className="mb-1 block text-sm font-semibold">Pie de foto <span className="font-normal text-texto-2">(opcional)</span></label>
          <input id="g-pie" name="pie" maxLength={120} placeholder="Ej: La familia Peña estrenó su Ertiga" className={claseInput} aria-invalid={!!err.pie} />
          {err.pie && <p className="mt-1 text-sm text-senal">{err.pie}</p>}
        </div>
        <div>
          <label htmlFor="g-modelo" className="mb-1 block text-sm font-semibold">Vehículo <span className="font-normal text-texto-2">(opcional)</span></label>
          <select id="g-modelo" name="modeloId" defaultValue="" className={claseInput}>
            <option value="">Sin especificar</option>
            {modelos.map((m) => <option key={m.id} value={m.id}>{m.linea}</option>)}
          </select>
        </div>

        <fieldset className="rounded-lg bg-fondo p-3">
          <legend className="sr-only">Autorización</legend>
          <label className="flex gap-2.5 text-[15px]">
            <input type="checkbox" name="autorizada" className="mt-0.5 size-5 flex-none accent-azul" aria-invalid={!!err.autorizada} />
            <span>Las personas de la foto me autorizaron a publicarla en mi catálogo.</span>
          </label>
          {err.autorizada && <p className="mt-1 ml-7.5 text-sm text-senal">{err.autorizada}</p>}
          <label className="mt-2.5 flex gap-2.5 text-[15px]">
            <input type="checkbox" name="hayMenores" checked={hayMenores} onChange={(e) => setHayMenores(e.target.checked)} className="mt-0.5 size-5 flex-none accent-azul" />
            <span>En la foto aparecen niños o menores de 18 años.</span>
          </label>
          {hayMenores && (
            <>
              <label className="mt-2.5 ml-7.5 flex gap-2.5 text-[15px]">
                <input type="checkbox" name="autorizacionMenores" className="mt-0.5 size-5 flex-none accent-azul" aria-invalid={!!err.autorizacionMenores} />
                <span>Sus padres o acudientes autorizaron publicar su imagen.</span>
              </label>
              {err.autorizacionMenores && <p className="mt-1 ml-15 text-sm text-senal">{err.autorizacionMenores}</p>}
            </>
          )}
        </fieldset>

        <div>
          <button disabled={pendiente || procesando} className="min-h-11 rounded-lg bg-azul px-4 font-semibold text-white hover:bg-azul-hover disabled:opacity-60">
            {pendiente ? "Publicando…" : "Publicar foto"}
          </button>
          {estado.mensaje && <p role="status" className={`mt-2 text-[15px] ${estado.ok ? "text-ok" : "text-senal"}`}>{estado.mensaje}</p>}
        </div>
      </div>
    </form>
  );
}

export function AccionesFoto({ fotoId, visible }: { fotoId: string; visible: boolean }) {
  const [pendiente, iniciar] = useTransition();
  const [confirmando, setConfirmando] = useState(false);
  const boton = "min-h-9 rounded-lg border border-linea-2 bg-superficie px-2.5 text-sm font-semibold disabled:opacity-50";
  if (confirmando) {
    return (
      <span className="flex flex-wrap gap-1.5">
        <button type="button" disabled={pendiente} onClick={() => iniciar(async () => void (await borrarFotoGaleria(fotoId)))} className="min-h-9 rounded-lg bg-senal px-2.5 text-sm font-semibold text-white disabled:opacity-50">
          {pendiente ? "Borrando…" : "Sí, borrar"}
        </button>
        <button type="button" onClick={() => setConfirmando(false)} className={boton}>No</button>
      </span>
    );
  }
  return (
    <span className="flex flex-wrap gap-1.5">
      <button type="button" disabled={pendiente} onClick={() => iniciar(async () => void (await cambiarVisibilidadFoto(fotoId, !visible)))} className={boton}>
        {visible ? "Ocultar" : "Mostrar"}
      </button>
      <button type="button" onClick={() => setConfirmando(true)} className={`${boton} border-senal text-senal`}>Borrar</button>
    </span>
  );
}
