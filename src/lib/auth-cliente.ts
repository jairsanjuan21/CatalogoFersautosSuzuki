import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

// Cliente para usar desde componentes del navegador ("use client").
export const authCliente = createAuthClient({ plugins: [adminClient()] });
