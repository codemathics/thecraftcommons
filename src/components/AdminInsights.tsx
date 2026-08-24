import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";

type Slice = { label: string; count: number };

type Insights = {
  total: number;
  committed: number;
  by_status: Slice[];
  makes: Slice[];
  ai_tools: Slice[];
  main_tools: Slice[];
  countries: Slice[];
  experience: Slice[];
  figma: Slice[];
};

function Bars({
  title,
  note,
  data,
  total,
}: {
  title: string;
  note?: string;
  data: Slice[];
  total: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <section className="insight">
      <header className="insight__head">
        <h2 className="insight__title">{title}</h2>
        {note && <p className="admin__note">{note}</p>}
      </header>
      {data.length === 0 ? (
        <p className="admin__note">No data yet.</p>
      ) : (
        <ul className="insight__bars">
          {data.map((d) => (
            <li className="insight__bar" key={d.label}>
              <span className="insight__bar-label">{d.label}</span>
              <span className="insight__bar-track">
                <span
                  className="insight__bar-fill"
                  style={{ width: `${(d.count / max) * 100}%` }}
                />
              </span>
              <span className="insight__bar-value">
                {d.count}
                <span className="admin__muted">
                  {" "}
                  · {total ? Math.round((d.count / total) * 100) : 0}%
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function AdminInsights() {
  const [data, setData] = useState<Insights | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase.rpc("admin_insights");
      if (error || !data) {
        setState("error");
        return;
      }
      setData(data as unknown as Insights);
      setState("ready");
    })();
  }, []);

  if (state === "loading") return <p className="admin__note">Loading…</p>;
  if (state === "error" || !data)
    return <p className="admin__note">Couldn't load insights.</p>;

  const t = data.total;

  return (
    <div className="insights">
      <header className="insights__head">
        <p className="step__eyebrow">the craft c()mmons · pilot cohort</p>
        <h1 className="admin__title">Who applied</h1>
        <div className="insights__stats">
          <div className="insights__stat">
            <span className="insights__stat-value">{t}</span>
            <span className="admin__note">applications</span>
          </div>
          <div className="insights__stat">
            <span className="insights__stat-value">
              {data.countries.length}
            </span>
            <span className="admin__note">countries</span>
          </div>
          <div className="insights__stat">
            <span className="insights__stat-value">
              {t ? Math.round((data.committed / t) * 100) : 0}%
            </span>
            <span className="admin__note">committed to the three months</span>
          </div>
        </div>
      </header>

      <div className="insights__grid">
        <Bars
          title="Discipline"
          note="What applicants make — multiple answers allowed."
          data={data.makes}
          total={t}
        />
        <Bars
          title="AI tools already in use"
          data={data.ai_tools}
          total={t}
        />
        <Bars title="Main tools" data={data.main_tools} total={t} />
        <Bars title="Country" data={data.countries} total={t} />
        <Bars title="Experience level" data={data.experience} total={t} />
        <Bars title="Figma usage" data={data.figma} total={t} />
        <Bars title="Pipeline status" data={data.by_status} total={t} />
      </div>
    </div>
  );
}
