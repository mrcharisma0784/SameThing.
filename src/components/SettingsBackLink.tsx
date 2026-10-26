import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function SettingsBackLink() {
  return (
    <div className="mb-1 flex justify-end">
      <Link
        to="/settings"
        className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-2 text-xs uppercase tracking-widest text-foreground transition-colors hover:border-accent/50 hover:text-accent"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Settings
      </Link>
    </div>
  );
}
