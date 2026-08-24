import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../integrations/supabase/client";

type AdminApplication = {
  id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  country: string;
  experience: string;
  makes: string[];
  makes_other: string | null;
  work_link: string | null;
  main_tools: string[];
  main_tool_other: string | null;
  figma_edu: string | null;
  ai_tools: string[];
  ai_tools_other: string | null;
  ai_made: string | null;
  make_3mo: string | null;
  stopping: string | null;
  committed: boolean;
  status: string;
  reviewed: boolean;
  my_ambition: number | null;
  my_craft_evidence: number | null;
  my_unblock_fit: number | null;
  my_commitment_readiness: number | null;
  my_notes: string | null;
  my_reviewed_at: string | null;
};

const RUBRIC = [
  {
    key: "ambition",
    label: "Ambition",
    hint: "The three-month answer — is it worth finishing?",
  },
  {
    key: "craft_evidence",
    label: "Craft evidence",
    hint: "The work link and what they've made with AI.",
  },
  {
    key: "unblock_fit",
    label: "Unblock fit",
    hint: "Does the program actually remove their stated blocker?",
  },
  {
    key: "commitment_readiness",
    label: "Commitment readiness",
    hint: "Are they ready to show up for the cohort?",
  },
] as const;

type RubricKey = (typeof RUBRIC)[number]["key"];
type Scores = Record<RubricKey, number | null>;

const EMPTY_SCORES: Scores = {
  ambition: null,
  craft_evidence: null,
  unblock_fit: null,
  commitment_readiness: null,
};

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setBusy(false);
      setError("That email and password didn't match an admin account.");
    }
  };

  return (
    <div className="admin__inner admin__inner--narrow">
      <p className="step__eyebrow">the craft c()mmons</p>
      <h1 className="admin__title">Reviewer sign in</h1>
      <form className="admin__login" onSubmit={signIn}>
        <label className="field__label" htmlFor="admin-email">
          Email
        </label>
        <span className="field__control">
          <input
            id="admin-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </span>
        <label className="field__label" htmlFor="admin-password">
          Password
        </label>
        <span className="field__control">
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </span>
        {error && <p className="apply__incomplete">{error}</p>}
        <button className="home__cta" type="submit" disabled={busy}>
          {busy ? "Checking…" : "Sign in"}
        </button>
      </form>
      <p className="admin__note">
        Accounts are created by hand — there is no sign-up.
      </p>
    </div>
  );
}

function Answer({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="admin__answer">
      <p className="chip-group__label">{label}</p>
      <div className="admin__answer-body">{children}</div>
    </div>
  );
}

function Tags({ items, other }: { items: string[]; other?: string | null }) {
  const all = other ? [...items.filter((i) => i !== "Other"), other] : items;
  if (all.length === 0) return <span className="admin__muted">—</span>;
  return (
    <div className="chips">
      {all.map((t) => (
        <span className="chip" key={t}>
          {t}
        </span>
      ))}
    </div>
  );
}

function ReviewCard({
  app,
  onSaved,
}: {
  app: AdminApplication;
  onSaved: () => void;
}) {
  const [scores, setScores] = useState<Scores>(EMPTY_SCORES);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setScores(
      app.reviewed
        ? {
            ambition: app.my_ambition,
            craft_evidence: app.my_craft_evidence,
            unblock_fit: app.my_unblock_fit,
            commitment_readiness: app.my_commitment_readiness,
          }
        : EMPTY_SCORES
    );
    setNotes(app.my_notes ?? "");
    setError("");
  }, [app]);

  const complete = RUBRIC.every((r) => scores[r.key] !== null);
  const locked = app.reviewed;

  const save = async () => {
    if (!complete || locked) return;
    setSaving(true);
    setError("");
    const { error } = await supabase.from("reviews").insert({
      application_id: app.id,
      ambition: scores.ambition!,
      craft_evidence: scores.craft_evidence!,
      unblock_fit: scores.unblock_fit!,
      commitment_readiness: scores.commitment_readiness!,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) {
      setError("That didn't save. Try again in a moment.");
      return;
    }
    onSaved();
  };

  return (
    <article className="admin__card">
      <header className="admin__identity">
        {locked ? (
          <>
            <h2 className="admin__title">{app.name}</h2>
            <p className="admin__note">
              <a href={`mailto:${app.email}`}>{app.email}</a> · scored{" "}
              {app.my_reviewed_at
                ? new Date(app.my_reviewed_at).toLocaleDateString()
                : ""}
            </p>
          </>
        ) : (
          <>
            <h2 className="admin__title admin__title--masked">
              Applicant hidden
            </h2>
            <p className="admin__note">
              Name and email stay hidden until you save your scores.
            </p>
          </>
        )}
      </header>

      <div className="admin__answers">
        <Answer label="Country">{app.country}</Answer>
        <Answer label="Where they are">{app.experience}</Answer>
        <Answer label="What they make">
          <Tags items={app.makes} other={app.makes_other} />
        </Answer>
        <Answer label="Work link">
          {app.work_link ? (
            <a href={app.work_link} target="_blank" rel="noreferrer noopener">
              {app.work_link}
            </a>
          ) : (
            <span className="admin__muted">—</span>
          )}
        </Answer>
        <Answer label="Main tools">
          <Tags items={app.main_tools} other={app.main_tool_other} />
        </Answer>
        {app.figma_edu && (
          <Answer label="Figma Education">{app.figma_edu}</Answer>
        )}
        <Answer label="AI tools">
          <Tags items={app.ai_tools} other={app.ai_tools_other} />
        </Answer>
        <Answer label="What they've made with them">
          {app.ai_made || <span className="admin__muted">—</span>}
        </Answer>
        <Answer label="What they'd make in 3 months">
          {app.make_3mo || <span className="admin__muted">—</span>}
        </Answer>
        <Answer label="What's stopping them">
          {app.stopping || <span className="admin__muted">—</span>}
        </Answer>
        <Answer label="Committed">{app.committed ? "Yes" : "No"}</Answer>
      </div>

      <div className="admin__rubric">
        {RUBRIC.map((r) => (
          <div className="admin__score" key={r.key}>
            <p className="field__label">{r.label}</p>
            <p className="field__hint">{r.hint}</p>
            <div className="chips">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  disabled={locked}
                  aria-pressed={scores[r.key] === n}
                  className={`chip admin__score-chip ${
                    scores[r.key] === n ? "chip--selected" : ""
                  }`}
                  onClick={() => setScores((s) => ({ ...s, [r.key]: n }))}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="admin__score">
          <p className="field__label">Notes</p>
          <span className="field__control field__control--area">
            <textarea
              rows={3}
              disabled={locked}
              value={notes}
              placeholder="Optional — for you and the other reviewer."
              onChange={(e) => setNotes(e.target.value)}
            />
          </span>
        </div>

        {error && <p className="apply__incomplete">{error}</p>}

        {locked ? (
          <p className="admin__note">
            Your score is locked. Identity revealed above.
          </p>
        ) : (
          <button
            className="home__cta"
            type="button"
            disabled={!complete || saving}
            onClick={save}
          >
            {saving ? "Saving…" : "Save scores & reveal"}
          </button>
        )}
      </div>
    </article>
  );
}

function Console({ session }: { session: Session }) {
  const [apps, setApps] = useState<AdminApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<"queue" | "done">("queue");

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_applications");
    setLoading(false);
    if (error) {
      setDenied(true);
      return;
    }
    const rows = (data ?? []) as AdminApplication[];
    setApps(rows);
    setActiveId((prev) =>
      prev && rows.some((r) => r.id === prev)
        ? prev
        : rows.find((r) => !r.reviewed)?.id ?? rows[0]?.id ?? null
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const queue = useMemo(() => apps.filter((a) => !a.reviewed), [apps]);
  const done = useMemo(() => apps.filter((a) => a.reviewed), [apps]);
  const list = tab === "queue" ? queue : done;
  const active = apps.find((a) => a.id === activeId) ?? null;

  if (loading) return <p className="admin__note admin__inner">Loading…</p>;

  if (denied)
    return (
      <div className="admin__inner admin__inner--narrow">
        <h1 className="admin__title">No reviewer access</h1>
        <p className="admin__note">
          This account isn't on the reviewer list.{" "}
          <button
            className="apply__back"
            onClick={() => supabase.auth.signOut()}
          >
            Sign out
          </button>
        </p>
      </div>
    );

  return (
    <div className="admin__inner">
      <div className="apply__top">
        <p className="step__eyebrow">
          {session.user.email} · {queue.length} to score
        </p>
        <button className="apply__back" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </div>

      <div className="admin__layout">
        <aside className="admin__queue">
          <div className="chips admin__tabs">
            <button
              className={`chip ${tab === "queue" ? "chip--selected" : ""}`}
              onClick={() => setTab("queue")}
            >
              Queue ({queue.length})
            </button>
            <button
              className={`chip ${tab === "done" ? "chip--selected" : ""}`}
              onClick={() => setTab("done")}
            >
              Scored ({done.length})
            </button>
          </div>
          {list.length === 0 && (
            <p className="admin__note">
              {tab === "queue"
                ? "Queue clear — nothing left to score."
                : "Nothing scored yet."}
            </p>
          )}
          <ul className="admin__list">
            {list.map((a, i) => (
              <li key={a.id}>
                <button
                  className={`admin__list-item ${
                    a.id === activeId ? "admin__list-item--active" : ""
                  }`}
                  onClick={() => setActiveId(a.id)}
                >
                  <span className="admin__list-title">
                    {a.reviewed ? a.name : `Applicant ${i + 1}`}
                  </span>
                  <span className="admin__muted">
                    {a.country} · {a.experience}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="admin__main">
          {active ? (
            <ReviewCard app={active} onSaved={load} />
          ) : (
            <p className="admin__note">No applications yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}

export default function Admin() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setReady(true);
    });
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!ready) return null;

  return (
    <main className="admin">
      {session ? <Console session={session} /> : <Login />}
    </main>
  );
}
