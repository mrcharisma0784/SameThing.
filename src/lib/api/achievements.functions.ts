/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase schema types are refreshed separately from app migrations. */
import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AchievementCadence = "one_time" | "daily" | "weekly";

export type AchievementDefinition = {
  key: string;
  title: string;
  description: string;
  reward: number;
  cadence: AchievementCadence;
  iconKey: string;
  difficulty?: "gentle" | "steady" | "rare" | "legendary";
};

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    key: "first_thing",
    title: "Drop your first Thing",
    description: "Share one honest observation.",
    reward: 10,
    cadence: "one_time",
    iconKey: "sparkles",
  },
  {
    key: "first_vote",
    title: "Make your first call",
    description: "Give a Thing a Same or Nah vote.",
    reward: 5,
    cadence: "one_time",
    iconKey: "vote",
  },
  {
    key: "first_bio",
    title: "Leave a trace",
    description: "Add a bio to your profile.",
    reward: 5,
    cadence: "one_time",
    iconKey: "profile",
  },
  {
    key: "first_comment",
    title: "Join the conversation",
    description: "Write your first comment.",
    reward: 5,
    cadence: "one_time",
    iconKey: "comment",
  },
  {
    key: "first_quote",
    title: "Say the line",
    description: "Write your first Quote of the Day.",
    reward: 8,
    cadence: "one_time",
    iconKey: "quote",
  },
  {
    key: "first_feedback",
    title: "Make it better",
    description: "Send your first feedback note.",
    reward: 5,
    cadence: "one_time",
    iconKey: "feedback",
  },
  {
    key: "first_time_capsule",
    title: "Save it for later",
    description: "Create your first Time Capsule.",
    reward: 8,
    cadence: "one_time",
    iconKey: "capsule",
  },
  {
    key: "first_follow",
    title: "Keep an eye on someone",
    description: "Follow your first thinker.",
    reward: 5,
    cadence: "one_time",
    iconKey: "follow",
  },
  {
    key: "first_followed",
    title: "Be found",
    description: "Receive your first follow.",
    reward: 8,
    cadence: "one_time",
    iconKey: "followers",
  },
  {
    key: "first_mything_share",
    title: "Put it out there",
    description: "Share your first MyThing card.",
    reward: 10,
    cadence: "one_time",
    iconKey: "share",
  },
  {
    key: "first_rare_thing",
    title: "Find your rare side",
    description: "Earn your first RareThing.",
    reward: 15,
    cadence: "one_time",
    iconKey: "rare",
    difficulty: "rare",
  },
  {
    key: "streak_3_days",
    title: "Catch the first flame",
    description: "Keep your Streak alive for three days.",
    reward: 5,
    cadence: "one_time",
    iconKey: "streak",
    difficulty: "gentle",
  },
  {
    key: "streak_7_days",
    title: "Hold the ember",
    description: "Return for seven days in a row.",
    reward: 10,
    cadence: "one_time",
    iconKey: "streak",
    difficulty: "steady",
  },
  {
    key: "streak_14_days",
    title: "Make it a ritual",
    description: "Build a two-week Streak.",
    reward: 18,
    cadence: "one_time",
    iconKey: "streak",
    difficulty: "steady",
  },
  {
    key: "streak_30_days",
    title: "Keep the fire",
    description: "Show up for thirty days in a row.",
    reward: 30,
    cadence: "one_time",
    iconKey: "streak",
    difficulty: "rare",
  },
  {
    key: "streak_60_days",
    title: "Become the signal",
    description: "Carry one Streak through sixty days.",
    reward: 50,
    cadence: "one_time",
    iconKey: "streak",
    difficulty: "legendary",
  },
  {
    key: "five_things",
    title: "Make a small collection",
    description: "Drop five Things over time.",
    reward: 12,
    cadence: "one_time",
    iconKey: "collection",
    difficulty: "steady",
  },
  {
    key: "ten_votes",
    title: "Read the room",
    description: "Cast ten Same or Nah votes.",
    reward: 10,
    cadence: "one_time",
    iconKey: "signal",
    difficulty: "steady",
  },
  {
    key: "five_comments",
    title: "Keep the thread alive",
    description: "Leave five thoughtful comments.",
    reward: 10,
    cadence: "one_time",
    iconKey: "thread",
    difficulty: "steady",
  },
  {
    key: "ten_likes",
    title: "Pass the feeling on",
    description: "Like ten Things or Quotes.",
    reward: 8,
    cadence: "one_time",
    iconKey: "spark",
    difficulty: "steady",
  },
  {
    key: "three_followers",
    title: "Gather a little orbit",
    description: "Have three people watch you.",
    reward: 12,
    cadence: "one_time",
    iconKey: "orbit",
    difficulty: "rare",
  },
  {
    key: "public_thing",
    title: "Leave the door open",
    description: "Share one Thing publicly.",
    reward: 6,
    cadence: "one_time",
    iconKey: "open",
    difficulty: "gentle",
  },
  {
    key: "thing_100_likes",
    title: "Start a ripple",
    description: "Have one Thing reach 100 likes.",
    reward: 18,
    cadence: "one_time",
    iconKey: "heart-milestone",
    difficulty: "rare",
  },
  {
    key: "thing_100_votes",
    title: "Become a signal",
    description: "Have one Thing reach 100 votes.",
    reward: 18,
    cadence: "one_time",
    iconKey: "vote-milestone",
    difficulty: "rare",
  },
  {
    key: "thing_100_comments",
    title: "Open a conversation",
    description: "Have one Thing reach 100 comments.",
    reward: 20,
    cadence: "one_time",
    iconKey: "comment-milestone",
    difficulty: "rare",
  },
  {
    key: "thing_1000_likes",
    title: "Light up the room",
    description: "Have one Thing reach 1,000 likes.",
    reward: 40,
    cadence: "one_time",
    iconKey: "legend-heart",
    difficulty: "legendary",
  },
  {
    key: "thing_1000_votes",
    title: "Hold the signal",
    description: "Have one Thing reach 1,000 votes.",
    reward: 40,
    cadence: "one_time",
    iconKey: "legend-vote",
    difficulty: "legendary",
  },
  {
    key: "thing_1000_comments",
    title: "Make a room of it",
    description: "Have one Thing reach 1,000 comments.",
    reward: 45,
    cadence: "one_time",
    iconKey: "legend-comment",
    difficulty: "legendary",
  },
  {
    key: "daily_quote_share",
    title: "Quote of the Day",
    description: "Share a Quote of the Day card today.",
    reward: 3,
    cadence: "daily",
    iconKey: "daily-quote",
  },
  {
    key: "daily_vote",
    title: "Daily signal",
    description: "Vote on one Thing today.",
    reward: 2,
    cadence: "daily",
    iconKey: "daily-vote",
  },
  {
    key: "daily_comment",
    title: "Daily conversation",
    description: "Leave one thoughtful comment today.",
    reward: 2,
    cadence: "daily",
    iconKey: "daily-comment",
  },
  {
    key: "daily_thing",
    title: "Daily drop",
    description: "Drop one Thing today.",
    reward: 3,
    cadence: "daily",
    iconKey: "daily-thing",
  },
  {
    key: "daily_like",
    title: "Pass it on",
    description: "Like one Thing or Quote today.",
    reward: 1,
    cadence: "daily",
    iconKey: "like",
  },
  {
    key: "daily_three_votes",
    title: "Tune into the room",
    description: "Cast three votes today.",
    reward: 4,
    cadence: "daily",
    iconKey: "daily-signal",
    difficulty: "steady",
  },
  {
    key: "daily_two_comments",
    title: "Leave two sparks",
    description: "Write two comments today.",
    reward: 4,
    cadence: "daily",
    iconKey: "daily-thread",
    difficulty: "steady",
  },
  {
    key: "daily_two_things",
    title: "Two small truths",
    description: "Drop two Things today.",
    reward: 5,
    cadence: "daily",
    iconKey: "daily-duo",
    difficulty: "steady",
  },
  {
    key: "daily_two_likes",
    title: "Send two nods",
    description: "Like two Things or Quotes today.",
    reward: 3,
    cadence: "daily",
    iconKey: "daily-heart",
    difficulty: "gentle",
  },
  {
    key: "weekly_thing",
    title: "Keep the room moving",
    description: "Drop one Thing this week.",
    reward: 8,
    cadence: "weekly",
    iconKey: "weekly-thing",
  },
  {
    key: "weekly_vote",
    title: "Check the signal",
    description: "Make three Same or Nah calls this week.",
    reward: 6,
    cadence: "weekly",
    iconKey: "weekly-vote",
  },
  {
    key: "weekly_comment",
    title: "Leave something kind",
    description: "Write two thoughtful comments this week.",
    reward: 6,
    cadence: "weekly",
    iconKey: "weekly-comment",
  },
  {
    key: "weekly_like",
    title: "Pass it around",
    description: "Like five Things or Quotes this week.",
    reward: 4,
    cadence: "weekly",
    iconKey: "weekly-like",
  },
  {
    key: "weekly_quote",
    title: "Put it in words",
    description: "Share two Quote of the Day cards this week.",
    reward: 8,
    cadence: "weekly",
    iconKey: "weekly-quote",
  },
  {
    key: "weekly_share",
    title: "Carry it outward",
    description: "Share a MyThing. or MyQuote. card this week.",
    reward: 10,
    cadence: "weekly",
    iconKey: "weekly-share",
  },
  {
    key: "weekly_five_things",
    title: "Keep the room moving",
    description: "Drop five Things this week.",
    reward: 16,
    cadence: "weekly",
    iconKey: "weekly-stack",
    difficulty: "steady",
  },
  {
    key: "weekly_ten_votes",
    title: "Read ten signals",
    description: "Make ten Same or Nah calls this week.",
    reward: 14,
    cadence: "weekly",
    iconKey: "weekly-signal",
    difficulty: "steady",
  },
  {
    key: "weekly_five_comments",
    title: "Make room for voices",
    description: "Write five comments this week.",
    reward: 14,
    cadence: "weekly",
    iconKey: "weekly-thread",
    difficulty: "steady",
  },
  {
    key: "weekly_ten_likes",
    title: "Leave ten nods",
    description: "Like ten Things or Quotes this week.",
    reward: 8,
    cadence: "weekly",
    iconKey: "weekly-heart",
    difficulty: "steady",
  },
  {
    key: "weekly_three_quotes",
    title: "Give the week a voice",
    description: "Share three Quote of the Day cards this week.",
    reward: 12,
    cadence: "weekly",
    iconKey: "weekly-voice",
    difficulty: "steady",
  },
  {
    key: "weekly_two_shares",
    title: "Carry two thoughts outward",
    description: "Share two MyThing. or MyQuote. cards this week.",
    reward: 14,
    cadence: "weekly",
    iconKey: "weekly-outward",
    difficulty: "rare",
  },
];

const AchievementKey = z.enum(ACHIEVEMENTS.map((item) => item.key) as [string, ...string[]]);
const ClaimInput = z.object({
  key: AchievementKey,
  thing_id: z.string().uuid().optional(),
  quote_id: z.string().uuid().optional(),
});
const ShareInput = z.object({
  kind: z.enum(["thing", "quote"]),
  id: z.string().uuid(),
});

type CountResult = { count: number | null; error: { message: string } | null };

function dayStartIso(): string {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString();
}

function weekKey(): string {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return date.toISOString().slice(0, 10);
}

function weekStartIso(): string {
  return `${weekKey()}T00:00:00.000Z`;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function countRows(query: PromiseLike<CountResult>): Promise<number> {
  const result = await query;
  if (result.error) throw new Error(result.error.message);
  return result.count ?? 0;
}

async function getCounts(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  const start = dayStartIso();
  const weekStart = weekStartIso();
  const [
    things,
    votes,
    comments,
    quotes,
    feedback,
    following,
    followers,
    rare,
    myThingShares,
    quoteShares,
    dailyVotes,
    dailyComments,
    dailyThings,
    dailyThingLikes,
    dailyQuoteLikes,
    capsules,
    weeklyThings,
    weeklyVotes,
    weeklyComments,
    weeklyLikes,
    weeklyQuoteShares,
    weeklyShares,
    publicThings,
    hundredLikeThing,
    hundredVoteThing,
    hundredCommentThing,
    thousandLikeThing,
    thousandVoteThing,
    thousandCommentThing,
    dailyThreeVotes,
    dailyTwoComments,
    dailyTwoThings,
    dailyTwoLikes,
    weeklyFiveThings,
    weeklyTenVotes,
    weeklyFiveComments,
    weeklyTenLikes,
    weeklyQuoteLikes,
    weeklyThreeQuotes,
    weeklyTwoShares,
    totalThingLikes,
    totalQuoteLikes,
    streakRecord,
  ] = await Promise.all([
    countRows(db.from("things").select("id", { count: "exact", head: true }).eq("user_id", userId)),
    countRows(db.from("votes").select("id", { count: "exact", head: true }).eq("user_id", userId)),
    countRows(
      db.from("comments").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ),
    countRows(db.from("quotes").select("id", { count: "exact", head: true }).eq("user_id", userId)),
    countRows(
      db.from("feedback").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ),
    countRows(
      db
        .from("follows")
        .select("followed_id", { count: "exact", head: true })
        .eq("follower_id", userId),
    ),
    countRows(
      db
        .from("follows")
        .select("follower_id", { count: "exact", head: true })
        .eq("followed_id", userId),
    ),
    db.from("profiles").select("rare_thing_count").eq("id", userId).maybeSingle(),
    countRows(
      db
        .from("achievement_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("event_key", "mything_share"),
    ),
    countRows(
      db
        .from("achievement_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("event_key", "quote_share")
        .gte("created_at", start),
    ),
    countRows(
      db
        .from("votes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", start),
    ),
    countRows(
      db
        .from("comments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", start),
    ),
    countRows(
      db
        .from("things")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", start),
    ),
    countRows(
      db
        .from("thing_likes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", start),
    ),
    countRows(
      db
        .from("quote_likes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", start),
    ),
    countRows(
      db.from("time_capsules").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ),
    countRows(
      db
        .from("things")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", weekStart),
    ),
    countRows(
      db
        .from("votes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", weekStart),
    ),
    countRows(
      db
        .from("comments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", weekStart),
    ),
    countRows(
      db
        .from("thing_likes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", weekStart),
    ),
    countRows(
      db
        .from("achievement_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("event_key", "quote_share")
        .gte("created_at", weekStart),
    ),
    countRows(
      db
        .from("achievement_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .in("event_key", ["mything_share", "quote_share"])
        .gte("created_at", weekStart),
    ),
    countRows(
      db
        .from("things")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_anonymous", false),
    ),
    countRows(
      db
        .from("things")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("like_count", 100),
    ),
    countRows(
      db
        .from("things")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("total_votes", 100),
    ),
    countRows(
      db
        .from("things")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("comment_count", 100),
    ),
    countRows(
      db
        .from("things")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("like_count", 1000),
    ),
    countRows(
      db
        .from("things")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("total_votes", 1000),
    ),
    countRows(
      db
        .from("things")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("comment_count", 1000),
    ),
    countRows(
      db
        .from("votes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", start),
    ),
    countRows(
      db
        .from("comments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", start),
    ),
    countRows(
      db
        .from("things")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", start),
    ),
    countRows(
      db
        .from("thing_likes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", start),
    ),
    countRows(
      db
        .from("things")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", weekStart),
    ),
    countRows(
      db
        .from("votes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", weekStart),
    ),
    countRows(
      db
        .from("comments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", weekStart),
    ),
    countRows(
      db
        .from("thing_likes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", weekStart),
    ),
    countRows(
      db
        .from("quote_likes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", weekStart),
    ),
    countRows(
      db
        .from("achievement_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("event_key", "quote_share")
        .gte("created_at", weekStart),
    ),
    countRows(
      db
        .from("achievement_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .in("event_key", ["mything_share", "quote_share"])
        .gte("created_at", weekStart),
    ),
    countRows(
      db.from("thing_likes").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ),
    countRows(
      db.from("quote_likes").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ),
    db
      .from("user_streaks")
      .select("best_streak, current_streak")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  if (rare.error) throw new Error(rare.error.message);
  if (streakRecord.error) throw new Error(streakRecord.error.message);
  return {
    first_thing: things > 0,
    first_vote: votes > 0,
    first_bio: false,
    first_comment: comments > 0,
    first_quote: quotes > 0,
    first_feedback: feedback > 0,
    first_time_capsule: capsules > 0,
    first_follow: following > 0,
    first_followed: followers > 0,
    first_mything_share: myThingShares > 0,
    first_rare_thing: Number(rare.data?.rare_thing_count ?? 0) > 0,
    streak_3_days: Number(streakRecord.data?.best_streak ?? 0) >= 3,
    streak_7_days: Number(streakRecord.data?.best_streak ?? 0) >= 7,
    streak_14_days: Number(streakRecord.data?.best_streak ?? 0) >= 14,
    streak_30_days: Number(streakRecord.data?.best_streak ?? 0) >= 30,
    streak_60_days: Number(streakRecord.data?.best_streak ?? 0) >= 60,
    five_things: things >= 5,
    ten_votes: votes >= 10,
    five_comments: comments >= 5,
    ten_likes: totalThingLikes + totalQuoteLikes >= 10,
    three_followers: followers >= 3,
    public_thing: publicThings > 0,
    thing_100_likes: hundredLikeThing > 0,
    thing_100_votes: hundredVoteThing > 0,
    thing_100_comments: hundredCommentThing > 0,
    thing_1000_likes: thousandLikeThing > 0,
    thing_1000_votes: thousandVoteThing > 0,
    thing_1000_comments: thousandCommentThing > 0,
    daily_quote_share: quoteShares > 0,
    daily_vote: dailyVotes > 0,
    daily_comment: dailyComments > 0,
    daily_thing: dailyThings > 0,
    daily_like: dailyThingLikes + dailyQuoteLikes > 0,
    daily_three_votes: dailyThreeVotes >= 3,
    daily_two_comments: dailyTwoComments >= 2,
    daily_two_things: dailyTwoThings >= 2,
    daily_two_likes: dailyTwoLikes + dailyQuoteLikes >= 2,
    weekly_thing: weeklyThings > 0,
    weekly_vote: weeklyVotes >= 3,
    weekly_comment: weeklyComments >= 2,
    weekly_like: weeklyLikes >= 5,
    weekly_quote: weeklyQuoteShares >= 2,
    weekly_share: weeklyShares > 0,
    weekly_five_things: weeklyFiveThings >= 5,
    weekly_ten_votes: weeklyTenVotes >= 10,
    weekly_five_comments: weeklyFiveComments >= 5,
    weekly_ten_likes: weeklyTenLikes + weeklyQuoteLikes >= 10,
    weekly_three_quotes: weeklyThreeQuotes >= 3,
    weekly_two_shares: weeklyTwoShares >= 2,
  };
}

async function getProfileFlags(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any)
    .from("profiles")
    .select("bio")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { first_bio: Boolean(data?.bio?.trim()) };
}

async function getClaimed(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any)
    .from("achievement_claims")
    .select("achievement_key, cycle_date, reward_amount, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{
    achievement_key: string;
    cycle_date: string | null;
    reward_amount: number;
    created_at: string;
  }>;
}

async function isEligible(
  userId: string,
  key: string,
  input: { thing_id?: string; quote_id?: string },
) {
  const counts = { ...(await getCounts(userId)), ...(await getProfileFlags(userId)) };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  if (key === "first_mything_share") {
    if (!input.thing_id) return counts.first_mything_share;
    const { data } = await db
      .from("things")
      .select("id")
      .eq("id", input.thing_id)
      .eq("user_id", userId)
      .maybeSingle();
    return Boolean(data);
  }
  if (key === "daily_quote_share") {
    if (!input.quote_id) return counts.daily_quote_share;
    const { data } = await db
      .from("quotes")
      .select("id")
      .eq("id", input.quote_id)
      .eq("user_id", userId)
      .eq("day", todayKey())
      .maybeSingle();
    return Boolean(data);
  }
  return Boolean(counts[key as keyof typeof counts]);
}

export const getAchievementOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile, error: profileError }, claimed, counts, profileFlags] =
      await Promise.all([
        (async () => {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          return (supabaseAdmin as any)
            .from("profiles")
            .select("same_credits")
            .eq("id", context.userId)
            .maybeSingle();
        })(),
        getClaimed(context.userId),
        getCounts(context.userId),
        getProfileFlags(context.userId),
      ]);
    if (profileError) throw new Error(profileError.message);
    const completed = { ...counts, ...profileFlags };
    const today = todayKey();
    const items = ACHIEVEMENTS.map((definition) => {
      const claim = claimed.find((row) =>
        row.achievement_key === definition.key && definition.cadence === "one_time"
          ? row.cycle_date === null
          : row.cycle_date === (definition.cadence === "daily" ? today : weekKey()),
      );
      return {
        ...definition,
        completed: Boolean(completed[definition.key as keyof typeof completed]),
        claimed: Boolean(claim),
        claimable: Boolean(completed[definition.key as keyof typeof completed]) && !claim,
        claimed_at: claim?.created_at ?? null,
      };
    });
    return { credits: Number(profile?.same_credits ?? 0), items };
  });

export const recordAchievementShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ShareInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const table = data.kind === "thing" ? "things" : "quotes";
    const query = db.from(table).select("id").eq("id", data.id).eq("user_id", context.userId);
    if (data.kind === "quote") query.eq("day", todayKey());
    const { data: item, error: itemError } = await query.maybeSingle();
    if (itemError || !item)
      return {
        ok: false as const,
        error: "Only your own current content can be shared for this reward.",
      };
    const { error } = await db.from("achievement_events").insert({
      user_id: context.userId,
      event_key: data.kind === "thing" ? "mything_share" : "quote_share",
      thing_id: data.kind === "thing" ? data.id : null,
      quote_id: data.kind === "quote" ? data.id : null,
    });
    if (error && error.code !== "23505") return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const claimAchievement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ClaimInput.parse(input))
  .handler(async ({ data, context }) => {
    const definition = ACHIEVEMENTS.find((item) => item.key === data.key);
    if (!definition) return { ok: false as const, error: "Achievement not found." };
    const eligible = await isEligible(context.userId, data.key, data);
    if (!eligible) return { ok: false as const, error: "Complete the task first." };
    const cycleDate =
      definition.cadence === "one_time"
        ? null
        : definition.cadence === "daily"
          ? todayKey()
          : weekKey();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await (supabaseAdmin as any).rpc("claim_achievement_reward", {
      _user_id: context.userId,
      _achievement_key: definition.key,
      _cycle_date: cycleDate,
      _amount: definition.reward,
    });
    if (error) return { ok: false as const, error: "The reward could not be claimed yet." };
    const payload = (result ?? {}) as { ok?: boolean; reason?: string; amount?: number };
    if (!payload.ok)
      return {
        ok: false as const,
        error:
          payload.reason === "already_claimed"
            ? "Already claimed."
            : "The reward could not be claimed.",
      };
    return { ok: true as const, reward: payload.amount ?? definition.reward };
  });
