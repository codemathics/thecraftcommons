import { useCallback, useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";

type CohortRow = {
  cohort_id: string;
  application_id: string;
  name: string;
  email: string;
  country: string;
  experience: string;
  makes: string[];
  intended_artifact: string | null;
  shipped_artifact_url: string | null;
  shipped_at: string | null;
  notes: string | null;
  selected_at: string;
};

function Member({ row, onSaved }: { row: CohortRow; onSaved: () => void }) {
  const [url, setUrl] = useState(row.shipped_artifact_url ?? "");
  const [shippedAt, setShippedAt] = useState(
    row.shipped_at ? row.shipped_at.slice(0, 10) : ""
  );
  const [notes, setNotes] = useState(row.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    const { error } = await supabase
      .from("cohort_members")
      .update({
        shipped_artifact_url: url.trim() || null,
        shipped_at: shippedAt ? new Date(shippedAt).toISOString() : null,
        notes: notes.trim() || null,
      })
      .eq("id", row.cohort_id);
    setSaving(false);
    if (error) {
      setError("That didn't save. Try again in a moment.");
      return;
    }
    setSaved(true);
    onSaved();
  };

  const shipped = Boolean(row.shipped_artifact_url);

  return (
    <article className="admin__card cohort__card">
      <header className="admin__identity">
        <h2 className="admin__title">{row.name}</h2>
        <p className="admin__note">
          <a href={`mailto:${row.email}`}>{row.email}</a> · {row.country} ·{" "}
          {row.experience}
        </p>
        <div className="chips cohort__chips">
          {row.makes.map((m) => (
            <span className="chip" key={m}>
              {m}
            </span>
          ))}
          <span className={`chip ${shipped ? "chip--selected" : ""}`}>
            {shipped ? "Shipped" : "In progress"}
          </span>
        </div>
      </header>

      <div className="admin__answer">
        <p className="chip-group__label">Intended artifact (at selection)</p>
        <div className="admin__answer-body">
          {row.intended_artifact || <span className="admin__muted">—</span>}
        </div>
      </div>

      <div className="cohort__fields">
        <label className="field__label" htmlFor={`url-${row.cohort_id}`}>
          Shipped artifact URL
        </label>
        <span className="field__control">
          <input
            id={`url-${row.cohort_id}`}
            type="url"
            placeholder="https://"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </span>

        <label className="field__label" htmlFor={`date-${row.cohort_id}`}>
          Shipped on
        </label>
        <span className="field__control">
          <input
            id={`date-${row.cohort_id}`}
            type="date"
            value={shippedAt}
            onChange={(e) => setShippedAt(e.target.value)}
          />
        </span>

        <label className="field__label" htmlFor={`notes-${row.cohort_id}`}>
          Notes
        </label>
        <span className="field__control field__control--area">
          <textarea
            id={`notes-${row.cohort_id}`}
            rows={3}
            value={notes}
            placeholder="Check-ins, blockers, what changed against the intention."
            onChange={(e) => setNotes(e.target.value)}
          />
        </span>

        {error && <p className="apply__incomplete">{error}</p>}

        <button
          className="home__cta"
          type="button"
          disabled={saving}
          onClick={save}
        >
          {saving ? "Saving…" : saved ? "Saved" : "Save"}
        </button>
      </div>
    </article>
  );
}

export default function AdminCohort() {
  const [rows, setRows] = useState<CohortRow[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_cohort");
    if (error) {
      setState("error");
      return;
    }
    setRows((data ?? []) as CohortRow[]);
    setState("ready");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === "loading") return <p className="admin__note">Loading…</p>;
  if (state === "error")
    return <p className="admin__note">Couldn't load the cohort.</p>;

  const shipped = rows.filter((r) => r.shipped_artifact_url).length;

  return (
    <div className="cohort">
      <header className="insights__head">
        <p className="step__eyebrow">three-month pilot</p>
        <h1 className="admin__title">Cohort accountability</h1>
        <p className="admin__note">
          {rows.length} selected · {shipped} shipped
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="admin__note">
          No one selected yet. Mark an application “selected” on the review
          screen and their cohort record appears here.
        </p>
      ) : (
        <div className="cohort__list">
          {rows.map((r) => (
            <Member key={r.cohort_id} row={r} onSaved={load} />
          ))}
        </div>
      )}
    </div>
  );
}
