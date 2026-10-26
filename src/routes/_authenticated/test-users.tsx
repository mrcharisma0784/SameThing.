import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { SettingsBackLink } from "@/components/SettingsBackLink";

export const Route = createFileRoute("/_authenticated/test-users")({
  head: () => ({ meta: [{ title: "Test Users · SameThing." }] }),
  component: TestUsersPage,
});

function TestUsersPage() {
  return (
    <AppShell>
      <SettingsBackLink />
      <section className="mt-5 rounded-3xl border border-border bg-card p-6">
        <h1 className="font-serif text-2xl text-foreground">Test Users</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Test User applications and pilot access management are currently disabled. Existing
          account data and pilot records are preserved, but new applications, reviews, approvals,
          and revocations are unavailable.
        </p>
      </section>
    </AppShell>
  );
}
