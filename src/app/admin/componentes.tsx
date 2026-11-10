export function Titulo({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <>
      <h1 className="font-display mt-6 text-[32px] leading-tight font-bold">{children}</h1>
      {sub && <p className="text-texto-2">{sub}</p>}
    </>
  );
}

export function Proximamente({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <>
      <Titulo>{titulo}</Titulo>
      <p className="mt-6 rounded-xl border border-linea bg-superficie p-4 text-texto-2">{texto}</p>
    </>
  );
}

export function Alerta({ tono, children }: { tono: "ambar" | "rojo" | "ok"; children: React.ReactNode }) {
  const color = { ambar: "bg-ambar-fondo text-ambar", rojo: "bg-senal-fondo text-senal", ok: "bg-ok-fondo text-ok" }[tono];
  return <div className={`mt-2.5 rounded-lg px-3.5 py-2.5 text-[15px] ${color}`}>{children}</div>;
}
