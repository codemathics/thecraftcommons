import PatternField from "./PatternField.tsx";

/** The manifesto: a tactile card floating on the full reactive pattern. */
export default function Manifesto({
  onBack,
  active,
}: {
  onBack: () => void;
  active: boolean;
}) {
  return (
    <div className="apply manifesto">
      <PatternField active={active} variant="full" />

      <div className="manifesto__inner">
        <div className="apply__top">
          <button type="button" className="apply__back" onClick={onBack}>
            ← back
          </button>
        </div>

        <article className="manifesto__card">
          <h1 className="manifesto__title">Manifesto</h1>

          <p className="manifesto__lede">
            Talent is everywhere. Access is not.
          </p>

          <p>
            Across Africa and its diaspora, creatives, builders and makers are
            already making exceptional work. What is often missing is access
            to the tools, time, mentorship, and global networks needed to turn
            that craft into meaningful opportunity.
          </p>

          <p>
            Craft Commons is our answer to this. We are building a space for
            people who are ready to make.
          </p>

          <p>This is not a giveaway, nor is it a bootcamp.</p>

          <p>
            Craft Commons is a practical bet on creative ambition. We support
            designers with tools, guidance, accountability, and a platform to
            share what they build.
          </p>

          <p>
            We believe great work should be visible. We believe proximity to
            opportunity should not determine who gets to shape the future. And
            we believe African creatives and builders should not only
            participate in the AI era; they should build within it, lead it,
            and benefit from it.
          </p>

          <p>
            Our first step is simple: fund and mentor a small group of
            designers to ship meaningful work over three months.
          </p>

          <p>
            We will learn publicly. We will refine the model. We will build
            proof.
          </p>

          <p>
            Over time, we want CC to become a network that helps exceptional
            African and diaspora creatives access global work, build
            companies, find collaborators, and eventually invest in the next
            generation of founders.
          </p>

          <p className="manifesto__motto">African-first. Globally ambitious.</p>

          <p className="manifesto__sig">Clement &amp; ÌníOlúwa</p>
        </article>
      </div>
    </div>
  );
}
