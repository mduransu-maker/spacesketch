import { ArrowUpRight, CodeXml, ScanLine, LockKeyhole } from "lucide-react";
import { Planner } from "./components/planner";
export function App() {
  return (
    <>
      <a className="skip-link" href="#workspace">
        Skip to planner
      </a>
      <header className="app-header">
        <a className="wordmark" href="#">
          <ScanLine size={25} />
          <span>
            Space<span>Sketch</span>
          </span>
          <small>OPEN SOURCE</small>
        </a>
        <nav>
          <a href="#about">About the project</a>
          <a
            href="https://github.com/mduransu-maker/spacesketch"
            target="_blank"
            rel="noreferrer"
          >
            <CodeXml size={17} /> GitHub <ArrowUpRight size={15} />
          </a>
        </nav>
      </header>
      <main id="workspace">
        <Planner />
      </main>
      <section id="about" className="about wrap">
        <div>
          <p className="eyebrow">A SMALL TOOL. AN OPEN STARTING POINT.</p>
          <h2>
            Make room for
            <br />
            your next idea.
          </h2>
          <p>
            Sketch an office, arrange a pop-up shop or test a studio layout.
            SpaceSketch is a lightweight starting point you can adapt to your
            own component library and industry.
          </p>
        </div>
        <div className="about-grid">
          <article>
            <span>01</span>
            <h3>Precise enough to explore.</h3>
            <p>
              Millimetre coordinates, wall snapping, editable dimensions and a
              portable project format.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>Your project stays yours.</h3>
            <p>
              No sign-up or cloud save. Export JSON to keep an editable copy, or
              a PDF to start a conversation.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>Designed to be adapted.</h3>
            <p>
              Separate geometry, rendering and export modules. Add your own
              symbols, defaults and starter layouts.
            </p>
          </article>
          <article>
            <LockKeyhole size={18} />
            <h3>Concept sketches, clearly.</h3>
            <p>
              Illustrative dimensions and basic checks. Not CAD, construction
              documentation or a code-compliance check.
            </p>
          </article>
        </div>
      </section>
      <footer className="app-footer wrap">
        <span>SpaceSketch · Built with React, TypeScript & SVG</span>
        <a href="https://github.com/mduransu-maker/spacesketch/blob/main/LICENSE">
          MIT licensed. Make it your own. <ArrowUpRight size={14} />
        </a>
      </footer>
    </>
  );
}
