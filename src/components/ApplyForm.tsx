import { useEffect, useMemo, useState } from "react";
import PatternBand from "./PatternBand.tsx";
import { ICON_D } from "../lib/mark.ts";
import { supabase } from "../integrations/supabase/client";


const DRAFT_KEY = "cc-application-draft";
const STEP_KEY = "cc-application-step";

/** Output-framed identity — what they make, not what they're called */
const MAKES = [
  "Products & apps",
  "Brands & identities",
  "Motion & animation",
  "Illustration & art",
  "Film & video",
  "Websites & interactive",
  "Tools & code",
  "Music & audio",
  "Physical things",
  "Other",
];

interface ChipGroup {
  label: string;
  options: string[];
  /** which MAKES values this group is relevant to (absent = always shown) */
  for?: string[];
}

/** Main-tools groups, filtered by what the applicant makes */
const TOOL_GROUPS: ChipGroup[] = [
  {
    label: "Design & prototyping",
    options: ["Figma", "Framer", "Webflow", "ProtoPie", "Origami"],
    for: ["Products & apps", "Websites & interactive", "Brands & identities"],
  },
  {
    label: "Motion & 3D",
    options: ["After Effects", "Blender", "Cinema 4D", "Spline"],
    for: ["Motion & animation", "Film & video", "Illustration & art"],
  },
  {
    label: "Image & illustration",
    options: ["Photoshop / Illustrator", "Procreate", "Affinity"],
    for: ["Illustration & art", "Brands & identities", "Physical things"],
  },
  {
    label: "Film & video",
    options: ["Premiere Pro", "DaVinci Resolve", "Final Cut Pro", "CapCut"],
    for: ["Film & video", "Motion & animation"],
  },
  {
    label: "Audio",
    options: ["Ableton Live", "Logic Pro", "FL Studio"],
    for: ["Music & audio"],
  },
  {
    label: "Code",
    options: ["VS Code", "Cursor", "Claude Code", "Codex", "Xcode", "Terminal"],
    for: ["Tools & code", "Products & apps", "Websites & interactive"],
  },
  { label: "Anything else", options: ["Other"] },
];

const AI_TOOL_GROUPS: ChipGroup[] = [
  { label: "Assistants", options: ["Claude", "ChatGPT", "Gemini", "Perplexity", "NotebookLM"] },
  { label: "Image", options: ["Midjourney", "Ideogram", "Krea", "Leonardo", "Freepik"] },
  { label: "Video & audio", options: ["Runway", "Sora", "Veo", "Kling", "ElevenLabs", "Suno"] },
  { label: "Build & code", options: ["Cursor", "Claude Code", "Codex", "Lovable", "v0", "Bolt", "Replit", "Windsurf"] },
  { label: "Anything else", options: ["Other"] },
];

const EXPERIENCE = [
  "Student",
  "Recent graduate",
  "1–3 years",
  "4–7 years",
  "8+ years",
];

const FIGMA_EDU = ["Yes", "No", "Not sure"];

const COUNTRIES = [
  "Nigeria", "Ghana", "Kenya", "South Africa", "Egypt", "Morocco", "Ethiopia",
  "Tanzania", "Uganda", "Algeria", "Angola", "Benin", "Botswana",
  "Burkina Faso", "Burundi", "Cabo Verde", "Cameroon",
  "Central African Republic", "Chad", "Comoros", "Congo (DRC)",
  "Congo (Republic)", "Côte d'Ivoire", "Djibouti", "Equatorial Guinea",
  "Eritrea", "Eswatini", "Gabon", "Gambia", "Guinea", "Guinea-Bissau",
  "Lesotho", "Liberia", "Libya", "Madagascar", "Malawi", "Mali", "Mauritania",
  "Mauritius", "Mozambique", "Namibia", "Niger", "Rwanda",
  "São Tomé and Príncipe", "Senegal", "Seychelles", "Sierra Leone", "Somalia",
  "South Sudan", "Sudan", "Togo", "Tunisia", "Zambia", "Zimbabwe",
  "United Kingdom", "United States", "Canada", "France", "Germany",
  "Netherlands", "Portugal", "Spain", "Italy", "Ireland", "Brazil", "India",
  "United Arab Emirates", "Saudi Arabia", "Qatar", "Australia", "Japan",
  "China",
].sort((a, b) => a.localeCompare(b));

interface Draft {
  name: string;
  email: string;
  country: string;
  experience: string;
  makes: string[];
  makesOther: string;
  workLink: string;
  mainTools: string[];
  mainToolOther: string;
  figmaEdu: string;
  aiTools: string[];
  aiToolsOther: string;
  aiMade: string;
  make3mo: string;
  stopping: string;
  commit: boolean;
}

const EMPTY: Draft = {
  name: "",
  email: "",
  country: "",
  experience: "",
  makes: [],
  makesOther: "",
  workLink: "",
  mainTools: [],
  mainToolOther: "",
  figmaEdu: "",
  aiTools: [],
  aiToolsOther: "",
  aiMade: "",
  make3mo: "",
  stopping: "",
  commit: false,
};

function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      // migrate older drafts
      if (Array.isArray(p.disciplines) && !p.makes) p.makes = p.disciplines;
      if (typeof p.disciplineOther === "string" && !p.makesOther)
        p.makesOther = p.disciplineOther;
      return { ...EMPTY, ...p };
    }
  } catch {
    /* corrupted draft — start fresh */
  }
  return EMPTY;
}

function loadStep(): number {
  const n = parseInt(localStorage.getItem(STEP_KEY) ?? "0", 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/** Tiny inline stamp of the brand mark, used in chips and the checkbox */
function Stamp({ size = 12 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 822 900"
      width={size}
      height={(size * 900) / 822}
      aria-hidden="true"
      className="stamp"
    >
      <path d={ICON_D} fill="currentColor" />
    </svg>
  );
}

function Chip({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={`chip ${selected ? "chip--selected" : ""}`}
      aria-pressed={selected}
      onClick={onToggle}
    >
      {selected && <Stamp />}
      {label}
    </button>
  );
}

function ChipGroups({
  groups,
  selected,
  onToggle,
}: {
  groups: ChipGroup[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <>
      {groups.map((g) => (
        <div className="chip-group" key={g.label || "other"}>
          {g.label && <p className="chip-group__label">{g.label}</p>}
          <div className="chips">
            {g.options.map((o) => (
              <Chip
                key={o}
                label={o}
                selected={selected.includes(o)}
                onToggle={() => onToggle(o)}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

interface StepDef {
  key: string;
  section: string;
  valid: (d: Draft) => boolean;
  error: string;
  /** hide the step entirely when this returns false */
  when?: (d: Draft) => boolean;
}

const STEPS: StepDef[] = [
  { key: "name", section: "Who you are", valid: (d) => d.name.trim().length > 1, error: "We'd love to know your name." },
  { key: "email", section: "Who you are", valid: (d) => emailOk(d.email), error: "That email doesn't look right." },
  { key: "country", section: "Who you are", valid: (d) => d.country.trim().length > 1, error: "Which country are you in?" },
  { key: "experience", section: "Who you are", valid: (d) => d.experience !== "", error: "Pick the closest one." },
  { key: "makes", section: "What you make", valid: (d) => d.makes.length > 0 && (!d.makes.includes("Other") || d.makesOther.trim() !== ""), error: "Pick at least one — or tell us in your own words." },
  { key: "workLink", section: "What you make", valid: (d) => d.workLink.trim().length > 3, error: "A link helps us see your work." },
  { key: "mainTools", section: "What you make", valid: (d) => d.mainTools.length > 0 && (!d.mainTools.includes("Other") || d.mainToolOther.trim() !== ""), error: "Pick at least one — or name it." },
  { key: "figmaEdu", section: "What you make", valid: (d) => d.figmaEdu !== "", error: "Not sure is a fine answer.", when: (d) => d.mainTools.includes("Figma") },
  { key: "aiTools", section: "What you make", valid: (d) => d.aiTools.length > 0, error: "Pick at least one." },
  { key: "aiMade", section: "What you make", valid: (d) => d.aiMade.trim().length > 3, error: "A line is enough — even “nothing yet, but here's what I'd try”." },
  { key: "make3mo", section: "The ask", valid: (d) => d.make3mo.trim().length > 20, error: "Give us a little more — this is the question that matters." },
  { key: "stopping", section: "The ask", valid: (d) => d.stopping.trim().length > 10, error: "Honest and short is perfect." },
  { key: "commit", section: "The ask", valid: (d) => d.commit, error: "The program only works if you're in." },
];

const QUESTIONS: Record<string, string> = {
  name: "What's your full name?",
  email: "What's your email address?",
  country: "Which country do you live in?",
  experience: "Where are you in your creative journey?",
  makes: "What do you make?",
  workLink: "Link to something you've made",
  mainTools: "What are your main tools?",
  figmaEdu: "Do you have Figma Education verified status?",
  aiTools: "Which AI tools have you used?",
  aiMade: "What have you made with them?",
  make3mo:
    "What would you make in the next 3 months if tools weren't the problem?",
  stopping: "What's stopping you right now?",
  commit: "One last thing.",
};

export default function ApplyForm({
  onBack,
  onManifesto,
}: {
  onBack: () => void;
  onManifesto: () => void;
}) {
  const [d, setD] = useState<Draft>(loadDraft);
  const [step, setStep] = useState(loadStep);
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [showAllTools, setShowAllTools] = useState(false);

  // Country combobox state
  const [countryOpen, setCountryOpen] = useState(false);
  const [countryHi, setCountryHi] = useState(0);
  // Enter only auto-picks once the user has actively arrowed
  const [countryNav, setCountryNav] = useState(false);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setD((prev) => ({ ...prev, [key]: value }));

  const toggleIn = (key: "makes" | "aiTools" | "mainTools", v: string) =>
    setD((prev) => ({
      ...prev,
      [key]: prev[key].includes(v)
        ? prev[key].filter((t) => t !== v)
        : [...prev[key], v],
    }));

  useEffect(() => {
    if (!submitted) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
      localStorage.setItem(STEP_KEY, String(step));
    }
  }, [d, step, submitted]);

  /** Steps visible for this applicant (e.g. Figma Education only for Figma users) */
  const visibleSteps = useMemo(
    () => STEPS.filter((s) => !s.when || s.when(d)),
    [d]
  );

  const progress = useMemo(
    () => visibleSteps.filter((s) => s.valid(d)).length / visibleSteps.length,
    [d, visibleSteps]
  );

  const stepIdx = Math.min(step, visibleSteps.length - 1);
  const current = visibleSteps[stepIdx];
  const isLast = stepIdx === visibleSteps.length - 1;

  /** Tool groups relevant to what they make (plus a reveal-all escape hatch) */
  const relevantToolGroups = useMemo(() => {
    if (showAllTools || d.makes.length === 0 || d.makes.includes("Other"))
      return TOOL_GROUPS;
    const filtered = TOOL_GROUPS.filter(
      (g) => !g.for || g.for.some((m) => d.makes.includes(m))
    );
    return filtered;
  }, [d.makes, showAllTools]);
  const someToolsHidden = relevantToolGroups.length < TOOL_GROUPS.length;

  const countryMatches = useMemo(() => {
    const q = d.country.trim().toLowerCase();
    const list = q
      ? COUNTRIES.filter((c) => c.toLowerCase().includes(q))
      : COUNTRIES;
    return list.slice(0, 7);
  }, [d.country]);

  const goNext = () => {
    setAttempted(false);
    setCountryOpen(false);
    setStep(Math.min(stepIdx + 1, visibleSteps.length - 1));
  };

  const goBack = () => {
    setAttempted(false);
    setCountryOpen(false);
    if (stepIdx === 0) onBack();
    else setStep(stepIdx - 1);
  };

  /** single-select chips just select — advancing is always an explicit
      Next/Enter, so nobody gets yanked forward mid-thought */
  const pickAndGo = <K extends "experience" | "figmaEdu">(
    key: K,
    value: Draft[K]
  ) => {
    set(key, value);
  };

  const submit = async () => {
    setSubmitting(true);
    setSubmitError("");
    const usesFigma = d.mainTools.includes("Figma");
    const [{ error }] = await Promise.all([
      supabase.from("applications").insert({
        name: d.name,
        email: d.email,
        country: d.country,
        experience: d.experience,
        makes: d.makes,
        makes_other: d.makesOther || null,
        work_link: d.workLink || null,
        main_tools: d.mainTools,
        main_tool_other: d.mainToolOther || null,
        figma_edu: usesFigma ? d.figmaEdu || null : null,
        ai_tools: d.aiTools,
        ai_tools_other: d.aiToolsOther || null,
        ai_made: d.aiMade || null,
        make_3mo: d.make3mo || null,
        stopping: d.stopping || null,
        committed: d.commit,
      }),
      new Promise((r) => setTimeout(r, 900)),
    ]);
    if (error) {
      setSubmitting(false);
      setSubmitError(
        "That didn't send. Your answers are saved — try again in a moment."
      );
      return;
    }
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(STEP_KEY);
    setSubmitting(false);
    setSubmitted(true);
    window.dispatchEvent(new Event("cc-band-wave"));
  };


  const doAdvance = () => {
    if (submitting) return;
    if (!current.valid(d)) {
      setAttempted(true);
      return;
    }
    if (isLast) submit();
    else goNext();
  };

  const advance = (e: React.FormEvent) => {
    e.preventDefault();
    doAdvance();
  };

  /** Enter advances from any single-line input (textareas keep newlines) */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (
      e.key === "Enter" &&
      (e.target as HTMLElement).tagName !== "TEXTAREA" &&
      (e.target as HTMLElement).tagName !== "BUTTON"
    ) {
      e.preventDefault();
      doAdvance();
    }
  };

  const pickCountry = (c: string) => {
    set("country", c);
    setCountryOpen(false);
  };

  const onCountryKeyDown = (e: React.KeyboardEvent) => {
    if (!countryOpen || countryMatches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      setCountryNav(true);
      setCountryHi((i) =>
        countryNav ? Math.min(i + 1, countryMatches.length - 1) : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      setCountryNav(true);
      setCountryHi((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      // Only auto-pick when the user has actively arrowed; otherwise the
      // typed text stands and Enter falls through to advance the step
      if (countryNav) {
        e.preventDefault();
        e.stopPropagation();
        pickCountry(
          countryMatches[Math.min(countryHi, countryMatches.length - 1)]
        );
      } else {
        setCountryOpen(false);
      }
    } else if (e.key === "Escape") {
      setCountryOpen(false);
    }
  };

  const control = () => {
    switch (current.key) {
      case "name":
        return (
          <span className="field__control">
            <input
              type="text"
              autoComplete="name"
              autoFocus
              value={d.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </span>
        );
      case "email":
        return (
          <span className="field__control">
            <input
              type="email"
              autoComplete="email"
              autoFocus
              value={d.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </span>
        );
      case "country":
        return (
          <span className="field__control combo">
            <input
              type="text"
              autoFocus
              role="combobox"
              aria-expanded={countryOpen}
              aria-autocomplete="list"
              value={d.country}
              onChange={(e) => {
                set("country", e.target.value);
                setCountryOpen(true);
                setCountryHi(0);
                setCountryNav(false);
              }}
              onFocus={() => setCountryOpen(true)}
              onBlur={() => setCountryOpen(false)}
              onKeyDown={onCountryKeyDown}
              placeholder="Start typing…"
            />
            {countryOpen && countryMatches.length > 0 && (
              <span className="combo__list" role="listbox">
                {countryMatches.map((c, i) => (
                  <span
                    key={c}
                    role="option"
                    aria-selected={i === countryHi}
                    className={`combo__opt ${
                      i === countryHi ? "combo__opt--hi" : ""
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault(); // keep focus; fires before blur
                      pickCountry(c);
                    }}
                    onMouseEnter={() => setCountryHi(i)}
                  >
                    {c}
                  </span>
                ))}
              </span>
            )}
          </span>
        );
      case "experience":
        return (
          <div className="chips">
            {EXPERIENCE.map((o) => (
              <Chip
                key={o}
                label={o}
                selected={d.experience === o}
                onToggle={() => pickAndGo("experience", o)}
              />
            ))}
          </div>
        );
      case "makes":
        return (
          <>
            <span className="field__hint">
              Select all that apply — this shapes the rest of the form.
            </span>
            <div className="chips">
              {MAKES.map((o) => (
                <Chip
                  key={o}
                  label={o}
                  selected={d.makes.includes(o)}
                  onToggle={() => toggleIn("makes", o)}
                />
              ))}
            </div>
            {d.makes.includes("Other") && (
              <span className="field__control field__control--reveal">
                <input
                  type="text"
                  autoFocus
                  placeholder="Tell us what you make"
                  value={d.makesOther}
                  onChange={(e) => set("makesOther", e.target.value)}
                />
              </span>
            )}
          </>
        );
      case "workLink":
        return (
          <>
            <span className="field__hint">
              Portfolio, Behance, GitHub, a Figma file — anything you're proud
              of.
            </span>
            <span className="field__control">
              <input
                type="url"
                inputMode="url"
                autoFocus
                placeholder="https://"
                value={d.workLink}
                onChange={(e) => set("workLink", e.target.value)}
              />
            </span>
          </>
        );
      case "mainTools":
        return (
          <>
            <span className="field__hint">Select all that apply.</span>
            <ChipGroups
              groups={relevantToolGroups}
              selected={d.mainTools}
              onToggle={(o) => toggleIn("mainTools", o)}
            />
            {someToolsHidden && (
              <button
                type="button"
                className="apply__more-tools"
                onClick={() => setShowAllTools(true)}
              >
                Show all tools
              </button>
            )}
            {d.mainTools.includes("Other") && (
              <span className="field__control field__control--reveal">
                <input
                  type="text"
                  autoFocus
                  placeholder="Which ones?"
                  value={d.mainToolOther}
                  onChange={(e) => set("mainToolOther", e.target.value)}
                />
              </span>
            )}
          </>
        );
      case "figmaEdu":
        return (
          <>
            <span className="field__hint">
              This helps us allocate Figma seats for the cohort. Not sure?{" "}
              <a
                href="https://www.figma.com/education/"
                target="_blank"
                rel="noreferrer"
              >
                Check your status
              </a>
              .
            </span>
            <div className="chips">
              {FIGMA_EDU.map((o) => (
                <Chip
                  key={o}
                  label={o}
                  selected={d.figmaEdu === o}
                  onToggle={() => pickAndGo("figmaEdu", o)}
                />
              ))}
            </div>
          </>
        );
      case "aiTools":
        return (
          <>
            <span className="field__hint">Select all that apply.</span>
            <ChipGroups
              groups={AI_TOOL_GROUPS}
              selected={d.aiTools}
              onToggle={(o) => toggleIn("aiTools", o)}
            />
            {d.aiTools.includes("Other") && (
              <span className="field__control field__control--reveal">
                <input
                  type="text"
                  placeholder="Which others?"
                  value={d.aiToolsOther}
                  onChange={(e) => set("aiToolsOther", e.target.value)}
                />
              </span>
            )}
          </>
        );
      case "aiMade":
        return (
          <>
            <span className="field__hint">
              Projects, experiments, or nothing yet — beginners are welcome.
              If you're just starting, tell us what you'd like to try.
            </span>
            <span className="field__control field__control--area">
              <textarea
                rows={4}
                maxLength={800}
                autoFocus
                value={d.aiMade}
                onChange={(e) => set("aiMade", e.target.value)}
                placeholder="A project, an experiment — or what you'd like to make first."
              />
            </span>
            <span className="field__count">{d.aiMade.length}/800</span>
          </>
        );
      case "make3mo":
        return (
          <>
            <span className="field__control field__control--area">
              <textarea
                rows={5}
                maxLength={800}
                autoFocus
                value={d.make3mo}
                onChange={(e) => set("make3mo", e.target.value)}
                placeholder="Be specific — what is it, who is it for, what would exist at the end?"
              />
            </span>
            <span className="field__count">{d.make3mo.length}/800</span>
          </>
        );
      case "stopping":
        return (
          <>
            <span className="field__control field__control--area">
              <textarea
                rows={3}
                maxLength={400}
                autoFocus
                value={d.stopping}
                onChange={(e) => set("stopping", e.target.value)}
                placeholder="Honest answers help — tools, money, time, access, feedback…"
              />
            </span>
            <span className="field__count">{d.stopping.length}/400</span>
          </>
        );
      case "commit":
        return (
          <label className="commit">
            <input
              type="checkbox"
              checked={d.commit}
              onChange={(e) => set("commit", e.target.checked)}
            />
            <span className="commit__box" aria-hidden="true">
              {d.commit && <Stamp size={16} />}
            </span>
            <span className="commit__label">
              I commit to shipping one artifact by the program deadline.
            </span>
          </label>
        );
    }
  };

  return (
    <div className="apply">
      <div className="apply__band">
        <PatternBand progress={submitted ? 1 : progress} />
      </div>

      <div className="apply__inner">
        <div className="apply__top">
          <button type="button" className="apply__back" onClick={goBack}>
            ← back
          </button>
        </div>

        {submitted ? (
          <div className="apply__thanks">
            <h1>Application received.</h1>
            <p>
              Thank you — we read every application. You'll hear from us by
              email about the inaugural cohort.
            </p>
            <p className="apply__thanks-manifesto">
              While you wait —{" "}
              <button type="button" onClick={onManifesto}>
                read the Manifesto
              </button>
              .
            </p>
          </div>
        ) : (
          <form onSubmit={advance} onKeyDown={onKeyDown} noValidate>
            <div className="step" key={current.key}>
              <p className="step__eyebrow">
                {current.section} · {stepIdx + 1} / {visibleSteps.length}
              </p>
              <h1 className="step__q">{QUESTIONS[current.key]}</h1>
              {control()}
              {attempted && !current.valid(d) && (
                <p className="field__error">{current.error}</p>
              )}
              {submitError && <p className="apply__incomplete">{submitError}</p>}

              <div className="step__nav">
                <button
                  className="home__cta step__next"
                  disabled={submitting}
                  type="submit"
                >
                  {isLast ? (submitting ? "Sending…" : "Apply") : "Next"}
                </button>
                {!isLast && (
                  <span className="step__hint">
                    press <strong>Enter ↵</strong>
                  </span>
                )}
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
