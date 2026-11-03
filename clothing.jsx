/* ─── Clothing listing page ─────────────────────────────────────
   Plain, minimal, client-side filter + sort. Standalone page (own nav, own
   stylesheet: clothing.css). The bag lives in localStorage so the home page
   cart (app.jsx) picks up whatever is added here — "View bag" → /#bag. */
const BAG_KEY = "ilmano-bag-v1";
const readBag = () => { try { return JSON.parse(localStorage.getItem(BAG_KEY)) || []; } catch (e) { return []; } };
const writeBag = (items) => { try { localStorage.setItem(BAG_KEY, JSON.stringify(items)); } catch (e) {} };

const I = ({ n, s = 20 }) => {
  const c = { width: s, height: s, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
              strokeWidth: 1.2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  switch (n) {
    case "bag": return <svg {...c}><path d="M4.5 8h15l-1.1 11.3a1.5 1.5 0 01-1.5 1.2H7.1a1.5 1.5 0 01-1.5-1.2L4.5 8z"/><path d="M8.5 10.5V7a3.5 3.5 0 017 0v3.5"/></svg>;
    case "check": return <svg {...c}><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>;
    case "chev": return <svg {...c}><path d="M15 5l-7 7 7 7"/></svg>;
    case "heart": return <svg {...c}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>;
    case "heart-on": return <svg {...c} fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>;
    case "sliders": return <svg {...c}><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>;
    case "plus": return <svg {...c}><path d="M12 5v14M5 12h14"/></svg>;
    case "close": return <svg {...c}><path d="M6 6l12 12M18 6L6 18"/></svg>;
    default: return null;
  }
};

const SORTS = [
  { id: "newest", label: "Newest" },
  { id: "asc", label: "Price ↑" },
  { id: "desc", label: "Price ↓" },
];
const fmt = (n) => "$" + n.toLocaleString("en-US");

// Fly a copy of `imgSrc` from `fromEl` to the nav bag, then call done(). Skipped for reduced motion.
const flyToBag = (fromEl, imgSrc, done) => {
  const target = document.querySelector(".c-icon");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!fromEl || !target || reduce) { done(); return; }
  const a = fromEl.getBoundingClientRect(), b = target.getBoundingClientRect();
  const size = Math.min(110, a.width, a.height);
  const ghost = document.createElement("div");
  ghost.className = "c-fly";
  ghost.style.cssText = `left:${a.left + (a.width - size) / 2}px;top:${a.top + (a.height - size) / 2}px;width:${size}px;height:${size}px`;
  ghost.innerHTML = `<img src="${window.IL_MANO_DATA.imgSrc(imgSrc, 480)}" alt="">`;
  document.body.appendChild(ghost);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  // Finish exactly once — the timer covers browsers that pause animations (background tabs).
  let finished = false;
  const finish = () => { if (finished) return; finished = true; ghost.remove(); done(); };
  setTimeout(finish, 1000);
  ghost.animate([
    { transform: "translate(0,0) scale(1)", opacity: 1 },
    { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 70}px) scale(0.6)`, opacity: 0.95, offset: 0.55 },
    { transform: `translate(${dx}px, ${dy}px) scale(0.12)`, opacity: 0 },
  ], { duration: 780, easing: "cubic-bezier(0.65, 0, 0.35, 1)" }).onfinish = finish;
};

/* In-page product view — same content and layout as the home-page PDP, but it
   opens over the listing (nav stays put) and Back/Esc return to the list. */
const ProductView = ({ product, initialColor, onClose, onAdd }) => {
  const [colorId, setColorId] = React.useState(initialColor || product.defaultColor);
  const [activeImg, setActiveImg] = React.useState(0);
  const firstAvail = product.sizes.find(s => !s.soldOut);
  const [sizeId, setSizeId] = React.useState(firstAvail ? firstAvail.id : "");
  const [openAcc, setOpenAcc] = React.useState({ details: true, care: false, delivery: false });
  const [added, setAdded] = React.useState(false);
  const mainRef = React.useRef(null);
  const color = product.colors.find(c => c.id === colorId) || product.colors[0];
  const imgs = [color.front, color.back, ...product.colors.filter(c => c.id !== colorId).map(c => c.front)]
    .filter((src, i, arr) => arr.indexOf(src) === i).slice(0, 4);

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const key = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", key); };
  }, []);

  const add = () => {
    if (!sizeId || added) return;
    setAdded(true);
    onAdd(product, colorId, product.sizes.find(s => s.id === sizeId), mainRef.current, imgs[0]);
    setTimeout(() => setAdded(false), 1600);
  };

  const rows = [
    { id: "details", title: "About this piece", body: (<>
        <p>{product.description}</p>
        <ul>{product.specs.map((sp, i) => <li key={i}><b>{sp.k}</b><span>{sp.v}</span></li>)}</ul>
      </>) },
    { id: "care", title: "Care", body: <p>{product.care}</p> },
    { id: "delivery", title: "Delivery & returns", body: <p>{product.delivery}</p> },
  ];

  return (
    <div className="c-pdp" role="dialog" aria-modal="true" aria-label={product.name}>
      <button className="c-pdp__back" onClick={onClose}><I n="chev" s={16} /> Back to clothing</button>
      <div className="c-pdp__grid">
        <div className="c-pdp__gallery">
          <div className="c-pdp__main" ref={mainRef}>
            <img {...window.IL_MANO_DATA.imgAttrs(imgs[activeImg] || imgs[0], "(max-width: 860px) 100vw, 55vw")} alt={`${product.name} — ${color.name}`} />
          </div>
          {imgs.length > 1 && (
            <div className="c-pdp__thumbs">
              {imgs.map((src, i) => (
                <button key={src} className={i === activeImg ? "is-on" : ""} aria-label={`View image ${i + 1}`}
                        onClick={() => setActiveImg(i)}><img {...window.IL_MANO_DATA.imgAttrs(src, "120px")} alt="" /></button>
              ))}
            </div>
          )}
        </div>
        <div className="c-pdp__info">
          <div className="c-pdp__crumb">Clothing / {product.category}</div>
          <h1 className="c-pdp__name">{product.name}</h1>
          <div className="c-pdp__price-row">
            <span className="c-pdp__price">{fmt(product.price)}</span>
            <span className="c-pdp__rating">★ {product.rating.toFixed(1)} · {product.reviews} reviews</span>
          </div>

          <div className="c-opt">
            <div className="c-opt__head"><span>— Colour</span><b>{color.name}</b></div>
            <div className="c-pdp__swatches" role="radiogroup" aria-label="Colour">
              {product.colors.map(c => (
                <button key={c.id} role="radio" aria-checked={c.id === colorId} aria-label={c.name} title={c.name}
                        className={c.id === colorId ? "is-on" : ""} style={{ background: c.hex }}
                        onClick={() => { setColorId(c.id); setActiveImg(0); }} />
              ))}
            </div>
          </div>

          <div className="c-opt">
            <div className="c-opt__head"><span>— Size</span></div>
            <div className="c-pdp__sizes">
              {product.sizes.map(sz => (
                <button key={sz.id} disabled={sz.soldOut} className={sizeId === sz.id ? "is-on" : ""}
                        onClick={() => setSizeId(sz.id)}>{sz.label}</button>
              ))}
            </div>
          </div>

          <button className={"c-pdp__add" + (added ? " is-added" : "")} disabled={!sizeId} onClick={add}>
            {added ? <><I n="check" s={16} /> Added to bag</> : <>Add to bag · {fmt(product.price)}</>}
          </button>
          <p className="c-pdp__secure">Secure checkout · Free returns within 14 days</p>

          <div className="c-acc">
            {rows.map(r => (
              <div key={r.id} className={"c-acc__row" + (openAcc[r.id] ? " is-open" : "")}>
                <button className="c-acc__head" aria-expanded={!!openAcc[r.id]}
                        onClick={() => setOpenAcc(o => ({ ...o, [r.id]: !o[r.id] }))}>
                  <span>{r.title}</span><i />
                </button>
                <div className="c-acc__body"><div>{r.body}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ClothingPage = () => {
  const data = window.IL_MANO_DATA;
  const [cat, setCat] = React.useState("all");
  const [sortIx, setSortIx] = React.useState(0);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [sizeFilter, setSizeFilter] = React.useState(null);
  const [bag, setBag] = React.useState(readBag);
  const [wish, setWish] = React.useState(() => new Set());
  const [colors, setColors] = React.useState({});      // productId → active colorId
  const [toast, setToast] = React.useState(null);
  const [sheet, setSheet] = React.useState(null);      // product whose size sheet is open (touch)
  const toastTimer = React.useRef(0);
  const [view, setView] = React.useState(null);        // { product, colorId } — in-page product view
  const [bump, setBump] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);   // mobile pull-down menu
  const pushedRef = React.useRef(false);
  const bumpTimer = React.useRef(0);

  // Open/close the product view inside this page; the browser Back button closes it.
  const openView = (product, colorId) => {
    setView({ product, colorId });
    if (!pushedRef.current) { history.pushState({ pv: 1 }, "", "#" + product.slug); pushedRef.current = true; }
  };
  const closeView = () => {
    if (pushedRef.current) history.back();
    else { setView(null); history.replaceState(null, "", location.pathname + location.search); }
  };
  React.useEffect(() => {
    const fromHash = () => {
      const slug = location.hash.slice(1);
      const p = data.products.find(x => x.slug === slug);
      if (p) setView({ product: p, colorId: p.defaultColor }); else setView(null);
      pushedRef.current = false;
    };
    fromHash();
    window.addEventListener("popstate", fromHash);
    return () => window.removeEventListener("popstate", fromHash);
  }, []);

  const count = bag.reduce((t, i) => t + i.qty, 0);
  const cats = [{ key: "all", name: "All" }, ...data.categories];

  const allSizes = [];
  data.products.forEach(p => p.sizes.forEach(sz => { if (sz.id !== "os" && !allSizes.includes(sz.id)) allSizes.push(sz.id); }));
  let list = data.products.filter(p => cat === "all" || p.categoryKey === cat);
  if (sizeFilter) list = list.filter(p => p.sizes.some(s => s.id === sizeFilter && !s.soldOut));
  if (SORTS[sortIx].id === "asc") list = [...list].sort((a, b) => a.price - b.price);
  if (SORTS[sortIx].id === "desc") list = [...list].sort((a, b) => b.price - a.price);

  const addToBag = (product, size, colorOverride, originEl, imgSrc) => {
    const colorId = colorOverride || colors[product.id] || product.defaultColor;
    const color = product.colors.find(c => c.id === colorId) || product.colors[0];
    const lineId = `${product.id}-${colorId}-${size.id}`;
    setSheet(null);
    flyToBag(originEl, imgSrc || color.front, () => {
      setBag(prev => {
        const next = prev.find(i => i.lineId === lineId)
          ? prev.map(i => i.lineId === lineId ? { ...i, qty: i.qty + 1 } : i)
          : [...prev, { lineId, productId: product.id, colorId, sizeId: size.id, sizeLabel: size.label, price: product.price, qty: 1 }];
        writeBag(next);
        return next;
      });
      setBump(true);
      clearTimeout(bumpTimer.current);
      bumpTimer.current = setTimeout(() => setBump(false), 600);
      setToast(`${product.name} · ${size.label}`);
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 2400);
    });
  };
  // Card buttons: animate from the card's photo.
  const addFromCard = (e, product, size) => {
    const media = e.currentTarget.closest(".c-card__media");
    addToBag(product, size, null, media && media.querySelector("img"));
  };

  const toggleWish = (id) => setWish(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <>
      <nav className="c-nav">
        <button className="c-burger" aria-label="Menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(v => !v)}>
          <span /><span />
        </button>
        <div className="c-nav__l">
          <a href="/clothing" className="is-current">Clothing</a>
          <a href="/gallery">Gallery</a>
          <a href="/our-story">Our Story</a>
        </div>
        <a href="/" className="c-nav__mark">IL MANO</a>
        <div className="c-nav__r">
          <a href="/#bag" className={"c-icon" + (bump ? " is-bump" : "")} aria-label={`Bag, ${count} items`}>
            <I n="bag" s={24} />
            {count > 0 && <span className="c-badge" key={count}>{count}</span>}
          </a>
        </div>
      </nav>

      <div className={"c-menu" + (menuOpen ? " is-open" : "")}>
        <a href="/clothing" className="is-current" onClick={() => setMenuOpen(false)}>Clothing</a>
        <a href="/gallery">Gallery</a>
        <a href="/our-story">Our Story</a>
        <a href="/faq">FAQ</a>
      </div>

      <header className="c-head">
        <h1>{(window.IL_MANO_CONTENT || {}).home.clothingTitle}</h1>
        <div className="c-chips" role="tablist">
          {cats.map(c => (
            <button key={c.key} role="tab" aria-selected={cat === c.key}
                    className={"c-chip" + (cat === c.key ? " is-on" : "")}
                    onClick={() => setCat(c.key)}>{c.name}</button>
          ))}
        </div>
      </header>

      <div className="c-bar">
        <button className="c-bar__filters" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(v => !v)}>
          <I n="sliders" s={18} /> <span>Filters{sizeFilter ? " (1)" : ""}</span>
        </button>
        <div className="c-bar__count">{list.length} {list.length === 1 ? "Piece" : "Pieces"}</div>
        <button className="c-bar__sort" onClick={() => setSortIx((sortIx + 1) % SORTS.length)}>
          Sort by <b>{SORTS[sortIx].label}</b>
        </button>
      </div>
      {filtersOpen && (
        <div className="c-filters">
          <span>Size</span>
          {allSizes.map(sz => (
            <button key={sz} className={"c-chip c-chip--sm" + (sizeFilter === sz ? " is-on" : "")}
                    onClick={() => setSizeFilter(sizeFilter === sz ? null : sz)}>{sz.toUpperCase()}</button>
          ))}
          {sizeFilter && <button className="c-filters__clear" onClick={() => setSizeFilter(null)}>Clear</button>}
        </div>
      )}

      {list.length === 0 ? (
        <p className="c-empty">Nothing here yet — <button onClick={() => { setCat("all"); setSizeFilter(null); }}>view all pieces</button></p>
      ) : (
        <ul className="c-grid">
          {list.map(p => {
            const colorId = colors[p.id] || p.defaultColor;
            const color = p.colors.find(c => c.id === colorId) || p.colors[0];
            const one = p.sizes.length === 1;
            return (
              <li className="c-card" key={p.id} data-pid={p.id}>
                <div className="c-card__media" onClick={(e) => { if (!e.target.closest("button")) openView(p, colorId); }}>
                  <img {...window.IL_MANO_DATA.imgAttrs(color.cutout || color.front, "(max-width: 900px) 50vw, (max-width: 1200px) 33vw, 25vw")} alt={`${p.name} — ${color.name}`} loading="lazy"
                       className={color.cutout ? "is-cutout" : p.categoryKey === "hoodies" ? "is-studio" : ""} />
                  {p.badge && <span className="c-tag">{p.badge}</span>}
                  <button className="c-heart" aria-label={wish.has(p.id) ? "Remove from wishlist" : "Add to wishlist"}
                          aria-pressed={wish.has(p.id)} onClick={() => toggleWish(p.id)}>
                    <I n={wish.has(p.id) ? "heart-on" : "heart"} s={18} />
                  </button>
                  <div className="c-sizes">
                    {one ? (
                      <button className="c-sizes__one" onClick={(e) => addFromCard(e, p, p.sizes[0])}>Add to bag <I n="plus" s={14} /></button>
                    ) : p.sizes.map(s => (
                      <button key={s.id} disabled={s.soldOut} onClick={(e) => addFromCard(e, p, s)}>{s.label}</button>
                    ))}
                  </div>
                  <button className="c-plus" aria-label={`Add ${p.name} to bag`}
                          onClick={(e) => one ? addFromCard(e, p, p.sizes[0]) : setSheet(p)}>
                    <I n="plus" s={20} />
                  </button>
                </div>
                <div className="c-card__info">
                  <h3><button className="c-card__open" onClick={() => openView(p, colorId)}>{p.name}</button></h3>
                  <div className="c-card__price">{fmt(p.price)}</div>
                  {p.colors.length > 1 && (
                    <div className="c-swatches" role="radiogroup" aria-label="Colour">
                      {p.colors.map(c => (
                        <button key={c.id} role="radio" aria-checked={c.id === color.id} aria-label={c.name} title={c.name}
                                className={"c-swatch" + (c.id === color.id ? " is-on" : "")}
                                onClick={() => setColors(prev => ({ ...prev, [p.id]: c.id }))}>
                          <i style={{ background: c.hex }} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {view && (
        <ProductView key={view.product.id} product={view.product} initialColor={view.colorId}
                     onClose={closeView}
                     onAdd={(product, colorId, size, el, img) => addToBag(product, size, colorId, el, img)} />
      )}

      {sheet && (
        <div className="c-sheet" role="dialog" aria-label="Select size" onClick={() => setSheet(null)}>
          <div className="c-sheet__panel" onClick={e => e.stopPropagation()}>
            <div className="c-sheet__head">
              <span>{sheet.name} — select size</span>
              <button aria-label="Close" onClick={() => setSheet(null)}><I n="close" s={20} /></button>
            </div>
            <div className="c-sheet__sizes">
              {sheet.sizes.map(s => (
                <button key={s.id} disabled={s.soldOut} onClick={() => addToBag(sheet, s, null, document.querySelector(`[data-pid="${sheet.id}"] .c-card__media img`))}>{s.label}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={"c-toast" + (toast ? " is-on" : "")} role="status" aria-live="polite">
        <span>Added to bag · {toast}</span>
        <a href="/#bag">View bag</a>
      </div>
    </>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<ClothingPage />);
