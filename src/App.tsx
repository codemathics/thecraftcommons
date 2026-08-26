import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import Preloader from "./components/Preloader.tsx";
import PatternField from "./components/PatternField.tsx";
import ApplyForm from "./components/ApplyForm.tsx";
import Manifesto from "./components/Manifesto.tsx";
import Admin from "./components/Admin.tsx";

type View = "home" | "apply";

const viewFromPath = (): View => {
  const p = window.location.pathname;
  if (/^\/form(\/|$)/.test(p)) return "apply";
  return "home";
};

const memoFromPath = () =>
  /^\/manifesto(\/|$)/.test(window.location.pathname);

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [view, setViewState] = useState<View>(viewFromPath);
  const [memo, setMemo] = useState(memoFromPath);
  const spreadRef = useRef(memoFromPath() ? 1 : 0);
  const spreadProxy = useRef({ v: spreadRef.current });
  const memoBtnRef = useRef<HTMLButtonElement>(null);
  const memoRef = useRef(memo);
  memoRef.current = memo;

  const setView = (v: View) => {
    setViewState(v);
    if (v !== "home") setMemo(false);
    const path = v === "home" ? "/" : "/form";
    window.history.pushState(null, "", path);
    window.scrollTo(0, 0);
  };

  const openMemo = () => {
    if (view !== "home") setView("home");
    setMemo(true);
  };

  const closeMemo = () => setMemo(false);

  useEffect(() => {
    if (memoFromPath()) {
      window.history.replaceState(null, "", "/");
    }
    const onPop = () => {
      setViewState(viewFromPath());
      setMemo(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    gsap.to(spreadProxy.current, {
      v: memo ? 1 : 0,
      duration: 0.55,
      ease: "expo.out",
      overwrite: "auto",
      onUpdate: () => {
        spreadRef.current = spreadProxy.current.v;
      },
    });
  }, [memo]);

  if (/^\/admin(\/|$)/.test(window.location.pathname)) return <Admin />;

  return (
    <>
      {/* never unmounts - the wordmark docks to bottom-centre as the brand mark */}
      <Preloader
        onDone={() => setLoaded(true)}
        onHome={() => {
          setView("home");
          closeMemo();
        }}
      />
      {view === "home" ? (
        <main
          className={`home ${loaded ? "home--revealed" : ""} ${
            memo ? "home--memo" : ""
          }`}
        >
          <PatternField
            active={loaded}
            onDoor={() => {
              if (!memoRef.current) openMemo();
            }}
            spreadRef={spreadRef}
          />
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
          <Manifesto
            open={memo}
            onClose={closeMemo}
            originRef={memoBtnRef}
          />
        </main>
      ) : (
        <main className="apply-page">
          <ApplyForm
            onBack={() => setView("home")}
            onManifesto={openMemo}
          />
        </main>
      )}
      <footer className={`site-footer ${loaded ? "site-footer--visible" : ""}`}>
        <button
          type="button"
          className="site-footer__manifesto"
          ref={memoBtnRef}
          onClick={() => (memo ? closeMemo() : openMemo())}
          aria-expanded={memo}
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
