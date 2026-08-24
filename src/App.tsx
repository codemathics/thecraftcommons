import { useEffect, useState } from "react";
import Preloader from "./components/Preloader.tsx";
import PatternField from "./components/PatternField.tsx";
import ApplyForm from "./components/ApplyForm.tsx";
import Manifesto from "./components/Manifesto.tsx";
import Admin from "./components/Admin.tsx";

type View = "home" | "apply" | "manifesto";

const viewFromPath = (): View =>
  /^\/manifesto(\/|$)/.test(window.location.pathname) ? "manifesto" : "home";

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [view, setViewState] = useState<View>(viewFromPath);

  const setView = (v: View) => {
    setViewState(v);
    window.history.pushState(null, "", v === "home" ? "/" : `/${v}`);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const onPop = () => setViewState(viewFromPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  if (/^\/admin(\/|$)/.test(window.location.pathname)) return <Admin />;

  return (
    <>
      {/* Never unmounts — the wordmark docks to bottom-centre as the brand mark */}
      <Preloader onDone={() => setLoaded(true)} onHome={() => setView("home")} />
      {view === "home" ? (
        <main className={`home ${loaded ? "home--revealed" : ""}`}>
          <PatternField active={loaded} onDoor={() => setView("manifesto")} />
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
              onClick={() => setView("apply")}
            >
              Apply
            </button>
          </section>
        </main>
      ) : view === "apply" ? (
        <main className="apply-page">
          <ApplyForm
            onBack={() => setView("home")}
            onManifesto={() => setView("manifesto")}
          />
        </main>
      ) : (
        <main className="manifesto-page">
          <Manifesto onBack={() => setView("home")} active={loaded} />
        </main>
      )}
      <footer className={`site-footer ${loaded ? "site-footer--visible" : ""}`}>
        <button
          type="button"
          className="site-footer__manifesto"
          onClick={() => setView("manifesto")}
          aria-current={view === "manifesto" ? "page" : undefined}
        >
          Manifesto
        </button>
        <small className="site-footer__copyright">
          © 2026 Craft Commons
        </small>
      </footer>
    </>
  );
}
