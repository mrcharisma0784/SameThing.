import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function SettingsBackLink() {
  return (
    <Link
      to="/settings"
      className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-2.5 text-xs uppercase tracking-widest text-foreground transition-colors hover:border-accent/50 hover:text-accent"
    >
      <ArrowLeft className="h-3.5 w-3.5" /> Settings
    </Link>
  );
}
