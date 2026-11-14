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

## Modelos, versiones y precios

Cada modelo tiene un **precio base** fijo (el "Desde" del catálogo) y varias **versiones**
(ej: Jimny 5P GLX mecánica). Cada versión tiene dos precios, igual que la lista de Suzuki:

- **Precio base** = "Precio Referencia" (antes del bono de marca). Cambia poco; se edita en
  Catálogo → (modelo) → Versiones.
- **Precio de hoy** = "Precio Venta Público". Tiene historial y se actualiza en Panel → Precios.
  La diferencia se muestra como *bono de marca* en el catálogo.

Una versión con historial de precios no se puede borrar: se oculta, para no perder ese historial.

**Qué ve el cliente:** el precio del modelo es el de su **versión de entrada** (la más económica con
precio); en la ficha aparece primero esa versión y las demás quedan en "Ver las otras versiones".
Cada versión muestra su precio de hoy (con el de lista tachado y el bono, si lo hay); si no tiene
precio de hoy vigente, muestra su precio base marcado como "precio de lista". El "Desde" del modelo
solo se usa si ninguna versión tiene precio. Nada de esto se ve si el modelo tiene apagado
**Mostrar precios en el catálogo** (Catálogo → modelo → Datos del modelo, o Panel → Precios).

**Colores:** cada modelo tiene su lista de colores (Catálogo → modelo → Colores), con nombre y tono,
en el orden en que se muestran. Sin fotos, la ilustración de la ficha se pinta con esos colores;
con fotos, aparecen como "Colores disponibles" debajo de la galería. Las tarjetas muestran puntos.
En cada solicitud, Natalia elige **modelo y versión**; el PDF muestra ambos en el campo "Línea".

## Lista de precios de Suzuki en Excel

En **Panel → Precios**, Natalia sube el `.xlsx` que manda Suzuki cada mes. No usa IA: el código lee
las columnas "Modelo", "Precio Referencia" y "Precio Venta Público" de cada hoja, la vigencia
("vigente hasta el 30 de noviembre") y la marca "Nuevo precio". La estrategia de ventas (bonos y
obsequios) **no** se carga: Natalia la usa en la negociación.

1. Cada fila se empareja con una versión: primero por el texto exacto de la lista (se guarda en
   `versiones.nombre_lista`), luego por línea, nombre y transmisión. Lo que no existe se propone
   como versión nueva, o como **modelo nuevo**, que nace oculto hasta tener fotos y descripción.
2. Natalia revisa la tabla (puede cambiar el destino de cualquier fila) y publica.
3. Puede ocultar del catálogo las versiones y modelos que la lista ya no trae (no se borra nada).

La **vigencia** manda sobre los días de la configuración: desde el día siguiente al "vigente hasta",
el catálogo muestra esos precios "a consultar" hasta que se suba la nueva lista. Los precios
guardados a mano siguen la regla de los días. La lectura es `src/modulos/precios/lista-excel.ts`
(funciones puras) y `leer-excel.ts`; el código del modelo de Suzuki no se usa como clave porque la
lista lo repite en versiones distintas.

## Tema claro, oscuro o del sistema

Los paneles tienen un selector de tema (cabecera en el celular, menú lateral o encabezado en el
computador). "Sistema" sigue al dispositivo y es el predeterminado. La elección se guarda en el
navegador y un script del layout raíz (`src/lib/tema.ts`) la aplica en `<html data-tema>` antes de
dibujar, para que no haya destello blanco. Todos los colores son variables en `globals.css`: hay un
bloque para claro y dos idénticos para oscuro (elegido a mano, o "sistema" con el dispositivo en
oscuro). Si cambias uno de los oscuros, cambia el otro.

## Catálogo: quién lo administra

Natalia y el administrador administran el catálogo con **las mismas pantallas**
(`src/componentes/catalogo/`): Natalia en **Panel → Catálogo** (pestañas Precios, Modelos y Galería)
y el admin en **Admin → Catálogo**. Las acciones aceptan ambos roles y la auditoría registra quién
hizo cada cambio.

- **Video:** cada modelo puede tener un video de YouTube (se pega el enlace de "Compartir"; también
  sirven los Shorts). La ficha muestra solo la miniatura y carga el reproductor al tocarla, desde
  `youtube-nocookie.com`.
- **Galería de entregas:** dos secciones, *Familia Suzuki* y *Clientes felices*. Cada foto exige
  confirmar que las personas autorizaron publicarla y, si hay menores, que sus padres o acudientes
  también; la base de datos rechaza una foto sin esa constancia. Si alguien retira su autorización,
  basta con borrar la foto.

## Compartir: de dónde llegan los clientes

Cada red tiene su enlace con `?origen=instagram` (o `facebook`, `whatsapp`, `estados`, `qr`). Al entrar
por uno a **cualquier** página pública, el proxy (`src/proxy.ts`) guarda la etiqueta en una cookie
`httpOnly` durante 30 días, y el formulario la usa aunque la persona haya pasado antes por el
catálogo o la ficha de un modelo. Si vuelve por otro enlace, cuenta el más reciente. La regla está en
`src/lib/origen.ts`.

En **Panel → Compartir**, Natalia elige a dónde lleva el enlace (catálogo, formulario o un modelo) y
tiene, por cada red, el mensaje listo, el botón para compartir y sus resultados. El código QR se
genera con la dirección de `BETTER_AUTH_URL`: **no imprimas QR hasta tener el dominio definitivo.**

## Ventas y comisiones

**Panel → Ventas** muestra, por mes, los vehículos vendidos, el total y la **comisión estimada**,
con un gráfico de los últimos 6 meses. Las ventas vienen de dos fuentes:

- **Solicitudes entregadas:** se cuentan solas, en la fecha en que Natalia las marcó como entregadas.
- **Ventas manuales:** las que no pasaron por el formulario; Natalia las registra en la misma pantalla.

La comisión se configura en **Admin → Configuración**: el valor por cada millón (5.000 por defecto,
es decir 0,5 %) y la forma de contar (proporcional o solo millones completos). Se calcula con la
configuración vigente, así que si cambia, los meses anteriores también se recalculan: es una
estimación, no la liquidación de Fersautos. La regla está en `src/modulos/ventas/comision.ts`.

## Descripciones del catálogo con IA

En el editor de cada modelo, **Sugerir con IA** pide a **Google Gemini (plan gratuito)** tres
descripciones de máximo 140 caracteres con los datos del formulario y las versiones del modelo.
Natalia elige una, la ajusta si quiere y guarda: nada se publica solo.

1. Entra a <https://aistudio.google.com/apikey> con una cuenta de Google y crea una llave (no pide tarjeta).
2. En `.env`: `GEMINI_API_KEY=...` (opcional: `IA_MODELO`, `IA_USOS_MES`, por defecto 200 al mes).

La IA tiene prohibido inventar cifras o equipamiento y mencionar precios o promociones. Sin llave,
el botón muestra un aviso y todo lo demás funciona igual. Google puede usar las peticiones del plan
gratuito para mejorar sus productos: solo se le envían datos del vehículo, nunca de clientes.

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
