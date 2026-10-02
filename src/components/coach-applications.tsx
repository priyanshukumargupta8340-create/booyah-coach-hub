import { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, Loader2, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type CoachProfile = Database["public"]["Tables"]["coach_profiles"]["Row"];
type Status = Database["public"]["Enums"]["coach_status"];

export function CoachApplications() {
  const [rows, setRows] = useState<CoachProfile[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("coach_profiles").select("*").order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setRows(data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function viewProof(path: string) {
    const { data, error } = await supabase.storage.from("rank-proofs").createSignedUrl(path, 300);
    if (error) return setError(error.message);
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function setStatus(row: CoachProfile, status: Status) {
    setBusy(row.id);
    const { error } = await supabase.from("coach_profiles").update({ status }).eq("id", row.id);
    if (error) setError(error.message);
    await load();
    setBusy(null);
  }

  if (rows.length === 0 && !error) return null;

  return (
    <section className="mt-10">
      <h2 className="font-display text-3xl tracking-wide">Coach applications</h2>
      <p className="mt-1 text-sm text-muted-foreground">Check each rank proof, then approve to list the coach publicly.</p>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{r.display_name} <span className="text-muted-foreground">{r.handle}</span></p>
                <p className="text-xs text-muted-foreground">UID {r.free_fire_uid} · {r.rank} · {r.region} · ₹{r.price}</p>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${r.status === "approved" ? "border-primary/40 text-primary" : r.status === "rejected" ? "border-destructive/40 text-destructive" : "border-gold/40 text-gold"}`}>
                {r.status}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{r.bio}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => void viewProof(r.proof_path)} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-semibold">
                <ExternalLink className="h-3.5 w-3.5" /> Rank proof
              </button>
              <button disabled={busy === r.id || r.status === "approved"} onClick={() => void setStatus(r, "approved")}
                className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
                {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Approve
              </button>
              <button disabled={busy === r.id || r.status === "rejected"} onClick={() => void setStatus(r, "rejected")}
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
                <X className="h-3.5 w-3.5" /> Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
