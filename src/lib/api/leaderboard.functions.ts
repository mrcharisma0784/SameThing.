/* eslint-disable @typescript-eslint/no-explicit-any -- annual league counts include tables outside generated types. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ThingRow = {
  id: string;
  user_id: string | null;
  simplified_text: string | null;
  same_count: number | null;
  nah_count: number | null;
  total_votes: number | null;
  like_count: number | null;
  comment_count: number | null;
  created_at: string;
  is_rare_thing: boolean | null;
};

type QuoteRow = {
  id: string;
  user_id: string | null;
  text: string | null;
  like_count: number | null;
  comment_count: number | null;
  created_at: string;
};

type ActivityThingRow = {
  thing_id: string;
  vote_type?: string;
  created_at: string;
};

type ActivityQuoteRow = {
  quote_id: string;
  created_at: string;
};

type ActivityCommentRow = {
  thing_id: string | null;
  quote_id: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  username: string;
  emoji: string;
  plan: string | null;
};

type AuthorStats = {
  id: string;
  thingCount: number;
  quoteCount: number;
  followers: number;
  interactionScore: number;
};

export type LeaderboardCategory = "thing" | "quote" | "user";

export type LeaderboardEntry = {
  rank: number;
  id: string;
  category: LeaderboardCategory;
  label: string;
  username?: string;
  emoji?: string;
  plan?: string | null;
  score: number;
  scoreLabel: string;
  secondary?: string;
};

export type LeaderboardLeague = {
  id: string;
  name: string;
  category: LeaderboardCategory;
  description: string;
  metric: string;
  entries: LeaderboardEntry[];
};

export type LeaderboardResult = {
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  leagues: LeaderboardLeague[];
  season: {
    label: string;
    startsAt: string;
    endsAt: string;
    current: {
      id: string;
      name: string;
      points: number;
      nextThreshold: number | null;
      progress: number;
    };
  };
};

const LeaderboardInput = z.object({});

function getUtcWeekBounds(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = start.getUTCDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start, end };
}

function getUtcYearBounds(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1));
  return { start, end };
}

const PERSONAL_LEAGUES = [
  { id: "astra", name: "Astra", threshold: 0 },
  { id: "cosmos", name: "Cosmos", threshold: 250 },
  { id: "quelo", name: "Quelo", threshold: 750 },
];

function number(value: number | null | undefined) {
  return Number(value ?? 0);
}

function shorten(text: string | null | undefined, max = 86) {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return "Untitled signal";
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

function scoreLabel(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(
    value,
  );
}

function rankEntries(entries: LeaderboardEntry[], limit = 5) {
  return entries.slice(0, limit).map((entry, index) => ({ ...entry, rank: index + 1 }));
}

async function getProfiles(ids: string[]) {
  if (ids.length === 0) return new Map<string, ProfileRow>();
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, username, emoji, plan")
    .in("id", ids)
    .limit(500);
  if (error) {
    console.error("leaderboard profile enrichment error", error);
    return new Map<string, ProfileRow>();
  }
  return new Map(((data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));
}

export const getLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => LeaderboardInput.parse(input))
  .handler(async ({ context }): Promise<LeaderboardResult> => {
    const { start, end } = getUtcWeekBounds();
    const year = getUtcYearBounds();
    const weekStart = start.toISOString();
    const weekEnd = end.toISOString();

    const [thingsResult, quotesResult] = await Promise.all([
      supabaseAdmin
        .from("things")
        .select(
          "id, user_id, simplified_text, same_count, nah_count, total_votes, like_count, comment_count, created_at, is_rare_thing",
        )
        .gte("created_at", weekStart)
        .lt("created_at", weekEnd)
        .eq("hidden", false)
        .eq("safety_flag", false)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(500),
      supabaseAdmin
        .from("quotes")
        .select("id, user_id, text, like_count, comment_count, created_at")
        .gte("created_at", weekStart)
        .lt("created_at", weekEnd)
        .eq("hidden", false)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    if (thingsResult.error) console.error("leaderboard things error", thingsResult.error);
    if (quotesResult.error) console.error("leaderboard quotes error", quotesResult.error);

    const things = (thingsResult.data ?? []) as ThingRow[];
    const quotes = (quotesResult.data ?? []) as QuoteRow[];
    const thingIds = things.map((thing) => thing.id);
    const quoteIds = quotes.map((quote) => quote.id);
    const authorIds = Array.from(
      new Set(
        [...things.map((thing) => thing.user_id), ...quotes.map((quote) => quote.user_id)].filter(
          Boolean,
        ),
      ),
    ) as string[];

    const [profiles, sharesResult, followersResult, activityResults] = await Promise.all([
      getProfiles(authorIds),
      thingIds.length === 0
        ? Promise.resolve({ data: [], error: null })
        : supabaseAdmin
            .from("thing_shares" as never)
            .select("thing_id, created_at")
            .in("thing_id", thingIds)
            .gte("created_at", weekStart)
            .lt("created_at", weekEnd)
            .limit(5000),
      authorIds.length === 0
        ? Promise.resolve({ data: [], error: null })
        : supabaseAdmin
            .from("follows" as never)
            .select("followed_id")
            .in("followed_id", authorIds)
            .limit(5000),
      Promise.all([
        thingIds.length === 0
          ? Promise.resolve({ data: [], error: null })
          : supabaseAdmin
              .from("thing_likes")
              .select("thing_id, created_at")
              .in("thing_id", thingIds)
              .gte("created_at", weekStart)
              .lt("created_at", weekEnd)
              .limit(5000),
        thingIds.length === 0
          ? Promise.resolve({ data: [], error: null })
          : supabaseAdmin
              .from("votes")
              .select("thing_id, vote_type, created_at")
              .in("thing_id", thingIds)
              .gte("created_at", weekStart)
              .lt("created_at", weekEnd)
              .limit(5000),
        supabaseAdmin
          .from("comments")
          .select("thing_id, quote_id, created_at")
          .eq("hidden", false)
          .gte("created_at", weekStart)
          .lt("created_at", weekEnd)
          .limit(5000),
        quoteIds.length === 0
          ? Promise.resolve({ data: [], error: null })
          : supabaseAdmin
              .from("quote_likes")
              .select("quote_id, created_at")
              .in("quote_id", quoteIds)
              .gte("created_at", weekStart)
              .lt("created_at", weekEnd)
              .limit(5000),
      ]),
    ]);

    const [thingLikesResult, votesResult, commentsResult, quoteLikesResult] = activityResults;
    if (sharesResult.error) console.error("leaderboard share enrichment error", sharesResult.error);
    if (followersResult.error)
      console.error("leaderboard follower enrichment error", followersResult.error);
    if (thingLikesResult.error)
      console.error("leaderboard thing-like activity error", thingLikesResult.error);
    if (votesResult.error) console.error("leaderboard vote activity error", votesResult.error);
    if (commentsResult.error)
      console.error("leaderboard comment activity error", commentsResult.error);
    if (quoteLikesResult.error)
      console.error("leaderboard quote-like activity error", quoteLikesResult.error);

    const thingActivity = new Map<
      string,
      { likes: number; same: number; nah: number; votes: number; comments: number; shares: number }
    >();
    const ensureThingActivity = (id: string) => {
      const current = thingActivity.get(id);
      if (current) return current;
      const created = { likes: 0, same: 0, nah: 0, votes: 0, comments: 0, shares: 0 };
      thingActivity.set(id, created);
      return created;
    };
    for (const row of thingLikesResult.data ?? []) ensureThingActivity(row.thing_id).likes += 1;
    for (const row of votesResult.data ?? []) {
      const activity = ensureThingActivity(row.thing_id);
      activity.votes += 1;
      if (row.vote_type === "same") activity.same += 1;
      if (row.vote_type === "nah") activity.nah += 1;
    }
    for (const row of commentsResult.data ?? []) {
      if (row.thing_id) ensureThingActivity(row.thing_id).comments += 1;
    }
    for (const row of (sharesResult.data ?? []) as unknown as Array<{ thing_id: string }>) {
      ensureThingActivity(row.thing_id).shares += 1;
    }

    const quoteActivity = new Map<string, { likes: number; comments: number }>();
    const ensureQuoteActivity = (id: string) => {
      const current = quoteActivity.get(id);
      if (current) return current;
      const created = { likes: 0, comments: 0 };
      quoteActivity.set(id, created);
      return created;
    };
    for (const row of quoteLikesResult.data ?? []) ensureQuoteActivity(row.quote_id).likes += 1;
    for (const row of commentsResult.data ?? []) {
      if (row.quote_id) ensureQuoteActivity(row.quote_id).comments += 1;
    }

    const followerCounts = new Map<string, number>();
    for (const row of (followersResult.data ?? []) as unknown as Array<{ followed_id: string }>) {
      followerCounts.set(row.followed_id, (followerCounts.get(row.followed_id) ?? 0) + 1);
    }

    const stats = new Map<string, AuthorStats>();
    const ensureStats = (id: string) => {
      const current = stats.get(id);
      if (current) return current;
      const created: AuthorStats = {
        id,
        thingCount: 0,
        quoteCount: 0,
        followers: followerCounts.get(id) ?? 0,
        interactionScore: 0,
      };
      stats.set(id, created);
      return created;
    };

    const thingEngagement = (thing: ThingRow) => {
      const activity = thingActivity.get(thing.id);
      return (
        (activity?.likes ?? 0) * 3 +
        (activity?.same ?? 0) * 2 +
        (activity?.comments ?? 0) * 4 +
        (activity?.shares ?? 0) * 5 +
        (activity?.votes ?? 0)
      );
    };

    const quoteEngagement = (quote: QuoteRow) => {
      const activity = quoteActivity.get(quote.id);
      return (activity?.likes ?? 0) * 3 + (activity?.comments ?? 0) * 4;
    };

    for (const thing of things) {
      if (!thing.user_id) continue;
      const author = ensureStats(thing.user_id);
      author.thingCount += 1;
      author.interactionScore += thingEngagement(thing);
    }
    for (const quote of quotes) {
      if (!quote.user_id) continue;
      const author = ensureStats(quote.user_id);
      author.quoteCount += 1;
      author.interactionScore += quoteEngagement(quote);
    }

    const thingsByFame = [...things].sort((a, b) => {
      const scoreDelta = thingEngagement(b) - thingEngagement(a);
      if (scoreDelta !== 0) return scoreDelta;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const quotesByLove = [...quotes].sort((a, b) => {
      const scoreDelta = quoteEngagement(b) - quoteEngagement(a);
      if (scoreDelta !== 0) return scoreDelta;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const usersByPresence = [...stats.values()].sort((a, b) => {
      const scoreA = a.followers * 8 + a.interactionScore;
      const scoreB = b.followers * 8 + b.interactionScore;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return b.followers - a.followers;
    });

    const thingEntry = (
      thing: ThingRow,
      metric: "fame" | "same" | "discussion" | "shared",
    ): LeaderboardEntry => {
      const score =
        metric === "same"
          ? (thingActivity.get(thing.id)?.same ?? 0)
          : metric === "discussion"
            ? (thingActivity.get(thing.id)?.comments ?? 0)
            : metric === "shared"
              ? (thingActivity.get(thing.id)?.shares ?? 0)
              : thingEngagement(thing);
      const secondary =
        metric === "same"
          ? `${scoreLabel(thingActivity.get(thing.id)?.votes ?? 0)} votes`
          : metric === "discussion"
            ? `${scoreLabel(thingActivity.get(thing.id)?.likes ?? 0)} likes`
            : metric === "shared"
              ? `${scoreLabel(thingActivity.get(thing.id)?.likes ?? 0)} likes · ${scoreLabel(thingActivity.get(thing.id)?.comments ?? 0)} comments`
              : `${scoreLabel(thingActivity.get(thing.id)?.same ?? 0)} Same · ${scoreLabel(thingActivity.get(thing.id)?.comments ?? 0)} comments`;
      return {
        rank: 0,
        id: thing.id,
        category: "thing",
        label: shorten(thing.simplified_text),
        score,
        scoreLabel:
          metric === "same"
            ? `${scoreLabel(score)} Same`
            : metric === "discussion"
              ? `${scoreLabel(score)} comments`
              : metric === "shared"
                ? `${scoreLabel(score)} shares`
                : `${scoreLabel(score)} signal${score === 1 ? "" : "s"}`,
        secondary,
      };
    };

    const userEntries: LeaderboardEntry[] = usersByPresence.map((stat) => {
      const profile = profiles.get(stat.id);
      const score = stat.followers * 8 + stat.interactionScore;
      return {
        rank: 0,
        id: stat.id,
        category: "user",
        label: profile?.username ? `@${profile.username}` : "quiet profile",
        username: profile?.username,
        emoji: profile?.emoji,
        plan: profile?.plan,
        score,
        scoreLabel: `${scoreLabel(score)} signal${score === 1 ? "" : "s"}`,
        secondary: `${scoreLabel(stat.followers)} watchers · ${stat.thingCount + stat.quoteCount} drops`,
      };
    });

    const quoteEntries: LeaderboardEntry[] = quotesByLove.map((quote) => {
      const profile = quote.user_id ? profiles.get(quote.user_id) : undefined;
      const score = quoteEngagement(quote);
      return {
        rank: 0,
        id: quote.id,
        category: "quote",
        label: shorten(quote.text),
        username: profile?.username,
        emoji: profile?.emoji,
        plan: profile?.plan,
        score,
        scoreLabel: `${scoreLabel(score)} echo${score === 1 ? "" : "es"}`,
        secondary: `${scoreLabel(number(quote.like_count))} likes · ${scoreLabel(number(quote.comment_count))} comments`,
      };
    });

    const leagues: LeaderboardLeague[] = [
      {
        id: "astra",
        name: "Astra",
        category: "thing",
        description: "The strongest signals in the room this week.",
        metric: "signal strength",
        entries: rankEntries(thingsByFame.map((thing) => thingEntry(thing, "fame"))),
      },
      {
        id: "cosmos",
        name: "Cosmos",
        category: "user",
        description: "The people whose presence travels furthest through the feed.",
        metric: "presence",
        entries: rankEntries(userEntries),
      },
      {
        id: "quelo",
        name: "Quelo",
        category: "quote",
        description: "Quotes that stayed with people after they passed through.",
        metric: "echoes",
        entries: rankEntries(quoteEntries),
      },
    ];

    const countFor = async (table: string, column = "user_id") => {
      const { count, error } = await (supabaseAdmin as any)
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq(column, context.userId)
        .gte("created_at", year.start.toISOString())
        .lt("created_at", year.end.toISOString());
      return error ? 0 : Number(count ?? 0);
    };
    const [thingCount, quoteCount, voteCount, commentCount, followerCount] = await Promise.all([
      countFor("things"),
      countFor("quotes"),
      countFor("votes"),
      countFor("comments"),
      countFor("follows", "following_id"),
    ]);
    const personalPoints =
      thingCount * 20 + quoteCount * 15 + voteCount * 2 + commentCount * 4 + followerCount * 10;
    const currentLeague =
      [...PERSONAL_LEAGUES].reverse().find((league) => personalPoints >= league.threshold) ??
      PERSONAL_LEAGUES[0];
    const nextLeague = PERSONAL_LEAGUES.find((league) => league.threshold > personalPoints);
    const progress = nextLeague
      ? Math.min(
          100,
          Math.round(
            ((personalPoints - currentLeague.threshold) /
              (nextLeague.threshold - currentLeague.threshold)) *
              100,
          ),
        )
      : 100;

    const weekFormatter = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });

    return {
      weekStart,
      weekEnd,
      weekLabel: `${weekFormatter.format(start)} – ${weekFormatter.format(new Date(end.getTime() - 1))}`,
      leagues,
      season: {
        label: `${year.start.getUTCFullYear()} season`,
        startsAt: year.start.toISOString(),
        endsAt: year.end.toISOString(),
        current: {
          id: currentLeague.id,
          name: currentLeague.name,
          points: personalPoints,
          nextThreshold: nextLeague?.threshold ?? null,
          progress,
        },
      },
    };
  });
