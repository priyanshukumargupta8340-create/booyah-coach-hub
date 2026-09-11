import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Flame, Loader2, LogOut, RefreshCw, ShieldAlert } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];
type Booking = Database["public"]["Tables"]["bookings"]["Row"];

const STATUSES: BookingStatus[] = ["pending", "paid", "confirmed", "completed"];

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: "bg-secondary text-muted-foreground border-border",
  paid: "bg-gold/15 text-gold border-gold/40",
  confirmed: "bg-primary/15 text-primary border-primary/40",
  completed: "bg-accent/20 text-foreground border-accent",
};

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Coach Dashboard — BooyahCoach Bookings" },
      {
        name: "description",
        content: "Live table of incoming Free Fire coaching bookings with student IGN, UID, contact, and status.",
      },
      { property: "og:title", content: "Coach Dashboard — BooyahCoach Bookings" },
      {
        property: "og:description",
        content: "Track and update the status of every incoming coaching session request.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function nextStatus(current: BookingStatus): BookingStatus {
  const i = STATUSES.indexOf(current);
  return STATUSES[(i + 1) % STATUSES.length]!;
}

function DashboardPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else {
      setError(null);
      setRows(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const channel = supabase
      .channel("bookings-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        void load();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  async function toggleStatus(row: Booking) {
    const target = nextStatus(row.status);
    setUpdating(row.id);
    const previous = rows;
    setRows((r) => r.map((b) => (b.id === row.id ? { ...b, status: target } : b)));
    const { error } = await supabase.from("bookings").update({ status: target }).eq("id", row.id);
    if (error) {
      setRows(previous);
      setError(error.message);
    }
    setUpdating(null);
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const isPermissionError = !!error && /permission|policy|denied/i.test(error);

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-primary">
            <Flame className="h-5 w-5" />
            <span className="font-display text-xl tracking-wide">BooyahCoach</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-accent"
              aria-label="Refresh bookings"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => void signOut()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="font-display text-4xl tracking-wide text-foreground">Coach Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Every incoming session request, updating live. Tap a status to move it Pending → Confirmed → Completed.
        </p>

        {isPermissionError ? (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-card p-4">
            <ShieldAlert className="mt-0.5 h-5 w-5 text-primary" />
            <p className="text-sm text-muted-foreground">
              This account isn't approved to view bookings yet. Ask an existing admin to grant your account
              coach access, then refresh.
            </p>
          </div>
        ) : error ? (
          <p className="mt-6 text-sm text-destructive">{error}</p>
        ) : null}

        {loading ? (
          <div className="mt-10 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading bookings…
          </div>
        ) : rows.length === 0 && !error ? (
          <div className="mt-10 rounded-xl border border-border bg-card p-8 text-center">
            <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No bookings yet. New requests appear here instantly.</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <ul className="mt-6 space-y-3 md:hidden">
              {rows.map((row) => (
                <li key={row.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{row.ign}</p>
                      <p className="text-xs text-muted-foreground">UID {row.free_fire_uid}</p>
                    </div>
                    <StatusButton row={row} updating={updating === row.id} onClick={() => void toggleStatus(row)} />
                  </div>
                  <dl className="mt-3 space-y-1 text-sm text-muted-foreground">
                    <div className="flex justify-between gap-3">
                      <dt>Contact</dt>
                      <dd className="text-foreground">{row.whatsapp}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>Session</dt>
                      <dd className="text-foreground">{row.session_type}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>Date</dt>
                      <dd className="text-foreground">{row.selected_date}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>Slot</dt>
                      <dd className="text-foreground">{row.time_slot}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>

            {/* Desktop table */}
            <div className="mt-6 hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3">IGN</th>
                    <th scope="col" className="px-4 py-3">Free Fire UID</th>
                    <th scope="col" className="px-4 py-3">WhatsApp</th>
                    <th scope="col" className="px-4 py-3">Session Type</th>
                    <th scope="col" className="px-4 py-3">Date</th>
                    <th scope="col" className="px-4 py-3">Time Slot</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 font-medium text-foreground">{row.ign}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.free_fire_uid}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.whatsapp}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.session_type}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.selected_date}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.time_slot}</td>
                      <td className="px-4 py-3">
                        <StatusButton
                          row={row}
                          updating={updating === row.id}
                          onClick={() => void toggleStatus(row)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function StatusButton({
  row,
  updating,
  onClick,
}: {
  row: Booking;
  updating: boolean;
  onClick: () => void;
}) {
  const label = row.status.charAt(0).toUpperCase() + row.status.slice(1);
  return (
    <button
      onClick={onClick}
      disabled={updating}
      aria-label={`Booking for ${row.ign} is ${label}. Change to ${nextStatus(row.status)}`}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-opacity hover:opacity-80 disabled:opacity-50 ${STATUS_STYLES[row.status]}`}
    >
      {updating ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
      {label}
    </button>
  );
}
