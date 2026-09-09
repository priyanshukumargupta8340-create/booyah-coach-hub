import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BadgeCheck,
  ChevronDown,
  Crosshair,
  Flame,
  Globe,
  Headset,
  Menu,
  Search,
  Shield,
  Star,
  Swords,
  Target,
  Trophy,
  User,
  X,
} from "lucide-react";

import heroSquad from "@/assets/hero-squad.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BooyahCoach — Book Verified Free Fire Coaches" },
      {
        name: "description",
        content:
          "Find verified Free Fire and Free Fire MAX coaches for rank push, aim training, IGL strategy and tournament prep. Sessions from ₹149.",
      },
      { property: "og:title", content: "BooyahCoach — Book Verified Free Fire Coaches" },
      {
        property: "og:description",
        content:
          "Rank push, aim training, IGL strategy and tournament prep with verified Free Fire coaches.",
      },
    ],
  }),
  component: Home,
});

const CATEGORIES = [
  {
    icon: Trophy,
    title: "Rank Push",
    tag: "Bronze → Heroic",
    copy: "Structured lobbies, survival routing and point-safe rotations to climb without tilt.",
    sessions: "1,820 sessions",
  },
  {
    icon: Crosshair,
    title: "Aim & Sensitivity",
    tag: "Headshot rate",
    copy: "Custom DPI and sensitivity tuning, drag headshots, and daily training-room drills.",
    sessions: "1,145 sessions",
  },
  {
    icon: Swords,
    title: "Clash Squad & IGL",
    tag: "Team play",
    copy: "Economy calls, gloo-wall duels, entry timing and shot-calling frameworks for squads.",
    sessions: "960 sessions",
  },
  {
    icon: Shield,
    title: "Tournament Prep",
    tag: "Scrims & VOD",
    copy: "Scrim reviews, zone-priority drafts and full VOD breakdowns before your next event.",
    sessions: "540 sessions",
  },
];

const FILTERS = ["All", "Rank Push", "Aim", "Clash Squad", "Tournament"] as const;

type Coach = {
  name: string;
  handle: string;
  initials: string;
  rank: string;
  region: string;
  langs: string;
  rating: number;
  reviews: number;
  price: number;
  tags: string[];
  headshot: number;
  blurb: string;
  live?: boolean;
};

const COACHES: Coach[] = [
  {
    name: "Aarav Khanna",
    handle: "@ghostpush",
    initials: "AK",
    rank: "Grandmaster · S12",
    region: "India",
    langs: "Hindi, English",
    rating: 4.9,
    reviews: 412,
    price: 349,
    tags: ["Rank Push", "Tournament"],
    headshot: 31,
    blurb: "Ex-tier-2 IGL. Takes solo players from Diamond to Heroic in 3 weeks of guided lobbies.",
    live: true,
  },
  {
    name: "Nadia Rahman",
    handle: "@sniperqueen",
    initials: "NR",
    rank: "Heroic · 4x MVP",
    region: "Bangladesh",
    langs: "Bengali, English",
    rating: 4.8,
    reviews: 287,
    price: 299,
    tags: ["Aim", "Clash Squad"],
    headshot: 38,
    blurb: "Sensitivity specialist. Rebuilds your control layout and drag-headshot muscle memory.",
  },
  {
    name: "Rizky Pratama",
    handle: "@zonelord",
    initials: "RP",
    rank: "Grandmaster · Top 300",
    region: "Indonesia",
    langs: "Bahasa, English",
    rating: 5.0,
    reviews: 158,
    price: 429,
    tags: ["Tournament", "Rank Push"],
    headshot: 27,
    blurb: "Scrim coach for competing squads. Zone-priority drafting and endgame rotation maps.",
    live: true,
  },
  {
    name: "Miguel Santos",
    handle: "@gloowall.mg",
    initials: "MS",
    rank: "Heroic · CS Specialist",
    region: "Brazil",
    langs: "Portuguese, English",
    rating: 4.7,
    reviews: 203,
    price: 249,
    tags: ["Clash Squad", "Aim"],
    headshot: 34,
    blurb: "4v4 economy and gloo-wall duel drills. Great for players stuck at 50% CS win rate.",
  },
  {
    name: "Sana Iqbal",
    handle: "@calmigl",
    initials: "SI",
    rank: "Heroic · Analyst",
    region: "Pakistan",
    langs: "Urdu, English",
    rating: 4.9,
    reviews: 176,
    price: 199,
    tags: ["Rank Push", "Clash Squad"],
    headshot: 24,
    blurb: "Patient with beginners. VOD reviews with written notes after every single session.",
  },
  {
    name: "Kwame Mensah",
    handle: "@onetapkw",
    initials: "KM",
    rank: "Grandmaster · Aim Lab",
    region: "Nigeria",
    langs: "English",
    rating: 4.8,
    reviews: 121,
    price: 149,
    tags: ["Aim"],
    headshot: 41,
    blurb: "Training-room grinder. 30-minute reflex sprints designed for low-end MAX devices.",
  },
];

function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const coaches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return COACHES.filter((c) => {
      const matchesFilter = filter === "All" || c.tags.includes(filter);
      const matchesQuery =
        !q ||
        [c.name, c.handle, c.region, c.langs, c.blurb, ...c.tags]
          .join(" ")
          .toLowerCase()
          .includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [query, filter]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <a href="#top" className="flex min-w-0 items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary">
              <Flame className="h-5 w-5 text-primary-foreground" />
            </span>
            <span className="truncate font-display text-2xl leading-none tracking-wide">
              Booyah<span className="text-primary">Coach</span>
            </span>
          </a>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              className="hidden items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground sm:flex"
            >
              <Globe className="h-4 w-4" />
              EN
              <ChevronDown className="h-3 w-3" />
            </button>
            <button
              type="button"
              aria-label="Profile"
              className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground"
            >
              <User className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="hidden rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 sm:block"
            >
              Log in
            </button>
            <button
              type="button"
              aria-label="Menu"
              onClick={() => setMenuOpen((v) => !v)}
              className="grid h-9 w-9 place-items-center rounded-md border border-border sm:hidden"
            >
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="border-t border-border bg-surface px-4 py-3 sm:hidden">
            <ul className="space-y-1 text-sm font-semibold">
              {["Find coaches", "Categories", "Become a coach", "Pricing"].map((item) => (
                <li key={item}>
                  <a
                    href="#coaches"
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-md px-2 py-2 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="flex items-center justify-center gap-1 rounded-md border border-border px-3 py-2 text-xs font-semibold">
                <Globe className="h-4 w-4" /> English
              </button>
              <button className="rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">
                Log in
              </button>
            </div>
          </nav>
        )}
      </header>

      <main id="top">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <img
            src={heroSquad}
            alt="Silhouetted battle royale squad watching a burning skyline at dusk"
            width={1280}
            height={960}
            className="absolute inset-0 h-full w-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background" />
          <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-14 sm:pt-20">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
              <Flame className="h-3.5 w-3.5" /> Free Fire &amp; FF MAX
            </span>
            <h1 className="mt-4 font-display text-5xl leading-[0.95] sm:text-7xl">
              Stop dropping. <br />
              <span className="text-gradient-fire">Start booyah-ing.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground">
              One-on-one coaching from verified Grandmaster and Heroic players. Rank push, aim
              tuning, clash squad IGL calls and full VOD breakdowns — in your language.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href="#coaches"
                className="ring-glow rounded-md bg-primary px-6 py-3 text-center text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Find your coach
              </a>
              <a
                href="#categories"
                className="rounded-md border border-gold/50 px-6 py-3 text-center text-sm font-bold uppercase tracking-wide text-gold transition-colors hover:bg-gold/10"
              >
                Become a coach
              </a>
            </div>

            <dl className="mt-10 grid grid-cols-3 gap-3">
              {[
                { v: "1,240+", l: "Verified coaches" },
                { v: "86k", l: "Sessions played" },
                { v: "4.9★", l: "Average rating" },
              ].map((s) => (
                <div
                  key={s.l}
                  className="rounded-lg border border-border bg-surface/80 px-3 py-3 text-center"
                >
                  <dt className="font-display text-2xl text-gold sm:text-3xl">{s.v}</dt>
                  <dd className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                    {s.l}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Search + filters */}
        <section id="coaches" className="mx-auto max-w-6xl px-4 py-10">
          <div className="rounded-xl border border-border bg-surface p-3">
            <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search coach, region or language"
                aria-label="Search coaches"
                className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
              />
              {query && (
                <button onClick={() => setQuery("")} aria-label="Clear search">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                    filter === f
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-baseline justify-between">
            <h2 className="font-display text-3xl">Verified coaches</h2>
            <span className="text-xs text-muted-foreground">{coaches.length} available</span>
          </div>

          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {coaches.map((c) => (
              <li
                key={c.handle}
                className="flex flex-col rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/60"
              >
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent font-display text-xl text-primary-foreground">
                    {c.initials}
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 truncate font-display text-xl leading-tight">
                      {c.name}
                      <BadgeCheck className="h-4 w-4 shrink-0 text-gold" />
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.handle} · {c.region}
                    </p>
                  </div>
                  <span className="shrink-0 text-right">
                    <span className="block font-display text-lg text-gold">₹{c.price}</span>
                    <span className="text-[10px] uppercase text-muted-foreground">/ session</span>
                  </span>
                </div>

                <p className="mt-3 text-sm text-muted-foreground">{c.blurb}</p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-md bg-surface-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                  {c.live && (
                    <span className="flex items-center gap-1 rounded-md bg-primary/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Online now
                    </span>
                  )}
                </div>

                <dl className="mt-4 grid grid-cols-3 gap-2 border-y border-border py-3 text-center">
                  <div>
                    <dt className="text-[10px] uppercase text-muted-foreground">Rating</dt>
                    <dd className="flex items-center justify-center gap-1 text-sm font-bold">
                      <Star className="h-3.5 w-3.5 fill-gold text-gold" />
                      {c.rating}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase text-muted-foreground">Headshot</dt>
                    <dd className="text-sm font-bold">{c.headshot}%</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase text-muted-foreground">Reviews</dt>
                    <dd className="text-sm font-bold">{c.reviews}</dd>
                  </div>
                </dl>

                <p className="mt-3 text-[11px] uppercase tracking-wide text-muted-foreground">
                  {c.rank} · {c.langs}
                </p>

                <button className="mt-3 w-full rounded-md bg-primary py-2.5 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90">
                  Book session
                </button>
              </li>
            ))}
          </ul>

          {coaches.length === 0 && (
            <p className="mt-8 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No coaches match that search yet. Try a different rank, language or region.
            </p>
          )}
        </section>

        {/* Categories */}
        <section id="categories" className="border-t border-border bg-surface/40">
          <div className="mx-auto max-w-6xl px-4 py-12">
            <h2 className="font-display text-3xl">Specialized coaching</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Four tracks built around how Free Fire is actually won — pick the one holding your
              lobby back.
            </p>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {CATEGORIES.map((c) => (
                <li
                  key={c.title}
                  className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-gold/50"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-lg bg-primary/15 text-primary">
                    <c.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-2xl">{c.title}</h3>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gold">
                    {c.tag}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{c.copy}</p>
                  <p className="mt-4 text-xs text-muted-foreground">{c.sessions} booked</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Trust strip */}
        <section className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: Shield, t: "Verified ranks", d: "Every coach proves their season rank and ID before listing." },
              { icon: Headset, t: "Voice or in-lobby", d: "Coach in custom rooms, live voice, or async VOD review." },
              { icon: Target, t: "Refund promise", d: "Not happy after the first session? Full credit back, no questions." },
            ].map((f) => (
              <div key={f.t} className="rounded-xl border border-border bg-surface p-5">
                <f.icon className="h-5 w-5 text-gold" />
                <h3 className="mt-3 text-xl">{f.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface/60">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-primary">
              <Flame className="h-4 w-4 text-primary-foreground" />
            </span>
            <span className="font-display text-xl">
              Booyah<span className="text-primary">Coach</span>
            </span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            An independent coaching marketplace for Free Fire and Free Fire MAX players. Not
            affiliated with or endorsed by the game's publisher.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { h: "Players", l: ["Find a coach", "Categories", "Pricing", "Gift cards"] },
              { h: "Coaches", l: ["Become a coach", "Verification", "Payouts", "Coach rules"] },
              { h: "Support", l: ["Help centre", "Contact us", "Safety", "Report a coach"] },
              { h: "Company", l: ["About", "Careers", "Terms", "Privacy"] },
            ].map((col) => (
              <div key={col.h}>
                <h3 className="text-sm uppercase tracking-widest text-gold">{col.h}</h3>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {col.l.map((link) => (
                    <li key={link}>
                      <a href="#top" className="transition-colors hover:text-foreground">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
            © {new Date().getFullYear()} BooyahCoach. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
