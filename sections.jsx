/* ─── Cookie notice ────────────────────────────────────────── */
/* Informational only: the site sets no analytics/advertising cookies. If any are
   ever added (GA, Meta Pixel, etc.) this must become a real opt-in consent banner. */
const COOKIE_KEY = "ilmano-cookie-notice";
const CookieNotice = () => {
  const [open, setOpen] = React.useState(() => {
    try { return !localStorage.getItem(COOKIE_KEY); } catch (e) { return true; }
  });
  if (!open) return null;
  const dismiss = () => {
    try { localStorage.setItem(COOKIE_KEY, "1"); } catch (e) {}
    setOpen(false);
  };
  return (
    <aside className="cookie-notice" role="region" aria-label="Cookie notice">
      <div className="cookie-notice__eyebrow">— Cookies</div>
      <p>
        We use only essential cookies and storage — for secure checkout (via Stripe).
        No advertising, no tracking. <a href="/privacy#cookies">Details</a>
      </p>
      <button className="cookie-notice__btn" onClick={dismiss}>Understood</button>
    </aside>
  );
};

/* ─── Nav ──────────────────────────────────────────────────── */
const NAV_LINKS = [
  { href: "/clothing", label: "Clothing" },
  { href: "/gallery", label: "Gallery" },
  { href: "/our-story", label: "Our Story" },
  { href: "/faq", label: "FAQ" },
];

const Nav = ({ cartCount, onOpenCart, transparent, hideUntilScroll }) => {
  const y = useScrollY();
  const scrolled = y > 60;
  const solid = !transparent;
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  React.useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  return (
    <>
      <nav className={"nav" + (scrolled ? " scrolled" : "") + (solid ? " solid" : "") + (hideUntilScroll && !scrolled && !drawerOpen ? " nav--hidden" : "")}>
        <button className="nav__burger" aria-label="Menu" aria-expanded={drawerOpen}
                onClick={() => setDrawerOpen(v => !v)}>
          <span/><span/>
        </button>
        <div className="nav__group nav__group--left">
          {NAV_LINKS.map(l => (
            <a key={l.label} href={l.href} className="nav__link">{l.label}</a>
          ))}
        </div>
        <a href="/" className="nav__wordmark" data-screen-label="01 Home">IL MANO</a>
        <div className="nav__group nav__group--right">
          <a href="#" className="nav__link nav__bag" aria-label={`Bag, ${cartCount} items`} onClick={(e)=>{e.preventDefault(); onOpenCart();}}>
            <Icon name="bag" size={14}/> <span className="nav__bag-label">Bag</span> <span className="nav__bag-count">({String(cartCount).padStart(2,"0")})</span>
          </a>
        </div>
      </nav>

      <div className={"nav-drawer" + (drawerOpen ? " is-open" : "")}>
        <div className="nav-drawer__links">
          {NAV_LINKS.map(l => (
            <a key={l.label} href={l.href} onClick={() => setDrawerOpen(false)}>{l.label}</a>
          ))}
        </div>
        <div className="nav-drawer__foot">
          <a href="/shipping-returns" onClick={() => setDrawerOpen(false)}>Shipping &amp; Returns</a>
          <a href="/terms" onClick={() => setDrawerOpen(false)}>Terms</a>
          <a href="/privacy" onClick={() => setDrawerOpen(false)}>Privacy</a>
        </div>
      </div>
    </>
  );
};

/* ─── Hero ─────────────────────────────────────────────────── */
const Hero = () => {
  return (
    <section className="hero" data-screen-label="Hero">
      <div className="hero__media">
        <img {...window.IL_MANO_DATA.imgAttrs("assets/0619-0957_losangeles.jpg", "100vw")} alt="Summer 2026 — California iconography" fetchpriority="high" />
      </div>
      <div className="hero__veil" />
      <div className="hero__inner">
        <div className="hero__bottom">
          <h1 className="hero__title">
            <span className="line"><span>American</span></span>
            <span className="line"><span><em>Iconography.</em></span></span>
          </h1>
          <div className="hero__meta">
            <p>At Il Mano Gallery, we envision a world where art, fashion, and philanthropy come together to inspire connection, creativity, and meaningful change.</p>
            <a href="/clothing" className="hero__cta" data-magnet>
              Shop the Collection
              <span className="arrow"><Icon name="arrow-right" size={14}/></span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ─── Categories ───────────────────────────────────────────── */
const Categories = ({ categories, onPickCategory }) => {
  const ref = useReveal();
  // Layout: first two large/medium, next three small (12-col)
  const layoutCols = (i, len) => {
    if (i === 0) return "lg"; // span 7
    if (i === 1) return "md"; // span 5
    return "sm"; // span 4 (three across)
  };
  return (
    <section className="section categories reveal" ref={ref} data-screen-label="Categories">
      <header className="section__head">
        <div>
          <div className="section__index">Index 01 · Categories</div>
          <h2 className="section__title">The <em>archetypes</em> of summer.</h2>
        </div>
        <a href="#collection" className="section__action" onClick={() => onPickCategory && onPickCategory(null)}>Browse all <Icon name="arrow-up-right" size={12}/></a>
      </header>
      <div className="categories__grid">
        {categories.map((c, i) => (
          <div className={"cat cat--" + layoutCols(i, categories.length)} key={c.name}
               role="button" tabIndex={0}
               onClick={() => onPickCategory && onPickCategory(c)}
               onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPickCategory && onPickCategory(c); } }}>
            <img className="cat__img" {...window.IL_MANO_DATA.imgAttrs(c.img, "(max-width: 820px) 100vw, 58vw")} alt={c.name} loading="lazy" />
            <div className="cat__overlay" />
            <div className="cat__arrow"><Icon name="arrow-up-right" size={14}/></div>
            <div className="cat__label">
              <div className="cat__num">— {c.num}</div>
              <div className="cat__name">{c.name}</div>
            </div>
            <div className="cat__count">{c.count}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

/* ─── Product card (used by Collection) ────────────────────── */
const ProductCard = ({ entry, products, onOpen, onQuickAdd, wishlist, toggleWish }) => {
  const product = products.find(p => p.id === entry.productId);
  const [colorId, setColorId] = React.useState(entry.colorId || product.defaultColor);
  const color = product.colors.find(c => c.id === colorId) || product.colors[0];
  const overrideImg = entry.overrideImg;
  const isWished = wishlist.has(product.id + ":" + colorId);

  const cardRef = React.useRef(null);

  const onQuickAddClick = (e) => {
    e.stopPropagation();
    onQuickAdd(product, colorId, cardRef.current);
  };

  return (
    <div className="card" ref={cardRef} onClick={() => onOpen(product, colorId)}>
      <div className="card__media">
        {entry.badge && <div className="card__badge">{entry.badge}</div>}
        <button className={"card__wishlist" + (isWished ? " is-active" : "")}
                onClick={(e)=>{e.stopPropagation(); toggleWish(product.id + ":" + colorId);}}
                aria-label="Wishlist">
          <Icon name={isWished ? "heart-filled" : "heart"} size={14}/>
        </button>
        <img className="is-primary" {...window.IL_MANO_DATA.imgAttrs(overrideImg || color.front, "(max-width: 480px) 100vw, (max-width: 820px) 50vw, 33vw")} alt={product.name} loading="lazy" />
        <img className="is-secondary" {...window.IL_MANO_DATA.imgAttrs(overrideImg || color.back, "(max-width: 480px) 100vw, (max-width: 820px) 50vw, 33vw")} alt="" loading="lazy" />
        <button className="card__quickadd" onClick={onQuickAddClick}>
          Quick Add <Icon name="plus" size={12}/>
        </button>
      </div>
      <div className="card__info">
        <span className="card__name">{entry.overrideName || product.name}</span>
        <span className="card__price">{fmtPrice(entry.overridePrice || product.price)}</span>
        <div className="card__sub">
          {entry.overrideSub || `${product.colors.length} ${product.colors.length === 1 ? "colour" : "colours"}`}
          <span>·</span>
          <span>{product.category}</span>
        </div>
        {product.colors.length > 1 && (
          <div className="card__swatches" onClick={(e)=>e.stopPropagation()}>
            {product.colors.map(c => (
              <div key={c.id}
                   className={"swatch-dot" + (c.id === colorId ? " is-active" : "")}
                   style={{ background: c.hex }}
                   title={c.name}
                   onClick={() => setColorId(c.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Collection ───────────────────────────────────────────── */
const Collection = ({ data, filter, setFilter, onOpen, onQuickAdd, wishlist, toggleWish }) => {
  const ref = useReveal();
  const filters = [
    { id: "all", label: "All Pieces" },
    ...data.categories.map(c => ({ id: c.key, label: c.name })),
  ];
  const cards = data.gridCards.filter(c => {
    if (filter === "all") return true;
    const p = data.findProduct(c.productId);
    return p.categoryKey === filter;
  });
  return (
    <section className="section collection reveal" ref={ref} id="collection" data-screen-label="Collection">
      <header className="section__head">
        <div>
          <div className="section__index">Index 02 · Summer 26 Drop</div>
          <h2 className="section__title">The <em>collection.</em></h2>
        </div>
        <div className="collection__controls">
          {filters.map(f => (
            <button key={f.id}
                    className={"chip" + (filter === f.id ? " is-active" : "")}
                    onClick={() => setFilter(f.id)}>{f.label}</button>
          ))}
        </div>
      </header>
      {cards.length === 0 && (
        <p className="collection__empty">
          {(filters.find(f => f.id === filter) || {}).label} — coming soon. <a href="#collection" onClick={(e) => { e.preventDefault(); setFilter("all"); }}>View all pieces</a>
        </p>
      )}
      <div className="product-grid">
        {cards.map((c, i) => (
          <ProductCard key={i} entry={c} products={data.products}
                       onOpen={onOpen} onQuickAdd={onQuickAdd}
                       wishlist={wishlist} toggleWish={toggleWish} />
        ))}
      </div>
    </section>
  );
};

/* ─── Lookbook ─────────────────────────────────────────────── */
const Lookbook = () => {
  const ref = useReveal();
  const pieceCount = window.IL_MANO_DATA.products.length;
  const mediaRef = React.useRef(null);

  React.useEffect(() => {
    const el = mediaRef.current?.querySelector("img");
    if (!el) return;
    const onScroll = () => {
      const rect = mediaRef.current.getBoundingClientRect();
      const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      const clamped = Math.max(0, Math.min(1, progress));
      const offset = (clamped - 0.5) * 80;
      el.style.transform = `translate3d(0, ${offset}px, 0) scale(1.12)`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="section lookbook reveal" ref={ref} data-screen-label="Lookbook">
      <div className="lookbook__inner">
        <div className="lookbook__media" ref={mediaRef}>
          <img {...window.IL_MANO_DATA.imgAttrs("assets/lifestyle-bag-hoodie.png", "(max-width: 1100px) 100vw, 55vw")} alt="The Field Set — hoodie & duffle on location" loading="lazy" />
        </div>
        <aside className="lookbook__copy">
          <div className="section__index">Index 03 · Editorial</div>
          <p className="lookbook__quote">"<em>Dust on the leather. Sun on the cotton. A wardrobe that ages with the road.</em>"</p>
          <p className="lookbook__body">
            Shot on a single morning between Joshua Tree and Pioneertown — no stylist, no retouch.
            The Heritage Duffle and Tobacco Hoodie photographed where they belong: outside.
          </p>
          <div className="lookbook__stat">
            <div>
              <div className="lookbook__stat-val">{pieceCount}</div>
              <div className="lookbook__stat-lbl">pieces in drop</div>
            </div>
            <div>
              <div className="lookbook__stat-val">100<span style={{fontSize:'0.5em', verticalAlign:'super'}}>%</span></div>
              <div className="lookbook__stat-lbl">Made in LA</div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};

/* ─── Story / Manifesto ────────────────────────────────────── */
const Story = ({ pillars }) => {
  const containerRef = React.useRef(null);
  // Word-by-word reveal as user scrolls into the statement
  React.useEffect(() => {
    const wordEls = containerRef.current?.querySelectorAll(".word");
    if (!wordEls) return;
    const onScroll = () => {
      const rect = containerRef.current.getBoundingClientRect();
      const progress = (window.innerHeight * 0.85 - rect.top) / (window.innerHeight * 0.6);
      const total = wordEls.length;
      const lit = Math.max(0, Math.min(total, Math.round(progress * total)));
      wordEls.forEach((el, i) => {
        el.classList.toggle("is-lit", i < lit);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const statement = "We carve garments like leather — tested by use, refined by wear, and made to outlast the trend cycle.";
  const words = statement.split(" ");

  return (
    <section className="story" id="story" ref={containerRef} data-screen-label="Story">
      <div className="story__eyebrow">— Manifesto · Connect · Create · Inspire</div>
      <h2 className="story__statement editorial">
        {words.map((w, i) => (
          <React.Fragment key={i}>
            <span className="word">{w}</span>{" "}
          </React.Fragment>
        ))}
      </h2>
      <div className="story__footer">
        {pillars.map(p => (
          <div className="story__pillar" key={p.title}>
            <h4>— {p.title}</h4>
            <p>{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

/* ─── Newsletter ───────────────────────────────────────────── */
const useNewsletter = (source) => {
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState("idle"); // idle | sending | done | error
  const [error, setError] = React.useState("");
  const submit = async (e) => {
    e.preventDefault();
    if (!email || status === "sending") return;
    setStatus("sending");
    try {
      const r = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Something went wrong.");
      try { localStorage.setItem(NEWS_KEY, "joined"); } catch (e) {}
      setStatus("done");
    } catch (err) {
      setError(err.message || "Something went wrong.");
      setStatus("error");
    }
  };
  return { email, setEmail, status, error, submit };
};

/* Low-key slide-in: appears ~20s after landing, once, bottom-right. Waits for the
   cookie notice to be dismissed so the two never stack. Dismissal is remembered
   for 30 days; a signup is remembered permanently. */
const NEWS_KEY = "ilmano-newsletter";
const NEWS_DELAY_MS = 20000;
const NEWS_SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;
const NewsletterSlideIn = () => {
  const [open, setOpen] = React.useState(false);
  const news = useNewsletter("slide-in");
  React.useEffect(() => {
    try {
      const v = localStorage.getItem(NEWS_KEY);
      if (v === "joined") return;
      if (v && Date.now() - Number(v) < NEWS_SNOOZE_MS) return;
    } catch (e) {}
    let timer;
    const arm = () => { timer = setTimeout(() => {
      // hold off while the cookie notice is still on screen
      if (document.querySelector(".cookie-notice")) arm(); else setOpen(true);
    }, NEWS_DELAY_MS); };
    arm();
    return () => clearTimeout(timer);
  }, []);
  const close = () => {
    if (news.status !== "done") { try { localStorage.setItem(NEWS_KEY, String(Date.now())); } catch (e) {} }
    setOpen(false);
  };
  React.useEffect(() => {
    if (news.status !== "done") return;
    const t = setTimeout(() => setOpen(false), 2600);
    return () => clearTimeout(t);
  }, [news.status]);
  if (!open) return null;
  return (
    <aside className="news-slide" role="region" aria-label="Newsletter">
      <button className="news-slide__close" onClick={close} aria-label="Close">×</button>
      <div className="news-slide__eyebrow">— Newsletter</div>
      {news.status === "done" ? (
        <p className="news-slide__title">You're on the list.</p>
      ) : (
        <>
          <p className="news-slide__title">First access to new drops.</p>
          <form className="news-slide__form" onSubmit={news.submit}>
            <input type="email" placeholder="Email address" aria-label="Email address"
                   value={news.email} onChange={(e)=>news.setEmail(e.target.value)} required />
            <button type="submit" disabled={news.status === "sending"}>
              {news.status === "sending" ? "…" : "Join →"}
            </button>
          </form>
          {news.status === "error" && <p className="newsletter__msg">{news.error}</p>}
        </>
      )}
    </aside>
  );
};

/* ─── Footer ───────────────────────────────────────────────── */
// Text and links come from the CMS (content/footer.json → Decap "Footer").
// Social "kind" must be one of the keys below; a url of "#" or empty hides nothing — set the real link in the CMS.
const SOCIAL_ICONS = {
  instagram: <><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="0.6" fill="currentColor"/></>,
  tiktok: <path d="M14 4v10.2a3.7 3.7 0 1 1-3.7-3.7M14 4c.4 2.4 2.1 4 4.8 4.2"/>,
  email: <><rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3.5 7l8.5 6 8.5-6"/></>,
  x: <><path d="M4.5 4.5l15 15M19.5 4.5l-15 15"/></>,
  youtube: <><rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.5l5 2.5-5 2.5z"/></>,
};
const Footer = () => {
  const news = useNewsletter("footer");
  const F = (window.IL_MANO_CONTENT || {}).footer || {};
  return (
    <footer className="footer">
      <div className="footer__megabrand">IL MANO</div>
      <div className="footer__grid">
        <div className="footer__col">
          <p className="footer__tagline"><em>{F.tagline}</em></p>
          <form className="newsletter" onSubmit={news.submit}>
            <input type="email" placeholder={F.newsletterPlaceholder} aria-label="Email address"
                   value={news.email} onChange={(e)=>news.setEmail(e.target.value)}
                   disabled={news.status === "done"} required />
            <button type="submit" disabled={news.status === "sending"}>
              {news.status === "done" ? "Joined ✓" : news.status === "sending" ? "…" : "Subscribe →"}
            </button>
          </form>
          {news.status === "error" && <p className="newsletter__msg">{news.error}</p>}
          <div className="footer__socials">
            {(F.socials || []).filter(s => SOCIAL_ICONS[s.kind]).map(s => (
              <a key={s.kind} href={s.url || "#"} aria-label={s.kind} {...(/^https?:/.test(s.url) ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">{SOCIAL_ICONS[s.kind]}</svg>
              </a>
            ))}
          </div>
        </div>
        {(F.columns || []).map(c => (
          <div className="footer__col" key={c.heading}>
            <h5>— {c.heading}</h5>
            <ul>{(c.links || []).map(l => <li key={l.label}><a href={l.href}>{l.label}</a></li>)}</ul>
          </div>
        ))}
        <div className="footer__col">
          <h5>— {F.regionHeading}</h5>
          <ul><li><Icon name="globe" size={12}/> {F.region}</li></ul>
        </div>
      </div>
      <div className="footer__legal">
        <div>© {new Date().getFullYear()} {F.legalText}</div>
        <div className="footer__legal-group">
          {(F.legalLinks || []).map(l => <a key={l.label} href={l.href}>{l.label}</a>)}
        </div>
      </div>
    </footer>
  );
};

Object.assign(window, {
  Nav, CookieNotice, NewsletterSlideIn, Hero, Categories,
  ProductCard, Collection, Lookbook, Story, Footer,
});
