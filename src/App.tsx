import { useState } from "react";
import Preloader from "./components/Preloader.tsx";
import PatternField from "./components/PatternField.tsx";
import ApplyForm from "./components/ApplyForm.tsx";
import Admin from "./components/Admin.tsx";

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<"home" | "apply">("home");

  if (/^\/admin(\/|$)/.test(window.location.pathname)) return <Admin />;




  return (
    <>
      {/* Never unmounts — the wordmark docks to bottom-centre as the brand mark */}
      <Preloader
        onDone={() => setLoaded(true)}
        onHome={() => {
          setView("home");
          window.scrollTo(0, 0);
        }}
      />
      {view === "home" ? (
        <main className={`home ${loaded ? "home--revealed" : ""}`}>
          <PatternField active={loaded} />
          <section className="home__hero">
            <p className="home__lede">
              CC is a fund for African designers, makers, engineers, and
              creators.{" "}
              <br />
              You get AI tools, access to a mentor, and a reason to finish and
              share your work.
            </p>
            <button
              className="home__cta"
              onMouseEnter={() => window.dispatchEvent(new Event("cc-wave-on"))}
              onFocus={() => window.dispatchEvent(new Event("cc-wave-on"))}
              onClick={() => {
                setView("apply");
                window.scrollTo(0, 0);
              }}
            >
              Apply
            </button>
          </section>
        </main>
      ) : (
        <main className="apply-page">
          <ApplyForm onBack={() => setView("home")} />
        </main>
      )}
    </>
  );
}
