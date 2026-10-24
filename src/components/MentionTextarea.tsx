import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Textarea } from "@/components/ui/textarea";
import { suggestMentions } from "@/lib/api/mentions.functions";
import { ProfileGlyph } from "@/components/ProfileGlyph";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
};

/** Textarea with a lightweight @username popover suggestion list. */
export function MentionTextarea({
  value,
  onChange,
  placeholder,
  className,
  maxLength = 500,
}: Props) {
  const suggest = useServerFn(suggestMentions);
  const ref = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [users, setUsers] = useState<Array<{ username: string; emoji: string }>>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (query === null) {
      setUsers([]);
      return;
    }
    const q = query.trim();
    if (!q) {
      setUsers([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(async () => {
      try {
        const res = await suggest({ data: { q } });
        if (!cancelled) {
          setUsers(res.users);
          setActive(0);
        }
      } catch {
        /* noop */
      }
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query, suggest]);

  const detectQuery = (text: string, caret: number) => {
    const before = text.slice(0, caret);
    const m = before.match(/(?:^|\s)@([a-z0-9_]{0,24})$/i);
    return m ? m[1] : null;
  };

  const onInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value.slice(0, maxLength);
    onChange(v);
    const caret = e.target.selectionStart ?? v.length;
    setQuery(detectQuery(v, caret));
  };

  const insertMention = (uname: string) => {
    const el = ref.current;
    if (!el) return;
    const caret = el.selectionStart ?? value.length;
    const before = value.slice(0, caret);
    const after = value.slice(caret);
    const replaced = before.replace(/@([a-z0-9_]{0,24})$/i, `@${uname} `);
    const next = replaced + after;
    onChange(next.slice(0, maxLength));
    setQuery(null);
    setUsers([]);
    requestAnimationFrame(() => {
      const pos = replaced.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!users.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % users.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + users.length) % users.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertMention(users[active].username);
    } else if (e.key === "Escape") {
      setQuery(null);
      setUsers([]);
    }
  };

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        value={value}
        onChange={onInput}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={className}
      />
      {users.length > 0 && (
        <div className="absolute left-2 right-2 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-lg">
          {users.map((u, i) => (
            <button
              key={u.username}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(u.username);
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${i === active ? "bg-accent/15 text-foreground" : "text-muted-foreground hover:bg-secondary/40"}`}
            >
              <span className="grid h-6 w-6 place-items-center rounded-full border border-border bg-background/60 text-[13px]">
                <ProfileGlyph value={u.emoji} className="h-3.5 w-3.5" />
              </span>
              <span>@{u.username}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Extract unique lowercase @usernames from text. */
export function extractMentions(text: string): string[] {
  const re = /@([a-z0-9_]{2,24})/gi;
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.add(m[1].toLowerCase());
  return Array.from(out);
}

/** Render text with @mentions. Only linkify if username is in `validUsernames`. */
export function renderWithMentions(text: string, validUsernames?: Set<string>) {
  const parts: Array<string | { u: string }> = [];
  const re = /@([a-z0-9_]{2,24})/gi;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push({ u: match[1] });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.map((p, i) => {
    if (typeof p === "string") return <span key={i}>{p}</span>;
    const uname = p.u.toLowerCase();
    const isValid = validUsernames ? validUsernames.has(uname) : true;
    if (!isValid) return <span key={i}>@{p.u}</span>;
    return (
      <Link
        key={i}
        to="/u/$username"
        params={{ username: uname }}
        className="rounded bg-accent/10 px-1 text-accent hover:bg-accent/20"
      >
        @{p.u}
      </Link>
    );
  });
}
