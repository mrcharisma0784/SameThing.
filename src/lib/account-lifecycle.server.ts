/* eslint-disable @typescript-eslint/no-explicit-any -- lifecycle tables are added by the account migration and may precede generated types. */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const ACCOUNT_DELETION_DAYS = 30;
export const EXPORT_COOLDOWN_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function isoAfterDays(days: number) {
  return new Date(Date.now() + days * DAY_MS).toISOString();
}

export function daysRemaining(value: string | null | undefined) {
  if (!value) return 0;
  return Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / DAY_MS));
}

export async function requestDeletion(userId: string) {
  const db = supabaseAdmin as any;
  const now = new Date();
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("deletion_scheduled_for, deletion_cancelled_until")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (profile?.deletion_scheduled_for) {
    return { ok: false as const, error: "This account is already scheduled for deletion." };
  }
  if (
    profile?.deletion_cancelled_until &&
    new Date(profile.deletion_cancelled_until).getTime() > now.getTime()
  ) {
    const days = daysRemaining(profile.deletion_cancelled_until);
    return {
      ok: false as const,
      error: `Deletion cannot be requested for another ${days} day${days === 1 ? "" : "s"}.`,
    };
  }
  const scheduledFor = isoAfterDays(ACCOUNT_DELETION_DAYS);
  const { data: request, error } = await db
    .from("account_data_requests")
    .insert({
      user_id: userId,
      request_type: "deletion",
      status: "scheduled",
      scheduled_for: scheduledFor,
      requested_at: now.toISOString(),
    })
    .select("id, request_type, status, requested_at, scheduled_for")
    .single();
  if (error) return { ok: false as const, error: error.message };
  const { error: updateError } = await db
    .from("profiles")
    .update({ deletion_scheduled_for: scheduledFor })
    .eq("id", userId);
  if (updateError) return { ok: false as const, error: updateError.message };
  return { ok: true as const, request };
}

export async function cancelDeletion(userId: string) {
  const db = supabaseAdmin as any;
  const cooldownUntil = isoAfterDays(EXPORT_COOLDOWN_DAYS);
  const { error: profileError } = await db
    .from("profiles")
    .update({ deletion_scheduled_for: null, deletion_cancelled_until: cooldownUntil })
    .eq("id", userId);
  if (profileError) return { ok: false as const, error: profileError.message };
  const { error } = await db
    .from("account_data_requests")
    .update({
      status: "cancelled",
      handled_at: new Date().toISOString(),
      admin_note: "Cancelled by user.",
    })
    .eq("user_id", userId)
    .eq("request_type", "deletion")
    .in("status", ["pending", "scheduled", "in_progress"]);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, cooldownUntil };
}

async function readRows(db: any, table: string, column: string, userId: string) {
  const { data, error } = await db.from(table).select("*").eq(column, userId).limit(5000);
  if (error) {
    console.warn(`account export skipped ${table}: ${error.message}`);
    return [];
  }
  return data ?? [];
}

async function buildExport(userId: string) {
  const db = supabaseAdmin as any;
  const { data: authData } = await db.auth.admin.getUserById(userId);
  const [profile, things, quotes, comments, votes, followsOut, followsIn, feedback, mentions] =
    await Promise.all([
      readRows(db, "profiles", "id", userId),
      readRows(db, "things", "user_id", userId),
      readRows(db, "quotes", "user_id", userId),
      readRows(db, "comments", "user_id", userId),
      readRows(db, "votes", "user_id", userId),
      readRows(db, "follows", "follower_id", userId),
      readRows(db, "follows", "following_id", userId),
      readRows(db, "feedback", "user_id", userId),
      readRows(db, "mentions", "author_user_id", userId),
    ]);
  return {
    exported_at: new Date().toISOString(),
    account: { id: userId, email: authData?.user?.email ?? null },
    data: {
      profile,
      things,
      quotes,
      comments,
      votes,
      follows_out: followsOut,
      follows_in: followsIn,
      feedback,
      mentions,
    },
  };
}

async function sendExportEmail(to: string, payload: unknown) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.DATA_EXPORT_FROM_EMAIL;
  if (!apiKey || !from) return { sent: false, reason: "Email delivery is not configured." };
  const attachment = Buffer.from(JSON.stringify(payload, null, 2), "utf8").toString("base64");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Your SameThing. data export",
      text: "Your requested SameThing. data export is attached as a JSON file.",
      attachments: [{ filename: "samething-data-export.json", content: attachment }],
    }),
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}.`);
  return { sent: true };
}

export async function processPendingExports(limit = 10) {
  const db = supabaseAdmin as any;
  const { data: requests, error } = await db
    .from("account_data_requests")
    .select("id, user_id")
    .eq("request_type", "export")
    .eq("status", "pending")
    .order("requested_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  let sent = 0;
  for (const request of requests ?? []) {
    const { data: userData } = await db.auth.admin.getUserById(request.user_id);
    const email = userData?.user?.email;
    if (!email) continue;
    const payload = await buildExport(request.user_id);
    try {
      const result = await sendExportEmail(email, payload);
      if (!result.sent) {
        await db
          .from("account_data_requests")
          .update({ admin_note: result.reason })
          .eq("id", request.id);
        continue;
      }
      await db
        .from("account_data_requests")
        .update({
          status: "completed",
          handled_at: new Date().toISOString(),
          email_sent_at: new Date().toISOString(),
        })
        .eq("id", request.id);
      sent += 1;
    } catch (error) {
      await db
        .from("account_data_requests")
        .update({ admin_note: error instanceof Error ? error.message : "Email delivery failed." })
        .eq("id", request.id);
    }
  }
  return sent;
}

async function deleteUserData(userId: string) {
  const db = supabaseAdmin as any;
  const operations: Array<[string, string]> = [
    ["mentions", "author_user_id"],
    ["comments", "user_id"],
    ["votes", "user_id"],
    ["quotes", "user_id"],
    ["things", "user_id"],
    ["follows", "follower_id"],
    ["follows", "following_id"],
    ["feedback_prompt_responses", "user_id"],
    ["feedback", "user_id"],
    ["system_messages", "recipient_id"],
    ["api_keys", "user_id"],
    ["user_roles", "user_id"],
  ];
  for (const [table, column] of operations) {
    const { error } = await db.from(table).delete().eq(column, userId);
    if (error && !/does not exist|relation/i.test(error.message)) {
      throw new Error(`${table} deletion failed: ${error.message}`);
    }
  }
  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) throw new Error(`Auth deletion failed: ${error.message}`);
}

export async function processDueDeletions(limit = 10) {
  const db = supabaseAdmin as any;
  const { data: requests, error } = await db
    .from("account_data_requests")
    .select("id, user_id, requested_at, scheduled_for")
    .eq("request_type", "deletion")
    .eq("status", "scheduled")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  let deleted = 0;
  for (const request of requests ?? []) {
    const { data: userData } = await db.auth.admin.getUserById(request.user_id);
    if (!userData?.user) continue;
    const lastLogin = userData.user.last_sign_in_at
      ? new Date(userData.user.last_sign_in_at).getTime()
      : 0;
    const requestedAt = new Date(request.requested_at).getTime();
    if (lastLogin > requestedAt) {
      await cancelDeletion(request.user_id);
      continue;
    }
    await db
      .from("account_data_requests")
      .update({
        status: "completed",
        handled_at: new Date().toISOString(),
        admin_note: "Deleted after 30 days without a new login.",
      })
      .eq("id", request.id);
    await deleteUserData(request.user_id);
    deleted += 1;
  }
  return deleted;
}
