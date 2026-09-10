import { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronLeft,
  Clock,
  Flame,
  Gamepad2,
  PartyPopper,
  User,
  Wallet,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

export type BookingCoach = {
  name: string;
  handle: string;
  initials: string;
  rank: string;
  price: number;
};

const SESSION_TYPES = [
  {
    id: "live",
    name: "1-on-1 Live Session",
    desc: "60 min live coaching in a custom room with voice.",
    inr: 499,
    usd: 6,
  },
  {
    id: "vod",
    name: "VOD Review Session",
    desc: "45 min recorded gameplay breakdown with written notes.",
    inr: 299,
    usd: 4,
  },
] as const;

const IMPROVEMENT_AREAS = [
  "Aim & Headshot Accuracy",
  "Movement & Positioning",
  "Gloo Wall & Close Combat",
  "Rank Push Strategy",
  "IGL & Team Communication",
] as const;

const TIME_SLOTS = ["10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM", "6:00 PM", "8:00 PM"] as const;

const STEPS = ["Gamer Info", "Session Type", "Improve", "Schedule", "Summary"] as const;

type Props = {
  coach: BookingCoach | null;
  onClose: () => void;
};

export function BookingModal({ coach, onClose }: Props) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [uid, setUid] = useState("");
  const [ign, setIgn] = useState("");
  const [contact, setContact] = useState("");
  const [sessionType, setSessionType] = useState<string | null>(null);
  const [areas, setAreas] = useState<string[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const next7Days = useMemo(() => {
    const days: { value: string; day: string; date: string }[] = [];
    const now = new Date();
    for (let i = 1; i <= 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      days.push({
        value: d.toISOString().slice(0, 10),
        day: d.toLocaleDateString("en-US", { weekday: "short" }),
        date: d.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
      });
    }
    return days;
  }, []);

  useEffect(() => {
    if (!coach) return;
    setStep(0);
    setDone(false);
    setUid("");
    setIgn("");
    setContact("");
    setSessionType(null);
    setAreas([]);
    setDate(null);
    setSlot(null);
    setTouched(false);
  }, [coach]);

  useEffect(() => {
    if (!coach) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [coach, onClose]);

  if (!coach) return null;

  const selectedSession = SESSION_TYPES.find((s) => s.id === sessionType) ?? null;

  const stepValid = [
    /^\d{8,12}$/.test(uid.trim()) && ign.trim().length >= 3 && contact.trim().length >= 5,
    sessionType !== null,
    areas.length > 0,
    date !== null && slot !== null,
    true,
  ][step];

  const errorFor = (field: "uid" | "ign" | "contact") => {
    if (!touched) return null;
    if (field === "uid" && !/^\d{8,12}$/.test(uid.trim()))
      return "Enter your numeric Free Fire UID (8–12 digits). Find it under your in-game profile banner.";
    if (field === "ign" && ign.trim().length < 3) return "Enter your in-game name (min 3 characters).";
    if (field === "contact" && contact.trim().length < 5)
      return "Enter a WhatsApp number or Discord username so your coach can reach you.";
    return null;
  };

  const next = () => {
    if (!stepValid) {
      setTouched(true);
      return;
    }
    setTouched(false);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => {
    setTouched(false);
    setStep((s) => Math.max(s - 1, 0));
  };

  const resetForm = () => {
    setStep(0);
    setDone(false);
    setUid("");
    setIgn("");
    setContact("");
    setSessionType(null);
    setAreas([]);
    setDate(null);
    setSlot(null);
    setTouched(false);
    setSaveError(null);
  };

  const confirmBooking = async () => {
    if (!selectedSession || !date || !slot || saving) return;
    setSaving(true);
    setSaveError(null);
    const { error } = await supabase.from("bookings").insert({
      free_fire_uid: uid.trim(),
      ign: ign.trim(),
      whatsapp: contact.trim(),
      session_type: selectedSession.name,
      selected_date: date,
      time_slot: slot,
    });
    setSaving(false);
    if (error) {
      setSaveError("We couldn't save your booking. Please try again.");
      return;
    }
    setDone(true);
  };

  const summaryDate = date
    ? new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    : "";

  const inputCls =
    "w-full rounded-md border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";
  const labelCls = "mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-background/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Book a session with ${coach.name}`}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-surface outline-none sm:rounded-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent font-display text-lg text-primary-foreground">
              {coach.initials}
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1 truncate font-display text-lg leading-tight">
                {coach.name}
                <BadgeCheck className="h-4 w-4 shrink-0 text-gold" />
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {coach.handle} · {coach.rank}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close booking"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {done ? (
          /* Success state */
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <span className="ring-glow grid h-16 w-16 place-items-center rounded-full bg-primary/15 text-primary">
              <PartyPopper className="h-8 w-8" />
            </span>
            <h3 className="mt-5 font-display text-3xl">Booking Confirmed!</h3>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              Your coach has received your Free Fire UID and will contact you shortly.
            </p>
            <button
              type="button"
              onClick={resetForm}
              className="mt-6 w-full rounded-md bg-primary py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Book Another Session
            </button>
          </div>
        ) : (
          <>
            {/* Step indicator */}
            <div className="border-b border-border px-4 py-3">
              <ol className="flex items-center gap-1.5" aria-label="Booking progress">
                {STEPS.map((label, i) => (
                  <li key={label} className="flex flex-1 flex-col gap-1.5">
                    <span
                      className={`h-1 rounded-full transition-colors ${
                        i <= step ? "bg-primary" : "bg-surface-2"
                      }`}
                    />
                    <span
                      className={`hidden text-[10px] font-bold uppercase tracking-wide sm:block ${
                        i === step ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {label}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-xs font-bold uppercase tracking-widest text-gold sm:hidden">
                Step {step + 1} of {STEPS.length} — {STEPS[step]}
              </p>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-5">
              {step === 0 && (
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 font-display text-2xl">
                    <Gamepad2 className="h-5 w-5 text-primary" /> Your gamer info
                  </h3>
                  <div>
                    <label htmlFor="bk-uid" className={labelCls}>
                      Free Fire UID
                    </label>
                    <input
                      id="bk-uid"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={uid}
                      onChange={(e) => setUid(e.target.value.replace(/\D/g, "").slice(0, 12))}
                      placeholder="e.g. 2345678901"
                      className={inputCls}
                    />
                    <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                      Numbers only, 8–12 digits. Open Free Fire → tap your profile banner (top-left)
                      → your UID is the number under your IGN.
                    </p>
                    {errorFor("uid") && (
                      <p className="mt-1 text-[11px] font-semibold text-destructive">{errorFor("uid")}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="bk-ign" className={labelCls}>
                      In-Game Name (IGN)
                    </label>
                    <input
                      id="bk-ign"
                      value={ign}
                      onChange={(e) => setIgn(e.target.value)}
                      placeholder="e.g. HEADSHOTxRAJA"
                      className={inputCls}
                    />
                    {errorFor("ign") && (
                      <p className="mt-1 text-[11px] font-semibold text-destructive">{errorFor("ign")}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="bk-contact" className={labelCls}>
                      WhatsApp number or Discord username
                    </label>
                    <input
                      id="bk-contact"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="e.g. +91 98765 43210 or raja#1234"
                      className={inputCls}
                    />
                    {errorFor("contact") && (
                      <p className="mt-1 text-[11px] font-semibold text-destructive">
                        {errorFor("contact")}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div>
                  <h3 className="flex items-center gap-2 font-display text-2xl">
                    <Wallet className="h-5 w-5 text-primary" /> Pick your session
                  </h3>
                  <div className="mt-4 space-y-3" role="radiogroup" aria-label="Session type">
                    {SESSION_TYPES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        role="radio"
                        aria-checked={sessionType === s.id}
                        onClick={() => setSessionType(s.id)}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl border p-4 text-left transition-colors ${
                          sessionType === s.id
                            ? "border-primary bg-primary/10"
                            : "border-border bg-surface-2 hover:border-primary/50"
                        }`}
                      >
                        <span>
                          <span className="block font-display text-xl">{s.name}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">{s.desc}</span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block font-display text-xl text-gold">₹{s.inr}</span>
                          <span className="block text-[10px] uppercase text-muted-foreground">
                            ≈ ${s.usd}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                  {touched && sessionType === null && (
                    <p className="mt-2 text-[11px] font-semibold text-destructive">
                      Choose a session type to continue.
                    </p>
                  )}
                </div>
              )}

              {step === 2 && (
                <div>
                  <h3 className="flex items-center gap-2 font-display text-2xl">
                    <Flame className="h-5 w-5 text-primary" /> What should we work on?
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Select at least one — your coach builds the session around these.
                  </p>
                  <div className="mt-4 space-y-2">
                    {IMPROVEMENT_AREAS.map((area) => {
                      const checked = areas.includes(area);
                      return (
                        <button
                          key={area}
                          type="button"
                          role="checkbox"
                          aria-checked={checked}
                          onClick={() =>
                            setAreas((prev) =>
                              checked ? prev.filter((a) => a !== area) : [...prev, area],
                            )
                          }
                          className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                            checked
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border bg-surface-2 text-muted-foreground hover:border-primary/50"
                          }`}
                        >
                          <span
                            className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${
                              checked ? "border-primary bg-primary text-primary-foreground" : "border-border"
                            }`}
                          >
                            {checked && <Check className="h-3.5 w-3.5" />}
                          </span>
                          {area}
                        </button>
                      );
                    })}
                  </div>
                  {touched && areas.length === 0 && (
                    <p className="mt-2 text-[11px] font-semibold text-destructive">
                      Pick at least one improvement area.
                    </p>
                  )}
                </div>
              )}

              {step === 3 && (
                <div>
                  <h3 className="flex items-center gap-2 font-display text-2xl">
                    <CalendarDays className="h-5 w-5 text-primary" /> Schedule it
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sessions can be booked up to 7 days ahead.
                  </p>
                  <p className={`${labelCls} mt-4`}>Date (next 7 days)</p>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-7" role="radiogroup" aria-label="Date">
                    {next7Days.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        role="radio"
                        aria-checked={date === d.value}
                        onClick={() => setDate(d.value)}
                        className={`rounded-lg border px-1 py-2 text-center transition-colors ${
                          date === d.value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-surface-2 hover:border-primary/50"
                        }`}
                      >
                        <span className="block text-[10px] font-bold uppercase">{d.day}</span>
                        <span className="block text-xs">{d.date}</span>
                      </button>
                    ))}
                  </div>
                  <p className={`${labelCls} mt-5`}>Time slot</p>
                  <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Time slot">
                    {TIME_SLOTS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        role="radio"
                        aria-checked={slot === t}
                        onClick={() => setSlot(t)}
                        className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-bold transition-colors ${
                          slot === t
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-surface-2 hover:border-primary/50"
                        }`}
                      >
                        <Clock className="h-3.5 w-3.5" />
                        {t}
                      </button>
                    ))}
                  </div>
                  {touched && (!date || !slot) && (
                    <p className="mt-2 text-[11px] font-semibold text-destructive">
                      Pick a date and a time slot.
                    </p>
                  )}
                </div>
              )}

              {step === 4 && (
                <div>
                  <h3 className="flex items-center gap-2 font-display text-2xl">
                    <User className="h-5 w-5 text-primary" /> Booking summary
                  </h3>
                  <dl className="mt-4 space-y-3 rounded-xl border border-border bg-surface-2 p-4 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">Coach</dt>
                      <dd className="flex items-center gap-1.5 font-semibold">
                        {coach.name}
                        <BadgeCheck className="h-3.5 w-3.5 text-gold" />
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                      <dt className="text-muted-foreground">Session</dt>
                      <dd className="text-right font-semibold">{selectedSession?.name}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                      <dt className="text-muted-foreground">Player</dt>
                      <dd className="text-right font-semibold">
                        {ign} <span className="text-muted-foreground">({uid})</span>
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                      <dt className="text-muted-foreground">Date &amp; time</dt>
                      <dd className="font-semibold text-gold">
                        {summaryDate} · {slot}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-3 border-t border-border pt-3">
                      <dt className="shrink-0 text-muted-foreground">Focus areas</dt>
                      <dd className="text-right text-xs font-semibold leading-relaxed">
                        {areas.join(" · ")}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                      <dt className="text-muted-foreground">Total</dt>
                      <dd className="font-display text-2xl text-gold">
                        ₹{selectedSession?.inr}{" "}
                        <span className="text-xs text-muted-foreground">≈ ${selectedSession?.usd}</span>
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    Demo checkout — no real payment is processed.
                  </p>
                  {saveError && (
                    <p className="mt-2 text-[11px] font-semibold text-destructive">{saveError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-2 border-t border-border px-4 py-3">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={back}
                  className="flex items-center gap-1 rounded-md border border-border px-4 py-2.5 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
              ) : (
                <span className="px-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  Step 1 of {STEPS.length}
                </span>
              )}
              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={next}
                  className="ml-auto rounded-md bg-primary px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setDone(true)}
                  className="ring-glow ml-auto rounded-md bg-primary px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Confirm &amp; Pay ₹{selectedSession?.inr}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
