import { useEffect, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brand } from "@/components/Brand";
import { completeOnboarding } from "@/lib/api/things.functions";
import { saveDemographics } from "@/lib/api/me.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DEFAULT_AVATAR } from "@/lib/avatars";
import { effectivePlan } from "@/lib/premium";
import { ProfilePhotoPicker, type PreparedProfilePhoto } from "@/components/ProfilePhotoPicker";
import { uploadMyProfilePhoto } from "@/lib/api/me.functions";
import { ProfileGlyph } from "@/components/ProfileGlyph";

const GENDERS = ["woman", "man"];

/** Wraps a screen and ensures the user has completed onboarding and demographics. */
export function OnboardingGate({ children }: { children: ReactNode }) {
  const { user, profile, refreshProfile } = useAuth();
  const onboard = useServerFn(completeOnboarding);
  const saveDemo = useServerFn(saveDemographics);
  const uploadPhoto = useServerFn(uploadMyProfilePhoto);
  const [queuedPhoto, setQueuedPhoto] = useState<PreparedProfilePhoto | null>(null);
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState("");
  const [emoji, setEmoji] = useState(DEFAULT_AVATAR);
  const [language, setLanguage] = useState<"en" | "tr">("en");
  const [gender, setGender] = useState<string>("");
  const [age, setAge] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const needsOnboarding = !!user && !!profile && !profile.onboarded_at;
  const needsDemographics =
    !!user && !!profile && !!profile.onboarded_at && !profile.demographics_completed_at;
  const savedAge = Number(profile?.age_range);
  const needsUnder15 =
    !!user &&
    !!profile &&
    !!profile.demographics_completed_at &&
    Number.isFinite(savedAge) &&
    savedAge >= 1 &&
    savedAge < 15;
  const open = needsOnboarding || needsDemographics || needsUnder15;

  useEffect(() => {
    if (needsUnder15) {
      setStep(4);
    } else if (profile && !profile.onboarded_at) {
      setUsername(profile.username || "");
      setEmoji(profile.emoji || DEFAULT_AVATAR);
      setLanguage((profile.language as "en" | "tr") || "en");
      setStep(0);
    } else if (profile && !profile.demographics_completed_at) {
      setStep(3);
    }
  }, [profile, needsUnder15]);

  const submitOnboarding = async () => {
    setSaving(true);
    const res = await onboard({ data: { username: username.toLowerCase(), emoji, language } });
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    if (queuedPhoto) {
      try {
        const photoRes = await uploadPhoto({ data: queuedPhoto });
        if (!photoRes.ok)
          toast.error(`Your account was created, but the photo was not saved: ${photoRes.error}`);
        else toast.success("Profile photo saved.");
      } catch {
        toast.error("Your account was created, but the photo could not be uploaded.");
      }
      setQueuedPhoto(null);
    }
    await refreshProfile();
    setStep(3);
  };

  const submitDemographics = async () => {
    if (!gender) {
      toast.error("Please select a gender.");
      return;
    }
    const n = parseInt(age, 10);
    if (!Number.isFinite(n) || n < 1 || n > 120) {
      toast.error("Please enter a valid age.");
      return;
    }
    if (n < 15) {
      toast.error(
        "Under-15 registration is paused until verified parent or guardian approval is available.",
      );
      setSaving(true);
      await supabase.auth.signOut();
      setSaving(false);
      return;
    }
    setSaving(true);
    const res = await saveDemo({ data: { gender, age_range: String(n) } });
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    await refreshProfile();
    toast.success("Welcome.");
  };

  return (
    <>
      {children}
      <Dialog open={open}>
        <DialogContent
          className="max-w-sm border-border bg-card"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          {step === 4 && needsUnder15 && (
            <div className="space-y-4 text-center">
              <p className="font-serif text-2xl italic text-foreground">Parent approval needed.</p>
              <p className="text-sm text-muted-foreground">
                Under-15 access is paused until verified parent or guardian approval is available.
                Your account and saved data have not been deleted.
              </p>
              <Button
                onClick={async () => {
                  setSaving(true);
                  await supabase.auth.signOut();
                  setSaving(false);
                }}
                disabled={saving}
                className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {saving ? "Signing out…" : "Sign out"}
              </Button>
            </div>
          )}
          {step === 0 && needsOnboarding && (
            <div className="space-y-4 text-center">
              <Brand size="lg" />
              <p className="font-serif text-2xl italic text-foreground">
                You're never the only one.
              </p>
              <p className="text-sm text-muted-foreground">
                Drop a thing. Vote Same or Nah. Watch the world quietly agree with you.
              </p>
              <Button
                onClick={() => setStep(1)}
                className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                Show me how
              </Button>
            </div>
          )}
          {step === 1 && needsOnboarding && (
            <div className="space-y-4 text-center">
              <p className="font-serif text-2xl italic text-foreground">Same or Nah?</p>
              <p className="text-sm text-muted-foreground">
                Every Thing gets a <span className="text-[color:var(--same)]">Same</span> /{" "}
                <span className="text-foreground">Nah</span> vote. The Similarity Score tells you
                how many people felt it too. If no one ever does, you earn a{" "}
                <span className="text-[color:var(--rare)]">Rare Thing</span>.
              </p>
              <Button
                onClick={() => setStep(2)}
                className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                Last step
              </Button>
            </div>
          )}
          {step === 2 && needsOnboarding && (
            <div className="space-y-4">
              <p className="font-serif text-2xl italic text-foreground">Pick your mark.</p>
              <div>
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Username
                </Label>
                <Input
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                  }
                  maxLength={24}
                  className="mt-1 bg-background"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Optional profile photo
                </Label>
                <div className="mt-2">
                  <ProfilePhotoPicker
                    premium={effectivePlan(profile) === "premium"}
                    onPrepared={setQueuedPhoto}
                  />
                </div>
                {queuedPhoto && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Photo selected; it will upload after your profile is saved.
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Language
                </Label>
                <div className="mt-2 flex gap-2">
                  {(["en", "tr"] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => setLanguage(l)}
                      className={`flex-1 rounded-full border px-3 py-2 text-xs uppercase tracking-widest ${language === l ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted-foreground"}`}
                    >
                      {l === "en" ? "English" : "Türkçe"}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                onClick={submitOnboarding}
                disabled={saving || username.length < 2}
                className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {saving ? "Saving…" : "Continue"}
              </Button>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <p className="font-serif text-2xl italic text-foreground">A little about you.</p>
              <p className="text-xs text-muted-foreground">
                Kept private. Never shown on your profile. Used only as anonymised stats for
                research partners.
              </p>
              <div>
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Gender
                </Label>
                <div className="mt-2 flex gap-2">
                  {GENDERS.map((g) => (
                    <button
                      key={g}
                      onClick={() => setGender(g)}
                      className={`flex-1 rounded-full border px-3 py-2 text-xs capitalize ${gender === g ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted-foreground"}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Age
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
                  placeholder="e.g. 24"
                  className="mt-1 bg-background"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  The general minimum age is 15. Under-15 registration requires verified parent or
                  guardian approval, but that verification is not available yet. Higher local age
                  requirements still apply.
                </p>
              </div>
              <Button
                onClick={submitDemographics}
                disabled={saving || !gender || !age}
                className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {saving ? "Saving…" : "Enter SameThing."}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
