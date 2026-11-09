import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Dónde se guardan los archivos (fotos de cédula, firmas, PDF).
 * El resto del sistema solo conoce esta interfaz: en desarrollo los archivos
 * van a una carpeta local y en producción irán a Cloudflare R2.
 * Cambiar de uno a otro es cambiar ALMACENAMIENTO en .env, sin tocar código.
 */
export interface Almacenamiento {
  guardar(clave: string, datos: Buffer, tipoMime: string): Promise<void>;
  leer(clave: string): Promise<Buffer>;
  borrar(clave: string): Promise<void>;
}

class AlmacenamientoLocal implements Almacenamiento {
  private raiz = path.resolve(process.cwd(), "almacenamiento");

  private ruta(clave: string) {
    const destino = path.resolve(this.raiz, clave);
    // Evita que una clave como "../../.env" escape de la carpeta
    if (!destino.startsWith(this.raiz + path.sep)) throw new Error(`Clave de archivo inválida: ${clave}`);
    return destino;
  }

  async guardar(clave: string, datos: Buffer) {
    const destino = this.ruta(clave);
    await mkdir(path.dirname(destino), { recursive: true });
    await writeFile(destino, datos);
  }

  leer(clave: string) {
    return readFile(this.ruta(clave));
  }

  async borrar(clave: string) {
    await rm(this.ruta(clave), { force: true });
  }
}

function crear(): Almacenamiento {
  const tipo = process.env.ALMACENAMIENTO ?? "local";
  if (tipo === "local") return new AlmacenamientoLocal();
  throw new Error(`ALMACENAMIENTO="${tipo}" aún no está implementado (R2 llega con el despliegue).`);
}

export const almacenamiento = crear();
