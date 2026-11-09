/** Barra de progreso con forma de carretera: el carro avanza con cada paso. */
export function Carretera({ paso, total, nombre }: { paso: number; total: number; nombre: string }) {
  const avance = total > 1 ? paso / (total - 1) : 0;
  return (
    <div className="mt-3.5 mb-1">
      <div className="mb-2 flex justify-between text-sm text-texto-2">
        <span>
          Paso {paso + 1} de {total}
        </span>
        <strong className="font-semibold text-texto">{nombre}</strong>
      </div>
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={paso + 1}
        aria-valuetext={`Paso ${paso + 1} de ${total}: ${nombre}`}
        className="relative h-[30px] overflow-hidden rounded-full bg-asfalto"
      >
        <div className="absolute inset-x-3.5 top-[14px] h-0.5 bg-[repeating-linear-gradient(90deg,var(--marca-via)_0_14px,transparent_14px_26px)] opacity-75" />
        <div className="absolute inset-x-3.5 inset-y-0 flex items-center justify-between">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`size-1.5 rounded-full ${i <= paso ? "bg-white" : "bg-[#6b7585]"}`} />
          ))}
        </div>
        <svg
          viewBox="0 0 44 24"
          aria-hidden
          className="absolute top-[3px] h-6 w-11 transition-[left] duration-500 ease-out motion-reduce:transition-none"
          style={{ left: `calc(4px + (100% - 52px) * ${avance})` }}
        >
          <path d="M4 17 L6 11.5 Q8 8 13 8 L26 8 Q30 8 33 11 L39 13 Q41 14 41 16 L41 18 L4 18 Z" fill="#fff" />
          <path d="M14 10 L25 10 Q28 10 30 12.5 L14 12.5 Z" fill="#9db7e3" />
          <circle cx="12" cy="18.5" r="3.4" fill="#1a2330" stroke="#fff" strokeWidth="1.4" />
          <circle cx="33" cy="18.5" r="3.4" fill="#1a2330" stroke="#fff" strokeWidth="1.4" />
        </svg>
      </div>
    </div>
  );
}
