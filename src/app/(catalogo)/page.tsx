import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { datosAsesora, modelosCatalogo } from "@/modulos/catalogo/consultas";
import { Modelos, type TarjetaModelo } from "./Modelos";
import { fechaLarga, textoPromocion, TIPO_TEXTO } from "./textos";

export const metadata: Metadata = {
  title: "Estrena tu Suzuki con Natalia | Fersautos Cúcuta",
  description: "Modelos Suzuki con precios actualizados y solicitud de crédito desde el celular. Fersautos, sede Diagonal Santander, Cúcuta.",
  openGraph: { title: "Estrena tu Suzuki con Natalia", description: "Mira los modelos y solicita tu crédito desde el celular.", type: "website", locale: "es_CO" },
};

export default function Inicio() {
  return (
    <main className="mx-auto max-w-6xl px-5">
      <Suspense fallback={<p className="py-10 text-texto-2">Cargando…</p>}>
        <Contenido />
      </Suspense>
    </main>
  );
}

const CARRO_VIA = (
  <svg viewBox="0 0 44 24" aria-hidden className="absolute top-1 left-[-60px] h-[26px] w-[50px] motion-safe:animate-[rodar_1.8s_cubic-bezier(.3,.1,.2,1)_.3s_forwards] motion-reduce:left-[calc(50%-25px)]">
    <path d="M4 17 L6 11.5 Q8 8 13 8 L26 8 Q30 8 33 11 L39 13 Q41 14 41 16 L41 18 L4 18 Z" fill="#fff" />
    <path d="M14 10 L25 10 Q28 10 30 12.5 L14 12.5 Z" fill="#9db7e3" />
    <circle cx="12" cy="18.5" r="3.4" fill="#1a2330" stroke="#fff" strokeWidth="1.4" />
    <circle cx="33" cy="18.5" r="3.4" fill="#1a2330" stroke="#fff" strokeWidth="1.4" />
  </svg>
);

async function Contenido() {
  await connection();
  const [asesora, modelos] = await Promise.all([datosAsesora(), modelosCatalogo()]);
  if (!asesora) return <p className="py-10 text-senal">El catálogo aún no está configurado.</p>;

  const tarjetas: TarjetaModelo[] = modelos.map((m) => ({
    slug: m.slug,
    linea: m.linea,
    tipo: m.tipo,
    tipoTexto: TIPO_TEXTO[m.tipo],
    puestos: m.puestos,
    precio: m.precio,
    actualizado: m.actualizado ? fechaLarga(m.actualizado) : null,
    promocion: m.promocion ? textoPromocion(m.promocion) : null,
  }));
  const iniciales = asesora.nombre.split(" ").map((p) => p[0]).slice(0, 2).join("");

  return (
    <>
      <section className="grid items-center gap-6 pt-4 pb-2 md:grid-cols-[1.3fr_1fr] md:gap-9">
        <div>
          <h1 className="font-display text-[clamp(44px,9vw,84px)] leading-[.92] font-extrabold tracking-tight text-balance">
            Estrena tu Suzuki con {asesora.primerNombre}
          </h1>
          <p className="mt-4.5 mb-5.5 max-w-[46ch] text-[19px] text-texto-2">
            Escoge tu carro, solicita el crédito desde el celular y yo te acompaño hasta el día de la entrega.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/credito?origen=catalogo" className="flex min-h-12 items-center rounded-xl bg-azul px-5 font-semibold text-white hover:bg-azul-hover">
              Solicitar mi crédito
            </Link>
            <a href="#modelos" className="flex min-h-12 items-center rounded-xl border border-linea-2 bg-superficie px-5 font-semibold">
              Ver modelos
            </a>
          </div>
        </div>
        <aside aria-label="Tu asesora" className="rounded-[18px] border border-linea bg-superficie p-5.5">
          <div className="relative grid aspect-[4/3.2] place-items-center overflow-hidden rounded-xl bg-cielo">
            <span aria-hidden className="font-display text-[88px] font-extrabold text-azul-texto">{iniciales}</span>
          </div>
          <h2 className="font-display mt-4 text-[26px] leading-tight font-bold">{asesora.nombre}</h2>
          <p className="text-[15px] text-texto-2">Asesora comercial Suzuki en Fersautos</p>
          <blockquote className="mt-3.5 text-[17px]">“{asesora.frase}”</blockquote>
          <p className="mt-3.5 flex gap-2 border-t border-linea pt-3.5 text-[15px] text-texto-2">
            <svg viewBox="0 0 24 24" aria-hidden className="mt-0.5 size-[18px] flex-none fill-none stroke-current stroke-[1.8]">
              <path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            Fersautos, sede {asesora.sede}, {asesora.ciudad}
          </p>
        </aside>
      </section>

      <div aria-hidden className="relative mt-8 h-[34px] overflow-hidden rounded-full bg-asfalto">
        <div className="absolute inset-x-4 top-4 h-0.5 bg-[repeating-linear-gradient(90deg,var(--marca-via)_0_16px,transparent_16px_30px)] opacity-75" />
        {CARRO_VIA}
      </div>

      <div id="modelos" className="mt-10 scroll-mt-4">
        <h2 className="font-display text-4xl leading-none font-bold">Modelos disponibles</h2>
        <p className="mt-1.5 text-texto-2">Precios actualizados por {asesora.primerNombre}. Si no ves el precio, escríbeme y te cotizo al día.</p>
      </div>
      <Modelos modelos={tarjetas} />

      <h2 className="font-display mt-12 text-4xl leading-none font-bold">Así funciona el crédito</h2>
      <p className="mt-1.5 text-texto-2">Sin filas y sin papeleo en el concesionario.</p>
      <ol className="mt-4 grid gap-4 md:grid-cols-3">
        {[
          ["Llenas la solicitud", "Desde el celular, en unos 8 minutos, con foto de tu cédula y tu firma."],
          ["Yo reviso y la radico", "Confirmo el valor de tu carro y envío tu solicitud a estudio de crédito."],
          ["Te aviso la respuesta", "Te contacto apenas la entidad financiera responda y coordinamos la entrega."],
        ].map(([titulo, texto], i) => (
          <li key={titulo} className="rounded-2xl border border-linea bg-superficie p-4.5">
            <span className="font-display block text-[40px] leading-none font-extrabold text-azul-texto">{i + 1}</span>
            <strong className="font-display mt-2 block text-xl">{titulo}</strong>
            <span className="text-[15px] text-texto-2">{texto}</span>
          </li>
        ))}
      </ol>
    </>
  );
}
