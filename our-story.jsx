/* ─── Our Story page ────────────────────────────────────────────
   Vision (sticky word reveal) → Mission (ivory, slides over) → Hands (sticky,
   two fresco crops meet) → Inspiration (full fresco) → Closing.
   All scroll effects write straight to the DOM in a rAF loop; transform and
   opacity only. prefers-reduced-motion renders the end state, no listeners. */
// Vision sentence and values come from the CMS (content/story.json).
// In the sentence, wrap a word in *asterisks* to emphasise it.
const OS_STORY = (window.IL_MANO_CONTENT || {}).story || {};
const OS_VISION = (OS_STORY.vision || "").split(/\s+/).filter(Boolean).map(w => {
  const em = /^\*.*\*$/.test(w);
  return em ? [w.slice(1, -1), 1] : [w];
});
const OS_VALUES = (OS_STORY.values || []).map(v => [v.numeral, v.label]);
const OS_WORDS_PX = 520;          // scroll distance over which the words light up
const OS_HANDS_OFFSET = 460;      // px each hand starts off to its side (at full width)
const OS_HANDS_LEAD = 0.85;       // hands start moving when the section is 85% down the viewport
const osClamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const osEaseOut = (t) => 1 - Math.pow(1 - t, 3);

const useReducedMotion = () => {
  const [m, setM] = React.useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setM(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return m;
};

const OurStory = () => {
  const reduced = useReducedMotion();
  const visionRef = React.useRef(null);
  const wordRefs = React.useRef([]);
  const handsRef = React.useRef(null);
  const leftRef = React.useRef(null);
  const rightRef = React.useRef(null);
  const rowRef = React.useRef(null);
  const glowRef = React.useRef(null);
  const lineRef = React.useRef(null);

  React.useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const n = OS_VISION.length;
    const render = () => {
      raf = 0;
      // Vision: words go .16 → 1, one after another, over the first 520px
      const v = visionRef.current;
      if (v) {
        const s = osClamp(-v.getBoundingClientRect().top / OS_WORDS_PX);
        wordRefs.current.forEach((el, i) => {
          if (el) el.style.opacity = (0.16 + 0.84 * osClamp((s * (n + 2) - i) / 3)).toFixed(3);
        });
      }
      // Hands: ease-out-cubic toward the centre, then glow line + closing line at 82%
      const h = handsRef.current;
      if (h && leftRef.current) {
        const r = h.getBoundingClientRect();
        const lead = window.innerHeight * OS_HANDS_LEAD;
        const p = osClamp((lead - r.top) / Math.max(1, r.height - window.innerHeight + lead));
        const k = rowRef.current.offsetWidth / 1120;              // scale offsets on narrow screens
        const off = OS_HANDS_OFFSET * k * (1 - osEaseOut(osClamp(p / 0.8)));
        leftRef.current.style.transform = `translate3d(${-off}px,0,0)`;
        rightRef.current.style.transform = `translate3d(${off}px,0,0)`;
        const t = osClamp((p - 0.82) / 0.1);
        glowRef.current.style.opacity = t.toFixed(3);
        const t2 = osClamp((p - 0.86) / 0.1);
        lineRef.current.style.opacity = t2.toFixed(3);
        lineRef.current.style.transform = `translate3d(0,${(20 * (1 - t2)).toFixed(1)}px,0)`;
      }
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(render); };
    render();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
    };
  }, [reduced]);

  return (
    <main className={"os" + (reduced ? " os--still" : "")}>
      {/* Vision */}
      <section className="os-vision" ref={visionRef} data-screen-label="Vision">
        <div className="os-vision__panel">
          <div className="os-mono os-vision__label">At IL MANO Gallery,</div>
          <p className="os-vision__text">
            {OS_VISION.map(([w, em], i) => (
              <React.Fragment key={i}>
                <span className={"os-word" + (em ? " is-em" : "")} ref={el => (wordRefs.current[i] = el)}>{w}</span>{" "}
              </React.Fragment>
            ))}
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="os-mission" data-screen-label="Mission">
        <div className="os-mission__top">
          <h2 className="os-mission__title">Art has the power <em>to unite.</em></h2>
          <div className="os-mission__copy">
            <p>
              Il Mano means <em>the hand</em> — where every piece begins and where it ends. Each
              garment is cut, dyed and finished by hand in Los Angeles, made to be worn, kept and passed on.
            </p>
            <p>
              Art gives us the language, fashion gives it form, and philanthropy gives it a purpose
              beyond the garment: to bring people closer to each other, and to the work of making
              something that lasts.
            </p>
          </div>
        </div>
        <ul className="os-values">
          {OS_VALUES.map(([n, label]) => (
            <li key={n}><span className="os-mono">{n}</span><span className="os-values__label">{label}</span></li>
          ))}
        </ul>
      </section>

      {/* Hands */}
      <section className="os-hands" ref={handsRef} data-screen-label="Hands">
        <div className="os-hands__stage">
          <div className="os-hands__row" ref={rowRef}>
            <div className="os-hand os-hand--l" ref={leftRef} role="img" aria-label="Adam's hand, reaching" />
            <div className="os-hand os-hand--r" ref={rightRef} role="img" aria-label="The hand of God, reaching" />
            <div className="os-hands__glow" ref={glowRef} aria-hidden="true" />
          </div>
          <p className="os-hands__line" ref={lineRef}>
            To make the world a better place,<br /><em>one hand at a time.</em>
          </p>
        </div>
      </section>

      {/* Inspiration */}
      <section className="os-inspo" data-screen-label="Inspiration">
        <div className="os-inspo__top">
          <h2 className="os-inspo__title">The power held <em>within our hands.</em></h2>
          <div className="os-inspo__copy">
            <p>
              Five centuries ago, Michelangelo painted the smallest gap in art history — a few
              inches of air between two fingers, charged with everything that follows. It is the
              image behind our name: creation as a gesture passed from one hand to another.
            </p>
            <p>
              We keep that gap open on purpose. It is where the work, and the people who make it
              and wear it, meet.
            </p>
          </div>
        </div>
        <figure className="os-inspo__fig">
          <img src="assets/creation-of-adam.jpg" alt="The Creation of Adam, Michelangelo — Sistine Chapel ceiling" loading="lazy" />
          <figcaption className="os-mono">
            Michelangelo Buonarroti · The Creation of Adam · Sistine Chapel ceiling · c. 1508–1512
          </figcaption>
        </figure>
      </section>

      {/* Closing */}
      <section className="os-close" data-screen-label="Closing">
        <h2 className="os-close__title">Made by hand. <em>Made to endure.</em></h2>
        <div className="os-close__actions">
          <a href="/clothing" className="os-pill os-pill--solid">Shop the collection</a>
          <a href="/gallery" className="os-pill">Visit the gallery</a>
        </div>
      </section>
    </main>
  );
};

Object.assign(window, { OurStory });
