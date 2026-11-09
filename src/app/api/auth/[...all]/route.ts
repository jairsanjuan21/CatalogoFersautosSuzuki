import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// Todas las rutas de Better Auth (/api/auth/sign-in/email, /api/auth/sign-out, ...)
export const { GET, POST } = toNextJsHandler(auth);
