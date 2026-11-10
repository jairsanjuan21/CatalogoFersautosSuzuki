import { Suspense } from "react";
import Link from "next/link";
import { exigirRol } from "@/lib/sesion";
import { consultarAuditoria } from "@/modulos/admin/auditoria";
import { Titulo } from "../componentes";

const ACTORES = { asesora: "Natalia", admin: "Admin", cliente: "Clientes", sistema: "Sistema" } as const;
const PERIODOS = { "7": "7 días", "30": "30 días", "90": "90 días", "365": "1 año" } as const;
type Params = Promise<{ actor?: string; dias?: string; q?: string; pagina?: string }>;

export default function Auditoria({ searchParams }: { searchParams: Params }) {
  return (
    <>
      <Titulo sub="Registro de quién hizo qué y cuándo. No se puede editar ni borrar: lo garantiza la base de datos.">Auditoría</Titulo>
      <Suspense fallback={<p className="mt-8 text-texto-2">Cargando…</p>}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </>
  );
}

/** 190.85.10.20 → 190.85.x.x : basta para ver la red de origen */
const recortarIp = (ip: string | null) => (ip ? ip.split(".").slice(0, 2).join(".") + ".x.x" : "");
const fechaHora = (d: Date) => new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", dateStyle: "medium", timeStyle: "short" }).format(d);

async function Contenido({ searchParams }: { searchParams: Params }) {
  await exigirRol("admin");
  const sp = await searchParams;
  const actor = sp.actor && sp.actor in ACTORES ? (sp.actor as keyof typeof ACTORES) : undefined;
  const dias = sp.dias && sp.dias in PERIODOS ? sp.dias : "30";
  const pagina = Math.max(1, Number(sp.pagina) || 1);
  const q = sp.q?.trim().slice(0, 60);

  const { filas, total, paginas } = await consultarAuditoria({ actor, dias: Number(dias), q, pagina });
  const enlace = (cambios: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ actor, dias, q, ...cambios }).filter(([, v]) => v) as [string, string][]);
    return `/admin/auditoria?${p}`;
  };
  const chip = "flex min-h-9 items-center rounded-full border border-linea-2 bg-superficie px-3 text-sm aria-[current=true]:border-azul aria-[current=true]:bg-azul aria-[current=true]:font-semibold aria-[current=true]:text-white";

  return (
    <>
      <form action="/admin/auditoria" role="search" className="mt-5 flex gap-2">
        {actor && <input type="hidden" name="actor" value={actor} />}
        <input type="hidden" name="dias" value={dias} />
        <input name="q" type="search" defaultValue={q} placeholder="Buscar en las acciones (ej: precio, PDF, sesión)" aria-label="Buscar en la auditoría" className="min-h-11 min-w-0 flex-1 rounded-lg border border-linea-2 bg-superficie px-3" />
        <button className="min-h-11 rounded-lg border border-linea-2 bg-superficie px-4 font-semibold">Buscar</button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filtrar">
        <Link href={enlace({ actor: undefined, pagina: undefined })} aria-current={!actor ? "true" : undefined} className={chip}>Todos</Link>
        {Object.entries(ACTORES).map(([k, v]) => (
          <Link key={k} href={enlace({ actor: k, pagina: undefined })} aria-current={actor === k ? "true" : undefined} className={chip}>{v}</Link>
        ))}
        <span className="mx-1 w-px self-stretch bg-linea" />
        {Object.entries(PERIODOS).map(([k, v]) => (
          <Link key={k} href={enlace({ dias: k, pagina: undefined })} aria-current={dias === k ? "true" : undefined} className={chip}>{v}</Link>
        ))}
      </div>
      <p className="mt-3 text-sm text-texto-2">{total} registros</p>
      <div className="mt-2 overflow-x-auto rounded-xl border border-linea bg-superficie">
        <table className="w-full text-[15px]">
          <thead>
            <tr className="bg-fondo text-left text-[13px] text-texto-2">
              <th className="px-3.5 py-2.5 font-semibold">Fecha</th>
              <th className="px-3.5 py-2.5 font-semibold">Quién</th>
              <th className="px-3.5 py-2.5 font-semibold">Acción</th>
              <th className="px-3.5 py-2.5 font-semibold">Referencia</th>
              <th className="px-3.5 py-2.5 font-semibold">IP</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.id} className="border-t border-linea align-top">
                <td className="px-3.5 py-2.5 whitespace-nowrap text-texto-2">{fechaHora(f.creadoEn)}</td>
                <td className="px-3.5 py-2.5 whitespace-nowrap">{f.usuario ?? ACTORES[f.actor]}</td>
                <td className="px-3.5 py-2.5">
                  {f.accion}
                  {f.accion.includes("fallido") && <span className="ml-2 rounded bg-ambar-fondo px-1.5 py-0.5 text-xs font-semibold text-ambar">Revisar</span>}
                </td>
                <td className="px-3.5 py-2.5 font-mono text-[13px] text-texto-2">{f.entidadId && f.entidadId.length > 20 ? f.entidadId.slice(0, 8) + "…" : f.entidadId}</td>
                <td className="px-3.5 py-2.5 font-mono text-[13px] whitespace-nowrap text-texto-2">{recortarIp(f.ip)}</td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3.5 py-6 text-center text-texto-2">Sin registros con estos filtros.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {paginas > 1 && (
        <nav aria-label="Páginas" className="mt-3 flex items-center gap-3">
          {pagina > 1 && <Link href={enlace({ pagina: String(pagina - 1) })} className="font-semibold text-azul-texto">‹ Anteriores</Link>}
          <span className="text-sm text-texto-2">Página {pagina} de {paginas}</span>
          {pagina < paginas && <Link href={enlace({ pagina: String(pagina + 1) })} className="font-semibold text-azul-texto">Siguientes ›</Link>}
        </nav>
      )}
      <p className="mt-3 text-[13px] text-texto-2">Las IP se muestran recortadas. Los registros se conservan un año.</p>
    </>
  );
}
