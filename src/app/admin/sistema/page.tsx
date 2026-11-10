import { Suspense } from "react";
import { exigirRol } from "@/lib/sesion";
import { estadoSistema, legible } from "@/modulos/admin/sistema";
import { Titulo } from "../componentes";
import { BotonRetencion } from "./BotonRetencion";

export default function Sistema() {
  return (
    <>
      <Titulo sub="Almacenamiento, retención de documentos e integraciones.">Sistema</Titulo>
      <Suspense fallback={<p className="mt-8 text-texto-2">Cargando…</p>}>
        <Contenido />
      </Suspense>
    </>
  );
}

const Punto = ({ tono }: { tono: "ok" | "ambar" | "gris" }) => (
  <span className={`mr-2 inline-block size-2.5 rounded-full ${tono === "ok" ? "bg-ok" : tono === "ambar" ? "bg-ambar" : "bg-linea-2"}`} />
);

async function Contenido() {
  await exigirRol("admin");
  const s = await estadoSistema();
  const integraciones: [string, "ok" | "ambar" | "gris", string, string][] = [
    ["Base de datos", "ok", "PostgreSQL conectado", `${s.tamanoBd}, ${s.solicitudes} solicitudes, ${s.auditoria} registros de auditoría`],
    ["Almacenamiento", "ok", s.almacenamiento, `Documentos: ${legible(s.documentos.bytes)} (${s.documentos.n}). Fotos públicas: ${legible(s.fotosBytes)} (${s.fotos} fotos)`],
    ["Generador de PDF", "ok", "Funcionando", "Plantilla F-NS-01 versión 1"],
    ["Lectura de precios con IA", "gris", "Pendiente", "Llega en la fase 7"],
    ["Bot de Telegram", "gris", "Pendiente", "Llega en la fase 8"],
    ["Correo", "ambar", "Sin configurar", "Las contraseñas se restablecen desde Usuarios"],
  ];
  return (
    <>
      <h2 className="font-display mt-7 mb-2.5 text-[22px] font-semibold">Servicios</h2>
      <div className="overflow-x-auto rounded-xl border border-linea bg-superficie">
        <table className="w-full text-[15px]">
          <tbody>
            {integraciones.map(([nombre, tono, estado, detalle]) => (
              <tr key={nombre} className="border-b border-linea last:border-b-0 align-top">
                <td className="px-3.5 py-3 font-semibold whitespace-nowrap">{nombre}</td>
                <td className="px-3.5 py-3 whitespace-nowrap"><Punto tono={tono} />{estado}</td>
                <td className="px-3.5 py-3 text-texto-2">{detalle}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="font-display mt-7 mb-2.5 text-[22px] font-semibold">Retención de documentos</h2>
      <div className="rounded-xl border border-linea bg-superficie p-4">
        <p>
          Las fotos de cédula y las firmas se borran {s.retencion.dias} días después de cerrar cada solicitud. En producción esto se ejecuta solo cada noche.
        </p>
        <p className={`mt-2 font-semibold ${s.retencion.archivos ? "text-ambar" : "text-ok"}`}>
          {s.retencion.archivos ? `${s.retencion.archivos} archivos de ${s.retencion.solicitudes} solicitudes ya cumplieron el plazo.` : "No hay documentos vencidos."}
        </p>
        <BotonRetencion pendientes={s.retencion.archivos} />
      </div>

      <h2 className="font-display mt-7 mb-2.5 text-[22px] font-semibold">Respaldos</h2>
      <div className="rounded-xl border border-linea bg-superficie p-4 text-[15px]">
        Se configuran en el despliegue: copia diaria de la base de datos, cifrada y guardada fuera del servidor, conservando los últimos 7 días.
      </div>

      <p className="mt-6 text-[13px] text-texto-2">
        Entorno: {s.entorno}. Node.js {s.node}.
      </p>
    </>
  );
}
