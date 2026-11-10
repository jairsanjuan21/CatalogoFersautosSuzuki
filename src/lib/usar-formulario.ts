"use client";

import { startTransition, useActionState, useRef, type FormEvent } from "react";

/**
 * Conecta un <form> con una Server Action y SOLO lo limpia si salió bien.
 *
 * En React 19, <form action={...}> se reinicia siempre al terminar, incluso
 * cuando el servidor devuelve un error de validación: la persona perdería todo
 * lo que escribió. Este hook envía el formulario a mano y lo reinicia solo
 * cuando la respuesta tiene ok = true.
 *
 *   const f = useFormularioAccion(crearPromocion, { ok: true });
 *   <form ref={f.ref} onSubmit={f.alEnviar}> ... {f.estado.mensaje}
 */
export function useFormularioAccion<R extends { ok: boolean }>(accion: (previo: R, datos: FormData) => Promise<R>, inicial: R) {
  const ref = useRef<HTMLFormElement>(null);
  // Los tipos de useActionState trabajan con Awaited<R>; como R aquí es un objeto, son el mismo tipo
  const [estado, despachar, pendiente] = useActionState<R, FormData>(
    async (previo, datos) => {
      const r = await accion(previo as R, datos);
      if (r.ok) ref.current?.reset();
      return r;
    },
    inicial as Awaited<R>,
  );
  const alEnviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    startTransition(() => despachar(datos));
  };
  return { ref, alEnviar, estado, pendiente };
}
