/* ─── Gallery piece — /piece?id=<exhibition id> ─────────────────
   One artist piece from content/exhibitions/*.json, in one of two layouts
   (the CMS "Layout" field): "vault" (light, sticky viewer with zoom lens,
   detail accordion) or "catalogue" (dark, full-bleed hero, films, plate strip). */
const EXH_ALL = (window.IL_MANO_CONTENT || {}).exhibitions || [];

// "Crush *Cancer.*" → Crush <em>Cancer.</em>
const exhEm = (s = "") => s.split(/(\*[^*]+\*)/).map((part, i) =>
  /^\*.*\*$/.test(part) ? <em key={i}>{part.slice(1, -1)}</em> : part);
const exhPlain = (s = "") => s.replace(/\*/g, "");
const exhNum = (i) => String(i + 1).padStart(2, "0");

const ExhButtons = ({ piece, onFilm }) => (
  <div className="pc-actions">
    {piece.cta && piece.cta.url && (
      <a className="pc-btn" href={piece.cta.url} target="_blank" rel="noopener">{piece.cta.label} <span aria-hidden="true">→</span></a>
    )}
    {onFilm && <button type="button" className="pc-btn pc-btn--ghost" onClick={onFilm}>Watch the film</button>}
    {piece.secondary && piece.secondary.url && (
      <a className="pc-btn pc-btn--ghost" href={piece.secondary.url} target="_blank" rel="noopener">{piece.secondary.label}</a>
    )}
  </div>
);

const ExhStats = ({ stats }) => !stats || !stats.length ? null : (
  <dl className="pc-stats">
    {stats.map((s, i) => (
      <div key={i}><dt>— {s.label}</dt><dd>{s.value}</dd></div>
    ))}
  </dl>
);

// Silent looping video: React doesn't reliably set the `muted` attribute, which autoplay needs.
const exhMute = (el) => { if (el) { el.muted = true; el.play && el.play().catch(() => {}); } };

/* ── Layout A · Vault ── */
const PieceVault = ({ piece }) => {
  const views = piece.views || [];
  const film = piece.artistFilm && piece.artistFilm.src;
  const [view, setView] = React.useState(0);
  const [open, setOpen] = React.useState(0);
  const [lens, setLens] = React.useState(null);
  const isFilm = film && view === views.length;
  const cur = views[view];
  const R = 90, Z = 2.5;

  const move = (e) => {
    if (isFilm || !window.matchMedia("(hover: hover)").matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    setLens({ x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height });
  };

  return (
    <section className="pc pc--vault">
      <div className="pc-vault">
        <div className="pc-vault__media">
          <div className="pc-stage" onMouseMove={move} onMouseLeave={() => setLens(null)}>
            {isFilm
              ? <video src={piece.artistFilm.src} controls autoPlay playsInline />
              : cur && <img src={cur.src} alt={cur.alt || ""} />}
            {lens && cur && !isFilm && (
              <div className="pc-lens" aria-hidden="true" style={{
                width: 2 * R, height: 2 * R, left: lens.x - R, top: lens.y - R,
                backgroundImage: `url("${cur.src}")`,
                backgroundSize: `${lens.w * Z}px ${lens.h * Z}px`,
                backgroundPosition: `${R - lens.x * Z}px ${R - lens.y * Z}px`,
              }} />
            )}
            {!isFilm && <span className="pc-stage__tag">{cur ? cur.label : ""}</span>}
            {!isFilm && <span className="pc-stage__hint">Hover to inspect</span>}
          </div>
          <div className="pc-thumbs" role="tablist" aria-label="Views">
            {views.map((v, i) => (
              <button key={i} type="button" role="tab" aria-selected={view === i}
                      className={"pc-thumb" + (view === i ? " is-active" : "")} onClick={() => setView(i)}>
                <img src={v.src} alt="" loading="lazy" /><span>{v.label}</span>
              </button>
            ))}
            {film && (
              <button type="button" role="tab" aria-selected={isFilm}
                      className={"pc-thumb pc-thumb--film" + (isFilm ? " is-active" : "")} onClick={() => setView(views.length)}>
                <i aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="12" cy="12" r="10" /><path d="M10 8.5l6 3.5-6 3.5z" /></svg></i><span>The film</span>
              </button>
            )}
          </div>
        </div>

        <div className="pc-vault__text">
          <header className="pc-head">
            <div className="section__index">Featured collaboration{piece.status ? " · " + piece.status : ""}</div>
            <h1 className="pc-title">Il Mano × <em>{piece.artist}.</em></h1>
            <div className="pc-sub">“{exhPlain(piece.title)}” — {piece.subtitle}</div>
          </header>
          <p className="pc-body">{piece.concept}</p>
          {piece.process && <p className="pc-body pc-body--soft">{piece.process}</p>}

          <div className="pc-specs">
            {(piece.specs || []).map((s, i) => (
              <div key={i}>
                <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
                  <span>— {s.title}</span><span aria-hidden="true">{open === i ? "−" : "+"}</span>
                </button>
                {open === i && <p>{s.body}</p>}
              </div>
            ))}
          </div>

          <ExhStats stats={piece.stats} />
          {piece.note && <div className="pc-note">{piece.note}</div>}
          <ExhButtons piece={piece} onFilm={film ? () => setView(views.length) : null} />
        </div>
      </div>
    </section>
  );
};

/* ── Layout B · Catalogue ── */
const PieceCatalogue = ({ piece }) => {
  const views = piece.views || [];
  const stripRef = React.useRef(null);
  const filmRef = React.useRef(null);
  const nudge = (dir) => stripRef.current && stripRef.current.scrollBy({ left: dir * 440, behavior: "smooth" });
  const toFilm = () => filmRef.current && filmRef.current.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <section className="pc pc--catalogue">
      <div className="pc-hero">
        <div className="pc-hero__text">
          <div className="section__index">Featured collaboration{piece.status ? " · " + piece.status : ""}</div>
          <div className="pc-hero__body">
            <span className="pc-pill">Il Mano × {piece.artist}</span>
            <h1 className="pc-hero__title">{exhEm(piece.title)}</h1>
            <p>{piece.subtitle}</p>
          </div>
          {piece.artistFilm && piece.artistFilm.src && (
            <button type="button" className="pc-play" onClick={toFilm}><i aria-hidden="true"><Icon name="arrow-right" size={14} /></i>Watch the film</button>
          )}
        </div>
        {views[0] && <div className="pc-hero__media"><img src={views[0].src} alt={views[0].alt || ""} /></div>}
      </div>

      <div className="pc-wrap pc-concept">
        <div className="pc-label">— The piece</div>
        <div>
          <p className="pc-quote">{piece.quote || piece.concept}</p>
          {piece.process && <p className="pc-body pc-body--soft">{piece.process}</p>}
        </div>
      </div>

      {piece.artistFilm && piece.artistFilm.src && (
        <div className="pc-wrap pc-film" ref={filmRef}>
          <video src={piece.artistFilm.src} controls playsInline preload="metadata" aria-label={`${piece.artist} on the piece`} />
          <div>
            <div className="pc-label">— Film 01 · The artist</div>
            <p className="pc-film__head">{exhEm(piece.artistFilm.heading)}</p>
            <p className="pc-body pc-body--soft">{piece.artistFilm.text}</p>
          </div>
        </div>
      )}

      {piece.productionFilm && piece.productionFilm.src && (
        <div className="pc-wrap pc-prod">
          <video ref={exhMute} src={piece.productionFilm.src} autoPlay muted loop playsInline aria-label="Production film" />
          <div className="pc-prod__cap">
            <span className="pc-label">— Film 02 · Production</span>
            <span>{piece.productionFilm.caption}</span>
          </div>
        </div>
      )}

      {views.length > 1 && (
        <div className="pc-plates">
          <div className="pc-wrap pc-plates__head">
            <span className="pc-label">Plates 01 — {exhNum(views.length - 2)}</span>
            <span className="pc-plates__nav">
              <button type="button" aria-label="Previous plate" onClick={() => nudge(-1)}><span style={{ display: "inline-flex", transform: "scaleX(-1)" }}><Icon name="arrow-right" size={16} /></span></button>
              <button type="button" aria-label="Next plate" onClick={() => nudge(1)}><Icon name="arrow-right" size={16} /></button>
            </span>
          </div>
          <div className="pc-strip" ref={stripRef}>
            {views.slice(1).map((v, i) => (
              <figure key={i}>
                <img src={v.src} alt={v.alt || ""} loading="lazy" />
                <figcaption>{exhNum(i)} · {v.label}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}

      <div className="pc-wrap pc-close">
        <ExhStats stats={piece.stats} />
        {piece.specs && piece.specs.length > 0 && (
          <div className="pc-notes">
            {piece.specs.map((s, i) => (
              <div key={i}><div className="pc-label">— {s.title}</div><p>{s.body}</p></div>
            ))}
          </div>
        )}
        <div className="pc-close__row">
          {piece.note && <div className="pc-note">{piece.note}</div>}
          <ExhButtons piece={piece} />
        </div>
      </div>
    </section>
  );
};

const Piece = () => {
  const id = new URLSearchParams(window.location.search).get("id");
  const piece = EXH_ALL.find(e => e.id === id);
  const dark = piece && piece.layout === "catalogue";

  React.useEffect(() => {
    document.body.dataset.surface = dark ? "dark" : "";
    if (piece) document.title = `${exhPlain(piece.title)} · ${piece.artist} · IL MANO`;
  }, [piece, dark]);

  if (!piece) {
    return (
      <section className="section pc-missing">
        <div className="section__index">Gallery</div>
        <h1 className="section__title">Piece <em>not found.</em></h1>
        <a className="section__action" href="/gallery">Back to the gallery</a>
      </section>
    );
  }
  return (
    <>
      <nav className="pc-crumb" aria-label="Breadcrumb"><a href="/gallery">← Gallery</a></nav>
      {dark ? <PieceCatalogue piece={piece} /> : <PieceVault piece={piece} />}
    </>
  );
};

/* ── Exhibitions index — the /gallery page ──
   Order 1 is the featured card; the rest fall into a grid. */
const Exhibitions = () => {
  if (!EXH_ALL.length) return null;
  const [lead, ...rest] = EXH_ALL;
  const href = (e) => `/piece?id=${encodeURIComponent(e.id)}`;
  return (
    <section className="section exh" id="exhibitions" data-screen-label="Exhibitions">
      <header className="section__head">
        <div>
          <div className="section__index">Il Mano Gallery · Exhibitions</div>
          <h1 className="section__title">Artist <em>collaborations.</em></h1>
        </div>
        <span className="exh__count">{exhNum(EXH_ALL.length - 1)} {EXH_ALL.length === 1 ? "piece" : "pieces"}</span>
      </header>

      <a className="exh-lead" href={href(lead)}>
        <div className="exh-lead__media"><img src={lead.cover} alt="" /></div>
        <div className="exh-lead__text">
          <div className="exh-card__meta"><span>N° 01</span>{lead.status && <span className="exh-badge">{lead.status}</span>}</div>
          <div className="exh-card__artist">Il Mano × {lead.artist}</div>
          <h3 className="exh-lead__title">{exhEm(lead.title)}</h3>
          <p className="exh-lead__body">{lead.subtitle}</p>
          <span className="exh-card__go">View the piece <span aria-hidden="true">→</span></span>
        </div>
      </a>

      {rest.length > 0 && (
        <div className="exh-grid">
          {rest.map((e, i) => (
            <a className="exh-card" href={href(e)} key={e.id}>
              <div className="exh-card__media"><img src={e.cover} alt="" loading="lazy" /></div>
              <div className="exh-card__meta"><span>N° {exhNum(i + 1)}</span>{e.status && <span className="exh-badge">{e.status}</span>}</div>
              <div className="exh-card__artist">Il Mano × {e.artist}</div>
              <h3 className="exh-card__title">{exhEm(e.title)}</h3>
            </a>
          ))}
        </div>
      )}
    </section>
  );
};

Object.assign(window, { Piece, Exhibitions });
