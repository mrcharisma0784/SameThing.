import { effectivePlan } from "@/lib/premium";

export type LabThingProfile = {
  is_test_user?: boolean | null;
  test_user_until?: string | null;
  test_user_label?: string | null;
  plan?: string | null;
  premium_until?: string | null;
};

// Test User status is retained as profile data, but no longer grants product access.
export function isLabThingActive(_profile?: LabThingProfile | null, _now = Date.now()): boolean {
  return false;
}

export function profileBaseTag(profile?: LabThingProfile | null): "SimpleThing." | "PremiumThing." {
  return effectivePlan(profile) === "premium" ? "PremiumThing." : "SimpleThing.";
}

export function profileDisplayTags(profile?: LabThingProfile | null): string[] {
  const tags: string[] = [profileBaseTag(profile)];
  if (isLabThingActive(profile)) tags.push(profile?.test_user_label?.trim() || "LabThing.");
  return tags;
}

export function profileDisplayTag(profile?: LabThingProfile | null): string {
  return profileDisplayTags(profile)[0] ?? "SimpleThing.";
}
