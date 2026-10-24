export type LabThingProfile = {
  is_test_user?: boolean | null;
  test_user_until?: string | null;
  test_user_label?: string | null;
  plan?: string | null;
  premium_until?: string | null;
};

export function isLabThingActive(profile?: LabThingProfile | null, now = Date.now()): boolean {
  if (!profile?.is_test_user) return false;
  if (!profile.test_user_until) return true;
  const until = new Date(profile.test_user_until).getTime();
  return Number.isFinite(until) && until > now;
}

export function profileBaseTag(profile?: LabThingProfile | null): "SimpleThing." | "PremiumThing." {
  return profile?.plan === "premium" ? "PremiumThing." : "SimpleThing.";
}

export function profileDisplayTags(profile?: LabThingProfile | null): string[] {
  const tags: string[] = [profileBaseTag(profile)];
  if (isLabThingActive(profile)) tags.push(profile?.test_user_label?.trim() || "LabThing.");
  return tags;
}

export function profileDisplayTag(profile?: LabThingProfile | null): string {
  return profileDisplayTags(profile)[0] ?? "SimpleThing.";
}
