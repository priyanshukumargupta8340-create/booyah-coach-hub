import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { CalendarDays, ExternalLink, Flame, Loader2, Video } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type Status = Database["public"]["Enums"]["booking_status"];

export const STATUS_BADGE: Record<Status, string> = {
  pending: "bg-secondary text-muted-foreground border-border",
  paid: "bg-gold/15 text-gold border-gold/40",
  confirmed: "bg-primary/15 text-primary border-primary/40",
  completed: "bg-accent/20 text-foreground border-accent",
};

const today = () => new Date().toISOString().slice(0, 10);

export function SessionShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/95">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-primary">
            <Flame className="h-5 w-5" />
            <span className="font-display text-xl tracking-wide">BooyahCoach</span>
          </Link>
          <Link to="/" hash="coaches" className="rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">
            Book a coach
          </Link>
        </div>
      </header>
      <section className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="font-display text-4xl tracking-wide">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        {children}
      </section>
    </main>
  );
}

export function SessionList({ mode, filter }: { mode: "player" | "coach"; filter: { column: "user_id" | "coach_handle"; value: string } }) {
  const [rows, setRows] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const q = supabase.from("bookings").select("*").order("selected_date", { ascending: true });
    const { data, error } = await (filter.column === "user_id" ? q.eq("user_id", filter.value) : q.ilike("coach_handle", filter.value));
    if (error) setError(error.message);
    else setRows(data ?? []);
    setLoading(false);
  }, [filter.column, filter.value]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading)
    return (
      <div className="mt-10 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading sessions…
      </div>
    );
  if (error) return <p className="mt-6 text-sm text-destructive">{error}</p>;

  const upcoming = rows.filter((r) => r.selected_date >= today() && r.status !== "completed" && !r.cancelled_at);
  const past = rows.filter((r) => !upcoming.includes(r)).reverse();

  if (rows.length === 0)
    return (
      <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center">
        <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          {mode === "player" ? "No sessions yet. Book a verified coach to get started." : "No bookings yet. They'll show up here."}
        </p>
      </div>
    );

  return (
    <>
      <Group title="Upcoming" rows={upcoming} mode={mode} onChange={load} />
      <Group title="Past & completed" rows={past} mode={mode} onChange={load} />
    </>
  );
}

function Group({ title, rows, mode, onChange }: { title: string; rows: Booking[]; mode: "player" | "coach"; onChange: () => void }) {
  if (rows.length === 0) return null;
  return (
    <div className="mt-8">
      <h2 className="font-display text-2xl tracking-wide">{title}</h2>
      <ul className="mt-3 space-y-3">
        {rows.map((r) => (
          <SessionCard key={r.id} row={r} mode={mode} onChange={onChange} />
        ))}
      </ul>
    </div>
  );
}

function SessionCard({ row, mode, onChange }: { row: Booking; mode: "player" | "coach"; onChange: () => void }) {
  const [link, setLink] = useState(row.meeting_link ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const date = new Date(`${row.selected_date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });

  async function save(patch: Database["public"]["Tables"]["bookings"]["Update"]) {
    setErr(null);
    if (patch.meeting_link && !/^https:\/\/\S+$/.test(patch.meeting_link)) return setErr("Link must start with https://");
    setSaving(true);
    const { error } = await supabase.from("bookings").update(patch).eq("id", row.id);
    setSaving(false);
    if (error) setErr(error.message);
    else onChange();
  }

  async function cancel() {
    if (!window.confirm("Cancel this session? The time slot will be released for other players.")) return;
    setErr(null);
    setSaving(true);
    const { error } = await supabase.rpc("cancel_booking", { _id: row.id });
    setSaving(false);
    if (error) setErr(error.message);
    else onChange();
  }

  const cancelled = !!row.cancelled_at;
  const canCancel = !cancelled && row.status !== "completed" && row.selected_date >= today();

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-xl">{row.session_type}</p>
          <p className="text-sm text-muted-foreground">
            {date} · {row.time_slot}
            {mode === "player" ? ` · with ${row.coach_handle ?? "your coach"}` : ` · ${row.ign} (UID ${row.free_fire_uid})`}
          </p>
          {mode === "coach" && <p className="text-xs text-muted-foreground">Contact: {row.whatsapp}</p>}
        </div>
        <div className="flex items-center gap-2">
          {row.amount != null && <span className="font-display text-lg text-gold">₹{row.amount}</span>}
          <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${cancelled ? "border-destructive/40 bg-destructive/10 text-destructive" : STATUS_BADGE[row.status]}`}>
            {cancelled ? "cancelled" : row.status}
          </span>
        </div>
      </div>

      {cancelled ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Cancelled by {row.cancelled_by === "player" ? (mode === "player" ? "you" : "the player") : row.cancelled_by === "coach" ? (mode === "coach" ? "you" : "the coach") : "an admin"}. This slot is open again.
        </p>
      ) : mode === "player" ? (
        row.meeting_link ? (
          <a href={row.meeting_link} target="_blank" rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">
            <Video className="h-4 w-4" /> Join session <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">Meeting link will appear here once your coach adds it.</p>
        )
      ) : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://discord.gg/… or meet link"
            aria-label="Meeting link"
            className="flex-1 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary" />
          <button disabled={saving} onClick={() => void save({ meeting_link: link.trim() || null })}
            className="rounded-md border border-border px-3 py-2 text-sm font-semibold disabled:opacity-50">Save link</button>
          {row.status !== "confirmed" && row.status !== "completed" && (
            <button disabled={saving} onClick={() => void save({ status: "confirmed" })}
              className="rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">Confirm</button>
          )}
          {row.status === "confirmed" && (
            <button disabled={saving} onClick={() => void save({ status: "completed" })}
              className="rounded-md bg-gold px-3 py-2 text-sm font-bold text-background disabled:opacity-50">Mark completed</button>
          )}
        </div>
      )}
      {canCancel && (
        <button disabled={saving} onClick={() => void cancel()}
          className="mt-3 rounded-md border border-destructive/50 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50">
          {saving ? "Cancelling…" : "Cancel session"}
        </button>
      )}
      {err && <p role="alert" className="mt-2 text-xs text-destructive">{err}</p>}
    </li>
  );
}
