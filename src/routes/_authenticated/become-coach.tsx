import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BadgeCheck, Clock, Flame, Loader2, Upload, XCircle } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { TIME_SLOTS } from "@/components/booking-modal";

const WEEKDAYS = [["1", "Mon"], ["2", "Tue"], ["3", "Wed"], ["4", "Thu"], ["5", "Fri"], ["6", "Sat"], ["0", "Sun"]] as const;
import type { Database } from "@/integrations/supabase/types";

type CoachProfile = Database["public"]["Tables"]["coach_profiles"]["Row"];

const SPECIALTIES = ["Rank Push", "Aim", "Clash Squad", "Tournament"];
const RANKS = ["Grandmaster", "Heroic", "Elite Heroic", "Master", "Diamond"];

export const Route = createFileRoute("/_authenticated/become-coach")({
  head: () => ({
    meta: [
      { title: "Become a Coach — BooyahCoach" },
      { name: "description", content: "Create your Free Fire coach profile, upload rank proof and get listed in the verified directory." },
      { property: "og:title", content: "Become a Verified Free Fire Coach — BooyahCoach" },
      { property: "og:description", content: "Apply with rank proof and start coaching Free Fire players." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BecomeCoachPage,
});

const input =
  "w-full rounded-md border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-primary";

function BecomeCoachPage() {
  const { user } = Route.useRouteContext();
  const [existing, setExisting] = useState<CoachProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    display_name: "",
    handle: "",
    free_fire_uid: "",
    rank: "Heroic",
    region: "India",
    languages: "Hindi, English",
    price: "199",
    bio: "",
    specialties: [] as string[],
    availability: Object.fromEntries(["0", "1", "2", "3", "4", "5", "6"].map((d) => [d, [...TIME_SLOTS]])) as Record<string, string[]>,
  });

  useEffect(() => {
    void supabase
      .from("coach_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setExisting(data);
          setForm({ ...data, price: String(data.price), availability: (data.availability ?? {}) as Record<string, string[]> });
        }
        setLoading(false);
      });
  }, [user.id]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6,12}$/.test(form.free_fire_uid)) return setError("Free Fire UID must be 6–12 digits.");
    if (form.specialties.length === 0) return setError("Pick at least one specialty.");
    const price = Number(form.price);
    if (!Number.isInteger(price) || price < 49 || price > 5000) return setError("Price must be between ₹49 and ₹5000.");
    if (!Object.values(form.availability).some((v) => v.length > 0)) return setError("Open at least one time slot in your weekly availability.");
    if (!file && !existing) return setError("Upload a screenshot of your rank as proof.");
    if (file && (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024))
      return setError("Rank proof must be an image under 5 MB.");

    setSaving(true);
    let proof_path = existing?.proof_path ?? "";
    if (file) {
      const ext = file.name.split(".").pop() || "png";
      proof_path = `${user.id}/rank-proof-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("rank-proofs").upload(proof_path, file);
      if (upErr) {
        setSaving(false);
        return setError(upErr.message);
      }
    }
    const payload = {
      display_name: form.display_name.trim(),
      handle: form.handle.trim().startsWith("@") ? form.handle.trim() : `@${form.handle.trim()}`,
      free_fire_uid: form.free_fire_uid,
      rank: form.rank,
      region: form.region.trim(),
      languages: form.languages.trim(),
      price,
      bio: form.bio.trim(),
      specialties: form.specialties,
      availability: form.availability,
      proof_path,
    };
    const { data, error: dbErr } = existing
      ? await supabase.from("coach_profiles").update(payload).eq("id", existing.id).select().single()
      : await supabase.from("coach_profiles").insert(payload).select().single();
    setSaving(false);
    if (dbErr) return setError(dbErr.message);
    setExisting(data);
    setEditing(false);
    setFile(null);
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/95">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-primary">
            <Flame className="h-5 w-5" />
            <span className="font-display text-xl tracking-wide">BooyahCoach</span>
          </Link>
          <span className="truncate text-xs text-muted-foreground">{user.email}</span>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="font-display text-4xl tracking-wide">Become a Coach</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Build your profile and upload proof of your rank. Once our team verifies it, you'll appear in the verified
          coach directory.
        </p>

        {loading ? (
          <div className="mt-10 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : existing && !editing ? (
          <StatusCard profile={existing} onEdit={() => setEditing(true)} />
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-5 rounded-xl border border-border bg-surface p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Display name">
                <input required maxLength={60} className={input} value={form.display_name} onChange={set("display_name")} />
              </Field>
              <Field label="Handle">
                <input required maxLength={30} placeholder="@yourhandle" className={input} value={form.handle} onChange={set("handle")} />
              </Field>
              <Field label="Free Fire UID">
                <input required inputMode="numeric" maxLength={12} className={input} value={form.free_fire_uid}
                  onChange={(e) => setForm((f) => ({ ...f, free_fire_uid: e.target.value.replace(/\D/g, "") }))} />
              </Field>
              <Field label="Highest rank">
                <select className={input} value={form.rank} onChange={set("rank")}>
                  {RANKS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Region">
                <input required maxLength={40} className={input} value={form.region} onChange={set("region")} />
              </Field>
              <Field label="Languages">
                <input required maxLength={80} className={input} value={form.languages} onChange={set("languages")} />
              </Field>
              <Field label="Price per session (₹)">
                <input required type="number" min={49} max={5000} className={input} value={form.price} onChange={set("price")} />
              </Field>
            </div>

            <fieldset>
              <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Specialties</legend>
              <div className="flex flex-wrap gap-2">
                {SPECIALTIES.map((s) => {
                  const on = form.specialties.includes(s);
                  return (
                    <button type="button" key={s} aria-pressed={on}
                      onClick={() => setForm((f) => ({ ...f, specialties: on ? f.specialties.filter((x) => x !== s) : [...f.specialties, s] }))}
                      className={`rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wide ${on ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Weekly availability</legend>
              <p className="mb-2 text-xs text-muted-foreground">Tap slots to toggle. Players can only book the slots you leave open.</p>
              <div className="space-y-1.5 overflow-x-auto">
                {WEEKDAYS.map(([d, label]) => (
                  <div key={d} className="flex items-center gap-1.5">
                    <span className="w-9 shrink-0 text-xs font-bold uppercase text-muted-foreground">{label}</span>
                    {TIME_SLOTS.map((t) => {
                      const on = (form.availability[d] ?? []).includes(t);
                      return (
                        <button type="button" key={t} aria-pressed={on} aria-label={`${label} ${t}`}
                          onClick={() => setForm((f) => {
                            const cur = f.availability[d] ?? [];
                            const nextDay = on ? cur.filter((x) => x !== t) : TIME_SLOTS.filter((x) => x === t || cur.includes(x));
                            return { ...f, availability: { ...f.availability, [d]: nextDay } };
                          })}
                          className={`min-w-14 rounded border px-1.5 py-1 text-[10px] font-bold ${on ? "border-gold bg-gold/15 text-gold" : "border-border text-muted-foreground/60 line-through"}`}>
                          {t.replace(":00", "")}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </fieldset>

            <Field label="Bio">
              <textarea required maxLength={300} rows={3} placeholder="What makes your coaching different?" className={input} value={form.bio} onChange={set("bio")} />
            </Field>

            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-gold/50 bg-surface-2 p-5 text-center">
              <Upload className="h-6 w-6 text-gold" />
              <span className="text-sm font-semibold">{file ? file.name : existing ? "Replace rank proof (optional)" : "Upload rank proof screenshot"}</span>
              <span className="text-xs text-muted-foreground">Profile or rank screen showing your IGN and UID · image, max 5 MB</span>
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>

            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2">
              {existing && (
                <button type="button" onClick={() => setEditing(false)} className="rounded-md border border-border px-4 py-3 text-sm font-semibold">
                  Cancel
                </button>
              )}
              <button disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground disabled:opacity-60">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {existing ? "Resubmit for review" : "Submit application"}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function StatusCard({ profile, onEdit }: { profile: CoachProfile; onEdit: () => void }) {
  const meta = {
    pending: { icon: Clock, title: "Under review", copy: "We're checking your rank proof. You'll be listed once approved.", cls: "text-gold" },
    approved: { icon: BadgeCheck, title: "You're verified!", copy: "Your profile is live in the verified coach directory.", cls: "text-primary" },
    rejected: { icon: XCircle, title: "Not approved", copy: "We couldn't verify your rank proof. Update your profile and resubmit.", cls: "text-destructive" },
  }[profile.status];
  const Icon = meta.icon;
  return (
    <div className="mt-6 rounded-xl border border-border bg-surface p-6">
      <Icon className={`h-8 w-8 ${meta.cls}`} />
      <h2 className="mt-3 font-display text-3xl">{meta.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{meta.copy}</p>
      <p className="mt-4 text-sm">
        <strong>{profile.display_name}</strong> {profile.handle} · {profile.rank} · ₹{profile.price}/session
      </p>
      <div className="mt-5 flex gap-2">
        <button onClick={onEdit} className="rounded-md border border-border px-4 py-2 text-sm font-semibold">Edit profile</button>
        {profile.status === "approved" && (
          <Link to="/" hash="coaches" className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">View directory</Link>
        )}
      </div>
    </div>
  );
}
