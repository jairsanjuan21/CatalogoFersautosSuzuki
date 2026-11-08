import Link from "next/link";

export default function Inicio() {
  return (
    <main className="mx-auto max-w-2xl p-8 font-sans">
      <h1 className="font-display text-5xl font-bold">Catálogo Fersautos Suzuki</h1>
      <p className="mt-3 text-texto-2">Entorno de desarrollo listo. Aquí irá el catálogo.</p>
      <Link href="/estado" className="mt-6 inline-block text-azul-texto underline">
        Ver estado del entorno
      </Link>
    </main>
  );
}
