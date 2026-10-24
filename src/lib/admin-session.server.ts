/* eslint-disable react-hooks/rules-of-hooks -- TanStack Start's server session helper is intentionally called from a server utility. */
// Admin panel session — shared-password gate, separate from user auth.
import { useSession } from "@tanstack/react-start/server";

export type AdminSession = {
  unlocked?: boolean;
  at?: number;
  actor_user_id?: string;
  username?: string;
  permissions?: string[];
  mode?: "account" | "breakglass";
};

export async function getAdminSession() {
  return useSession<AdminSession>({
    password: process.env.ADMIN_SESSION_SECRET!,
    name: "st-admin",
    maxAge: 60 * 60 * 8, // 8 hours
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  });
}

export async function requireAdminUnlocked() {
  const s = await getAdminSession();
  if (!s.data.unlocked) throw new Error("Admin locked");
  return s;
}
