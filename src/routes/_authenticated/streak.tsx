import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { SettingsBackLink } from "@/components/SettingsBackLink";

export const Route = createFileRoute("/_authenticated/streak")({
  head: () => ({ meta: [{ title: "Streak · SameThing." }] }),
  component: StreakPage,
});

function StreakPage() {
  return (
    <AppShell>
      <SettingsBackLink />
      <section className="mt-5 rounded-3xl border border-border bg-card p-6">
        <h1 className="font-serif text-2xl text-foreground">Streak</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Streak is currently unavailable. Existing Streak data and milestone history are preserved;
          check-ins and Streak Freeze purchases are disabled.
        </p>
      </section>
    </AppShell>
  );
}
