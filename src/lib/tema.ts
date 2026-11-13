/**
 * TEMA DE LOS PANELES: "claro", "oscuro" o "sistema" (sigue al dispositivo).
 * Se guarda en localStorage y se aplica en <html data-tema>. Sin elección = sistema.
 */
export type Tema = "claro" | "oscuro" | "sistema";
export const CLAVE_TEMA = "fersautos-tema";

/**
 * Script en línea del layout raíz: corre ANTES de que se dibuje la página, así quien
 * eligió oscuro no ve un destello blanco al abrir. Se mantiene mínimo y sin dependencias.
 */
export const SCRIPT_TEMA = `try{var t=localStorage.getItem("${CLAVE_TEMA}");if(t==="claro"||t==="oscuro")document.documentElement.dataset.tema=t}catch(e){}`;
