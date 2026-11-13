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

Para entrar a los paneles necesitas cuentas (ver **Cuentas** más abajo).

El formulario de crédito está en <http://localhost:3000/credito>. Prueba también
<http://localhost:3000/credito?origen=instagram&linea=Swift>: registra de qué red llegó el
cliente y preselecciona el modelo. Las fotos y firmas se guardan en la carpeta `almacenamiento/`
(ignorada por Git).

Abre <http://localhost:3000/estado>. Debe decir **Conectada** y mostrar los datos de la asesora.

## Día a día

```bash
npm run db:up      # si Docker se reinició
npm run dev
```

## Cuentas

Nadie se puede registrar desde la página: las dos cuentas se crean por consola.
La contraseña se genera al azar y se muestra **una sola vez**.

```bash
npm run usuario:crear -- --nombre "Natalia García" --correo natalia@correo.com --rol asesora
npm run usuario:crear -- --nombre "Jair" --correo jair@correo.com --rol admin

# Asignar una contraseña nueva (cierra todas sus sesiones abiertas)
npm run usuario:crear -- --correo natalia@correo.com --nueva-clave
```

Luego entra en <http://localhost:3000/ingresar>. La asesora llega a `/panel` y el admin a `/admin`;
cada uno es redirigido si intenta entrar a la zona del otro.

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
| `npm run usuario:crear` | Crea una cuenta o le asigna contraseña nueva (ver **Cuentas**) |
| `npm run pdf:prueba -- --radicado FS-...` | Genera los PDF de una solicitud en `pdf-pruebas/` para revisarlos |
| `npm run retencion` | Borra fotos de cédula y firmas de solicitudes cerradas hace más de N días (`-- --simular` solo cuenta) |

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

## PDF del formulario F-NS-01

`plantillas/F-NS-01.pdf` es el formato oficial de Fersautos (versión 1, 5/04/2016). Es un PDF sin
campos editables, así que cada dato se estampa en coordenadas medidas sobre el original
(`src/modulos/pdf/coordenadas-fns01.ts`). Si Fersautos cambia el formato:

1. Reemplaza `plantillas/F-NS-01.pdf`.
2. Ajusta las coordenadas que cambiaron en `coordenadas-fns01.ts`.
3. Revisa el resultado con `npm run pdf:prueba -- --radicado FS-...`.

Natalia descarga los PDF desde `GET /api/solicitudes/:id/pdf?tipo=formulario|cedula`. Solo la
cuenta de asesora puede hacerlo, el formulario exige que la solicitud tenga valor del vehículo y
cada descarga queda en la auditoría con la huella SHA-256 del archivo.

## Lectura de precios con IA

En **Panel → Precios**, Natalia sube el PDF de precios que le llega y el sistema le muestra una
tabla para confirmar antes de publicar. Por defecto usa **Google Gemini, que tiene plan gratuito**:

1. Entra a <https://aistudio.google.com/apikey> con una cuenta de Google y crea una llave (no pide tarjeta).
2. En `.env`: `GEMINI_API_KEY=...`
3. Prueba con `pruebas/lista-precios-ejemplo.pdf`.

La IA solo **extrae** las filas y dice a qué modelo pertenece cada una; el precio "desde" (la versión
más económica) lo calcula el código. Los cambios mayores al 25 % llegan desmarcados. Sin llave, todo
lo demás funciona igual y la carga de PDF muestra un aviso.

El proveedor es intercambiable con `IA_PROVEEDOR` (`gemini` o `anthropic`): las instrucciones y el
esquema son los mismos, solo cambia la función que habla con cada API (`lector-ia.ts`).

Notas del plan gratuito de Gemini: tiene límites de peticiones por minuto y por día (de sobra para
una o dos listas diarias), y Google puede usar esas peticiones para mejorar sus productos. Por eso
solo se le envían listas de precios, nunca datos de clientes.

## Fotos del catálogo

El admin sube las fotos de cada modelo en **Admin → Catálogo**, y Natalia sube la suya en
**Panel → Perfil**. El navegador las comprime antes de enviarlas (para respetar el límite de 1 MB de
las Server Actions) y el servidor guarda dos tamaños en WebP (600 y 1200 px), sin metadatos EXIF.
Se sirven desde `/api/fotos/...`, que solo entrega archivos de la carpeta `publico/`: las cédulas
nunca son accesibles por esa ruta.

## Estructura

```
src/
├── app/                 # Páginas y rutas (App Router)
│   ├── api/auth/        # Endpoints de Better Auth
│   ├── ingresar/        # Inicio de sesión
│   ├── panel/           # Zona de Natalia (rol asesora): inicio, solicitudes, compartir
│   ├── admin/           # Zona del administrador: resumen, catálogo, configuración,
│   │                    #   usuarios, auditoría, sistema y datos personales
│   └── estado/          # Verificación del entorno
│   ├── credito/         # Formulario de solicitud de crédito (público)
│   └── api/solicitudes/ # Recibe el formulario: valida, guarda archivos y datos
├── validacion/          # Esquemas Zod compartidos entre navegador y servidor
├── modulos/
│   ├── solicitudes/     # Crear, consultar y acciones del panel (Server Actions)
│   └── pdf/             # F-NS-01 diligenciado, PDF de la cédula y sus coordenadas
├── lib/
│   ├── almacenamiento.ts # Guardar archivos (local en desarrollo, R2 en producción)
│   ├── limite.ts        # Límite de envíos por IP
│   ├── etiquetas.ts     # Textos de estados y orígenes
│   ├── auth.ts          # Configuración de Better Auth (servidor)
│   ├── auth-cliente.ts  # Cliente de Better Auth (navegador)
│   └── sesion.ts        # usuarioActual() y exigirRol()
├── proxy.ts             # Revisión rápida de sesión antes de /panel y /admin
├── scripts/             # Tareas de consola (crear usuarios)
├── db/
│   ├── esquema.ts       # Tablas (Drizzle)
│   ├── index.ts         # Conexión a PostgreSQL
│   ├── semilla.ts       # Datos base y de ejemplo (idempotente)
│   ├── clausula-v1.ts   # Texto de la autorización del F-NS-01
│   └── migraciones/     # SQL versionado
plantillas/F-NS-01.pdf   # Formato oficial de Fersautos
docker-compose.yml       # Servicios de apoyo (PostgreSQL)
```

## Problemas comunes

- **`port is already allocated` al hacer `db:up`:** ya tienes otro PostgreSQL en el puerto 5432. Cambia `POSTGRES_PORT=5433` en `.env` y el puerto en `DATABASE_URL`.
- **`Cannot connect to the Docker daemon` o `docker: command not found`:** abre Docker Desktop y espera a que diga *Engine running*.
- **`ECONNREFUSED` en /estado:** el contenedor no está corriendo. `npm run db:up`.
- **`password authentication failed`:** cambiaste las credenciales después de crear el volumen. Corre `npm run db:reset`.
- **`BETTER_AUTH_SECRET` no definido o errores de sesión:** agrega las variables de autenticación de `.env.example` a tu `.env`.
- **Windows:** usa Docker Desktop con el backend WSL 2 (viene así por defecto).
