import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirRol } from "@/lib/sesion";
import { db } from "@/db";
import { configuracion } from "@/db/esquema";
import { fechaCorta, haceCuanto, ORIGENES, type Estado } from "@/lib/etiquetas";
import { plata } from "@/lib/formato";
import { OPCIONES } from "@/validacion/solicitud";
import { detalleSolicitud } from "@/modulos/solicitudes/panel";
import { Cargando, EstadoBadge } from "../../componentes";
import { BotonCargada, FormularioEstado, FormularioNota, FormularioValor, MarcarVista } from "./clientes";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Lista de ejemplo mientras Natalia confirma con qué entidades trabaja
const FINANCIERAS = ["Banco de Bogotá", "Bancolombia", "Davivienda", "Banco de Occidente", "Finanzauto"];

export default function Detalle({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <Link href="/panel/solicitudes" className="mt-4 inline-block py-1 font-semibold text-azul-texto">
        ‹ Solicitudes
      </Link>
      <Suspense fallback={<Cargando />}>
        <Contenido params={params} />
      </Suspense>
    </>
  );
}

const ETAPAS = ["Recibida", "Con valor", "Cargada", "Aprobada", "Entregada"];
const ETAPA: Record<Estado, number> = { pendiente_valor: 0, lista_para_cargar: 1, en_estudio: 2, aprobada: 3, negada: 2, entregada: 4, desistio: 0 };

function Seccion({ titulo, children, abierta }: { titulo: string; children: React.ReactNode; abierta?: boolean }) {
  return (
    <details open={abierta} className="group mt-2.5 rounded-xl border border-linea bg-superficie">
      <summary className="font-display flex cursor-pointer list-none justify-between px-4 py-3 text-lg font-semibold">
        {titulo}
        <span aria-hidden className="font-sans text-texto-2 group-open:hidden">+</span>
        <span aria-hidden className="hidden font-sans text-texto-2 group-open:inline">−</span>
      </summary>
      <dl className="grid grid-cols-[minmax(110px,38%)_1fr] gap-x-3 gap-y-1.5 px-4 pb-4 text-[15px]">{children}</dl>
    </details>
  );
}
function Dato({ k, v }: { k: string; v: React.ReactNode }) {
  if (v === null || v === undefined || v === "") return null;
  return (
    <>
      <dt className="text-texto-2">{k}</dt>
      <dd className="break-words">{v}</dd>
    </>
  );
}
const Tel = ({ n }: { n: string | null }) => (n ? <a href={`tel:+57${n}`} className="text-azul-texto">{n}</a> : null);

async function Contenido({ params }: { params: Promise<{ id: string }> }) {
  await exigirRol("asesora");
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [datos, [conf]] = await Promise.all([detalleSolicitud(id), db.select().from(configuracion).limit(1)]);
  if (!datos) notFound();
  const { solicitud: s, historial, notas, modelos } = datos;

  const nombre = [s.nombres, s.primerApellido, s.segundoApellido].filter(Boolean).join(" ");
  const etapa = ETAPA[s.estado];
  const tieneCedula = s.documentos.some((d) => (d.tipo === "cedula_frente" || d.tipo === "cedula_reves") && !d.eliminadoEn);
  const mensajeWa = encodeURIComponent(`Hola ${s.nombres.split(" ")[0]}, te escribe Natalia de Fersautos Suzuki sobre tu solicitud ${s.radicado}.`);
  const ref = (tipo: string) => s.referencias.find((r) => r.tipo === tipo);
  const boton = "flex min-h-[62px] flex-col items-center justify-center gap-0.5 rounded-lg border border-linea-2 bg-superficie px-1.5 text-[13px] font-semibold";

  return (
    <>
      <MarcarVista solicitudId={s.id} />
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[32px] leading-tight font-bold">{nombre}</h1>
          <p className="text-texto-2">
            {s.radicado}, llegó {haceCuanto(s.creadoEn)} por {ORIGENES[s.origen]}
          </p>
        </div>
        <EstadoBadge estado={s.estado} />
      </div>

      {/* Etapa del proceso con la misma carretera del formulario */}
      <div aria-label={`Etapa: ${ETAPAS[etapa]}`} className="relative mt-4 h-[26px] overflow-hidden rounded-full bg-asfalto">
        <div className="absolute inset-x-3 top-3 h-0.5 bg-[repeating-linear-gradient(90deg,var(--marca-via)_0_12px,transparent_12px_22px)] opacity-70" />
        <svg viewBox="0 0 44 24" aria-hidden className="absolute top-0.5 h-[22px] w-10" style={{ left: `calc(3px + (100% - 46px) * ${etapa / 4})` }}>
          <path d="M4 17 L6 11.5 Q8 8 13 8 L26 8 Q30 8 33 11 L39 13 Q41 14 41 16 L41 18 L4 18 Z" fill="#fff" />
          <path d="M14 10 L25 10 Q28 10 30 12.5 L14 12.5 Z" fill="#9db7e3" />
          <circle cx="12" cy="18.5" r="3.4" fill="#1a2330" stroke="#fff" strokeWidth="1.4" />
          <circle cx="33" cy="18.5" r="3.4" fill="#1a2330" stroke="#fff" strokeWidth="1.4" />
        </svg>
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-texto-2">
        {ETAPAS.map((e, i) => (
          <span key={e} className={i <= etapa ? "font-semibold text-texto" : ""}>{e}</span>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        <a href={`tel:+57${s.celular}`} className={boton}>Llamar</a>
        <a href={`https://wa.me/57${s.celular}?text=${mensajeWa}`} target="_blank" rel="noopener noreferrer" className={boton}>WhatsApp</a>
        {s.valorVehiculo !== null ? (
          <a href={`/api/solicitudes/${s.id}/pdf?tipo=formulario`} className={boton}>PDF formulario</a>
        ) : (
          <span aria-disabled className={`${boton} opacity-50`}>PDF formulario</span>
        )}
        {tieneCedula ? (
          <a href={`/api/solicitudes/${s.id}/pdf?tipo=cedula`} className={boton}>PDF cédula</a>
        ) : (
          <span aria-disabled className={`${boton} opacity-50`}>PDF cédula</span>
        )}
      </div>
      {s.valorVehiculo === null && <p className="mt-1.5 text-sm text-texto-2">El PDF del formulario se habilita cuando asignes el valor del vehículo.</p>}

      {s.estado === "lista_para_cargar" && (
        <div className="mt-3 rounded-xl border border-azul bg-superficie p-4">
          <strong>Siguiente paso: cargar en la plataforma de Fersautos</strong>
          <p className="mt-1 mb-3 text-[15px] text-texto-2">Descarga el formulario y la cédula, súbelos a la plataforma y luego márcalo aquí.</p>
          <BotonCargada solicitudId={s.id} />
        </div>
      )}

      <h2 className="font-display mt-7 mb-2.5 text-[22px] font-semibold">Vehículo y valor</h2>
      <FormularioValor
        solicitudId={s.id}
        modelos={modelos}
        plazos={conf?.plazosMeses ?? [12, 24, 36, 48, 60, 72, 84]}
        pendiente={s.estado === "pendiente_valor"}
        valores={{ modeloId: s.modeloId ?? undefined, valorVehiculo: s.valorVehiculo, cuotaInicial: s.cuotaInicial, plazoMeses: s.plazoMeses, lineaInteres: s.lineaInteres }}
      />

      <h2 className="font-display mt-7 mb-2.5 text-[22px] font-semibold">Estado</h2>
      <FormularioEstado solicitudId={s.id} estadoActual={s.estado} financiera={s.financiera} sugerenciasFinanciera={FINANCIERAS} />

      <h2 className="font-display mt-7 mb-0.5 text-[22px] font-semibold">Datos del cliente</h2>
      <Seccion titulo="Personales y contacto" abierta>
        <Dato k={s.tipoIdentificacion === "cc" ? "Cédula" : "Cédula de extranjería"} v={Number(s.numeroIdentificacion).toLocaleString("es-CO")} />
        <Dato k="Celular" v={<Tel n={s.celular} />} />
        <Dato k="Teléfono fijo" v={<Tel n={s.telefonoFijo} />} />
        <Dato k="Correo" v={s.correo} />
        <Dato k="Dirección" v={`${s.direccion}, ${s.barrio}, ${s.ciudad} (estrato ${s.estrato})`} />
        <Dato k="Vivienda" v={`${OPCIONES.tipoVivienda[s.tipoVivienda]}, ${s.tiempoVivienda}`} />
        {s.tipoVivienda === "arrendada" && <Dato k="Arrendador" v={<>{s.arrendadorNombre}, <Tel n={s.arrendadorTelefono} />, {plata(s.valorArriendo)}</>} />}
        <Dato k="Estado civil" v={OPCIONES.estadoCivil[s.estadoCivil]} />
        <Dato k="Personas a cargo" v={s.personasACargo} />
        <Dato k="Ocupación" v={s.profesion} />
      </Seccion>
      <Seccion titulo="Actividad y finanzas">
        <Dato k="Actividad" v={OPCIONES.actividad[s.actividad]} />
        <Dato k="Empresa o negocio" v={s.empresa} />
        <Dato k="Cargo" v={s.cargo} />
        <Dato k="Contrato" v={s.tipoContrato && OPCIONES.tipoContrato[s.tipoContrato]} />
        <Dato k="Antigüedad" v={s.antiguedad} />
        <Dato k="Ingresos" v={plata(s.ingresosMensuales)} />
        <Dato k="Gastos" v={plata(s.egresosMensuales)} />
        <Dato k="Capacidad mensual" v={<b>{plata(s.ingresosMensuales - s.egresosMensuales)}</b>} />
        <Dato k="Declara renta" v={s.declaraRenta ? "Sí" : "No"} />
        <Dato k="Moneda extranjera" v={s.monedaExtranjera ? "Sí" : "No"} />
        {s.inmuebles.map((i) => (
          <Dato key={i.id} k="Inmueble" v={`${OPCIONES.claseInmueble[i.clase]} en ${i.ciudad}, ${plata(i.valor)}`} />
        ))}
        {s.vehiculos.map((v) => (
          <Dato key={v.id} k="Vehículo" v={`${v.marca} ${v.placa}${v.valor ? `, ${plata(v.valor)}` : ""}`} />
        ))}
      </Seccion>
      <Seccion titulo="Referencias">
        <Dato k="Familiar" v={ref("familiar") && <>{ref("familiar")!.nombre} ({ref("familiar")!.parentesco})<br /><Tel n={ref("familiar")!.celular} /></>} />
        <Dato k="Personal" v={ref("personal") && <>{ref("personal")!.nombre}<br /><Tel n={ref("personal")!.celular} /></>} />
        <Dato k="Comercial" v={ref("comercial") && <>{ref("comercial")!.nombre}<br /><Tel n={ref("comercial")!.celular} /></>} />
      </Seccion>
      {s.conyuge && (
        <Seccion titulo="Cónyuge">
          <Dato k="Nombre" v={[s.conyuge.nombres, s.conyuge.primerApellido, s.conyuge.segundoApellido].filter(Boolean).join(" ")} />
          <Dato k="Documento" v={Number(s.conyuge.numeroIdentificacion).toLocaleString("es-CO")} />
          <Dato k="Celular" v={<Tel n={s.conyuge.celular} />} />
          <Dato k="Actividad" v={s.conyuge.actividad && OPCIONES.actividad[s.conyuge.actividad]} />
          <Dato k="Empresa" v={s.conyuge.empresa} />
          <Dato k="Ingreso" v={plata(s.conyuge.ingresoMensual)} />
        </Seccion>
      )}

      <h2 className="font-display mt-7 mb-2.5 text-[22px] font-semibold">Notas</h2>
      <div className="rounded-xl border border-linea bg-superficie p-4">
        <FormularioNota solicitudId={s.id} />
        {notas.length > 0 && (
          <ul className="mt-4">
            {notas.map((n) => (
              <li key={n.id} className="relative border-l-2 border-linea py-2 pl-4 text-[15px] before:absolute before:top-3.5 before:-left-[6px] before:size-2.5 before:rounded-full before:bg-azul">
                {n.texto}
                <small className="block text-[13px] text-texto-2">{fechaCorta(n.creadoEn)}, {haceCuanto(n.creadoEn)}</small>
              </li>
            ))}
          </ul>
        )}
      </div>

      <h2 className="font-display mt-7 mb-2.5 text-[22px] font-semibold">Historial</h2>
      <ul>
        {historial.map((h) => (
          <li key={h.id} className="relative border-l-2 border-linea py-2 pl-4 text-[15px] before:absolute before:top-3.5 before:-left-[6px] before:size-2.5 before:rounded-full before:bg-azul">
            {h.descripcion}
            <small className="block text-[13px] text-texto-2">{fechaCorta(h.creadoEn)}, {haceCuanto(h.creadoEn)}</small>
          </li>
        ))}
      </ul>
    </>
  );
}
