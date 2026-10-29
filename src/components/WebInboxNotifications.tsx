import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getMyNotifications, type NotificationItem } from "@/lib/api/notifications.functions";

const SEEN_KEY_PREFIX = "samething:web-inbox-notifications:";
const MAX_LOCAL_IDS = 240;
const POLL_INTERVAL_MS = 20_000;

export function getWebNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/** Permission is intentionally requested only from an explicit user gesture. */
export async function requestWebNotificationPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.requestPermission();
}

export function WebInboxNotifications() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const { data } = useQuery({
    queryKey: ["web-inbox-notifications", userId],
    queryFn: async () => await getMyNotifications(),
    enabled: Boolean(userId),
    refetchInterval: userId ? POLL_INTERVAL_MS : false,
    refetchIntervalInBackground: true,
    staleTime: 5_000,
  });

  useEffect(() => {
    if (!userId || !data) return;
    if (typeof window === "undefined") return;

    const storageKey = `${SEEN_KEY_PREFIX}${userId}`;
    const currentIds = data.items.map((item) => item.id);
    const previous = readIds(storageKey);

    // The first fetch establishes a baseline and never turns Inbox history into alerts.
    if (!previous) {
      writeIds(storageKey, currentIds);
      return;
    }

    const nextIds = new Set([...previous, ...currentIds]);
    writeIds(storageKey, Array.from(nextIds));
    if (data.silent) return;

    const silentOffAt = data.silentOffAt ? new Date(data.silentOffAt).getTime() : 0;
    const fresh = data.items.filter(
      (item) => !previous.has(item.id) && new Date(item.created_at).getTime() > silentOffAt,
    );
    if (!fresh.length) return;

    if (getWebNotificationPermission() !== "granted") return;
    void Promise.all(fresh.map(showInboxNotification));
  }, [data, userId]);

  return null;
}

function readIds(storageKey: string): Set<string> | null {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return new Set(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return null;
  }
}

function writeIds(storageKey: string, ids: string[]) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(ids.slice(-MAX_LOCAL_IDS)));
  } catch {
    // Storage can be disabled in private browsing; the Inbox remains usable without dedupe.
  }
}

async function showInboxNotification(item: NotificationItem) {
  const payload = {
    title: notificationTitle(item),
    body: notificationBody(item),
    url: item.link || `/thing/${item.thing_id}`,
    icon: "/pwa-icon-192.png",
    badge: "/pwa-icon-192.png",
    tag: `samething-inbox-${item.id}`,
  };

  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration.active) {
        registration.active.postMessage({ type: "SHOW_INBOX_NOTIFICATION", payload });
        return;
      }
    }
  } catch {
    // Fall back to the browser notification API below.
  }

  if (getWebNotificationPermission() === "granted") {
    const notification = new Notification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag,
    });
    notification.onclick = () => {
      window.focus();
      window.location.assign(payload.url);
      notification.close();
    };
  }
}

function notificationTitle(item: NotificationItem) {
  if (item.kind === "same") return "Someone said Same";
  if (item.kind === "nah") return "Someone said Nah";
  if (item.kind === "comment") return "New comment on your Thing";
  if (item.kind === "like") return "New Like on your Thing";
  if (item.kind === "quote_comment") return "New comment on your Quote";
  if (item.kind === "quote_like") return "New Like on your Quote";
  if (item.kind === "mention") return "You were mentioned";
  if (item.kind === "follow") return "Someone you watch dropped something new";
  return item.thing_title.replace(/^\[System\]\s*/, "") || "SameThing. update";
}

function notificationBody(item: NotificationItem) {
  const title = item.thing_title.replace(/^\[System\]\s*/, "");
  const preview = item.preview?.trim();
  if (preview) return `${title} · “${preview}”`;
  return title;
}
