# Catálogo Fersautos Suzuki

Sistema web para Natalia García, asesora comercial Suzuki en Fersautos (sede Diagonal Santander, Cúcuta):
catálogo público, formulario de solicitud de crédito, panel de la asesora y panel de administración.

**Stack:** Next.js 16 · TypeScript · Tailwind CSS 4 · PostgreSQL 17 · Drizzle ORM · Docker

## Requisitos

- [Node.js 22 LTS](https://nodejs.org) (verifica con `node -v`)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) abierto y corriendo
- Git

## Arrancar el entorno local (primera vez)

```bash
npm install                  # 1. Instala dependencias
cp .env.example .env         # 2. Crea tu archivo de variables (en Windows CMD: copy .env.example .env)
npm run db:up                # 3. Levanta PostgreSQL en Docker y espera a que esté listo
npm run db:migrate           # 4. Crea las tablas
npm run db:seed              # 5. Carga la configuración inicial
npm run dev                  # 6. Inicia la app
```

Abre <http://localhost:3000/estado>. Debe decir **Conectada** y mostrar los datos de la asesora.

## Día a día

```bash
npm run db:up      # si Docker se reinició
npm run dev
```

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga automática |
| `npm run build` | Compila para producción |
| `npm run typecheck` | Revisa tipos de TypeScript |
| `npm run lint` | Revisa estilo y errores comunes |
| `npm run db:up` / `db:down` | Enciende / apaga PostgreSQL (los datos se conservan) |
| `npm run db:logs` | Muestra los registros de PostgreSQL |
| `npm run db:generate` | Crea una migración después de cambiar `src/db/esquema.ts` |
| `npm run db:migrate` | Aplica las migraciones pendientes |
| `npm run db:studio` | Abre Drizzle Studio para ver y editar datos en el navegador |
| `npm run db:seed` | Carga datos iniciales (se puede correr varias veces) |
| `npm run db:reset` | **Borra la base de datos local** y la recrea desde cero |

## Flujo para cambiar la base de datos

1. Edita `src/db/esquema.ts`
2. `npm run db:generate -- --name descripcion_del_cambio`
3. Revisa el SQL generado en `src/db/migraciones/`
4. `npm run db:migrate`
5. Sube a Git el esquema **y** la migración

Nunca edites a mano una migración que ya está en `main`.

### Reglas que viven en la base de datos

Algunas cosas no se pueden expresar en `esquema.ts` (triggers, vistas). Para eso se crea una
migración vacía y se escribe el SQL a mano:

```bash
npm run db:generate -- --custom --name descripcion
```

La migración `0002_reglas_y_vistas.sql` es un ejemplo: hace que la tabla `auditoria` sea de
solo inserción y crea la vista `precios_vigentes`.

## Estructura

```
src/
├── app/                 # Páginas y rutas (App Router)
│   └── estado/          # Verificación del entorno
├── db/
│   ├── esquema.ts       # Tablas (Drizzle)
│   ├── index.ts         # Conexión a PostgreSQL
│   ├── semilla.ts       # Datos base y de ejemplo (idempotente)
│   ├── clausula-v1.ts   # Texto de la autorización del F-NS-01
│   └── migraciones/     # SQL versionado
docker-compose.yml       # Servicios de apoyo (PostgreSQL)
```

## Problemas comunes

- **`port is already allocated` al hacer `db:up`:** ya tienes otro PostgreSQL en el puerto 5432. Cambia `POSTGRES_PORT=5433` en `.env` y el puerto en `DATABASE_URL`.
- **`Cannot connect to the Docker daemon` o `docker: command not found`:** abre Docker Desktop y espera a que diga *Engine running*.
- **`ECONNREFUSED` en /estado:** el contenedor no está corriendo. `npm run db:up`.
- **`password authentication failed`:** cambiaste las credenciales después de crear el volumen. Corre `npm run db:reset`.
- **Windows:** usa Docker Desktop con el backend WSL 2 (viene así por defecto).
