import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { getAdminSession } from "@/lib/admin-session.server";
import {
  isMaintenanceExemptPath,
  readMaintenanceStatus,
  renderMaintenancePage,
} from "@/lib/maintenance.server";

const maintenanceFunctionAllowlist = new Set([
  "getMaintenanceStatus",
  "adminStatus",
  "adminLogin",
  "adminLogout",
  "adminGetMaintenanceStatus",
  "adminSetMaintenanceMode",
]);

const maintenanceMiddleware = createMiddleware({ type: "request" }).server(
  async ({ request, pathname, handlerType, serverFnMeta, next }) => {
    if (isMaintenanceExemptPath(pathname)) return next();

    const hasAdminCookie = request.headers.get("cookie")?.includes("st-admin=") ?? false;
    if (hasAdminCookie) {
      try {
        const adminSession = await getAdminSession();
        if (
          adminSession.data.unlocked &&
          adminSession.data.mode === "breakglass" &&
          adminSession.data.username === "jeonwx_0"
        )
          return next();
      } catch {
        // An invalid or expired admin cookie must not bypass maintenance mode.
      }
    }

    const status = await readMaintenanceStatus();
    if (!status.enabled) return next();

    if (handlerType === "serverFn") {
      if (serverFnMeta?.name && maintenanceFunctionAllowlist.has(serverFnMeta.name)) {
        return next();
      }
      return new Response(
        JSON.stringify({
          error: "maintenance",
          message: "SameThing. is temporarily in maintenance mode.",
        }),
        {
          status: 503,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
          },
        },
      );
    }

    return new Response(renderMaintenancePage(status.note), {
      status: 503,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  },
);

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [maintenanceMiddleware, errorMiddleware],
}));
