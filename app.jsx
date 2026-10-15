/* ─── IL MANO — Main App ─────────────────────────────────── */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "surface": "warm",
  "accent": "tobacco",
  "displayFace": "cormorant",
  "motionLevel": "full",
  "showHandMark": true
}/*EDITMODE-END*/;

const App = () => {
  const data = window.IL_MANO_DATA;
  const loaded = true; // intro loader now lives in index.html (see intro script)
  const [filter, setFilter] = React.useState("all"); // collection category filter
  const [pdp, setPdp] = React.useState(null); // {product, colorId}
  const [cartOpen, setCartOpen] = React.useState(false);
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
  // Bag persists in localStorage so items added on /clothing show up here.
  const [items, setItems] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem("ilmano-bag-v1")) || []; } catch (e) { return []; }
  });
  React.useEffect(() => {
    try { localStorage.setItem("ilmano-bag-v1", JSON.stringify(items)); } catch (e) {}
  }, [items]);
  React.useEffect(() => {
    if (window.location.hash === "#bag") setCartOpen(true);
  }, []);
  const [wishlist, setWishlist] = React.useState(new Set());
  const [tweaks, setTweaks] = useTweaks(TWEAK_DEFAULTS);

  // Apply tweak: surface palette
  React.useEffect(() => {
    const surfaceMap = { warm: "", dark: "dark", cream: "cream", stark: "stark" };
    document.body.dataset.surface = surfaceMap[tweaks.surface] || "";
  }, [tweaks.surface]);

  // Apply tweak: display face
  React.useEffect(() => {
    const map = {
      cormorant: "'Cormorant Garamond', serif",
      playfair: "'Playfair Display', serif",
      space: "'Space Grotesk', sans-serif",
    };
    document.documentElement.style.setProperty("--font-display", map[tweaks.displayFace] || map.cormorant);
  }, [tweaks.displayFace]);

  // Apply tweak: motion
  React.useEffect(() => {
    document.documentElement.dataset.motion = tweaks.motionLevel;
    if (tweaks.motionLevel === "low") {
      document.documentElement.style.setProperty("--ease", "ease");
    } else {
      document.documentElement.style.removeProperty("--ease");
    }
  }, [tweaks.motionLevel]);

  const totalQty = items.reduce((s, i) => s + i.qty, 0);

  // ── Cart actions ────────────────────────────────────────
  const findProduct = (id) => data.findProduct(id);

  const addItem = (product, colorId, sizeId) => {
    const size = product.sizes.find(s => s.id === sizeId);
    const lineId = `${product.id}-${colorId}-${sizeId}`;
    setItems(prev => {
      const existing = prev.find(it => it.lineId === lineId);
      if (existing) {
        return prev.map(it => it.lineId === lineId ? {...it, qty: it.qty + 1} : it);
      }
      return [...prev, {
        lineId,
        productId: product.id,
        colorId,
        sizeId,
        sizeLabel: size?.label || "OS",
        price: product.price,
        qty: 1,
      }];
    });
  };

  const changeQty = (lineId, qty) => {
    if (qty <= 0) return removeItem(lineId);
    setItems(prev => prev.map(it => it.lineId === lineId ? {...it, qty} : it));
  };
  const removeItem = (lineId) => setItems(prev => prev.filter(it => it.lineId !== lineId));

  // ── PDP open helper (also opens cart on quick-add) ─────
  // Each open pushes a history entry (#slug) so the browser Back button closes the
  // product view instead of leaving the page; reloading/sharing #slug reopens it.
  const pushedRef = React.useRef(false);
  const openPdp = (product, colorId) => {
    setPdp({ product, colorId: colorId || product.defaultColor });
    if (!pushedRef.current) { history.pushState({ pv: 1 }, "", "#" + product.slug); pushedRef.current = true; }
  };
  const closePdp = () => {
    if (pushedRef.current) history.back(); // popstate below does the closing
    else { setPdp(null); history.replaceState(null, "", location.pathname + location.search); }
  };
  React.useEffect(() => {
    const fromHash = () => {
      const p = data.products.find(x => x.slug === location.hash.slice(1));
      setPdp(p ? { product: p, colorId: p.defaultColor } : null);
      pushedRef.current = false;
    };
    fromHash();
    window.addEventListener("popstate", fromHash);
    return () => window.removeEventListener("popstate", fromHash);
  }, []);

  // ── Quick-add with fly-to-cart animation ────────────────
  const quickAdd = (product, colorId, originEl) => {
    const size = product.sizes.find(s => !s.soldOut);
    if (!size) return;
    flyToCart(originEl, product, colorId, () => {
      addItem(product, colorId, size.id);
      setCartOpen(true);
    });
  };

  const flyToCart = (originEl, product, colorId, done) => {
    if (!originEl || tweaks.motionLevel === "off") { done(); return; }
    const rect = originEl.querySelector(".card__media")?.getBoundingClientRect();
    if (!rect) { done(); return; }
    const color = product.colors.find(c => c.id === colorId);
    const ghost = document.createElement("div");
    ghost.className = "fly-ghost";
    ghost.style.left = rect.left + (rect.width - 90)/2 + "px";
    ghost.style.top  = rect.top + (rect.height - 110)/2 + "px";
    ghost.innerHTML = `<img src="${window.IL_MANO_DATA.imgSrc(color.front, 480)}" alt="">`;
    document.body.appendChild(ghost);
    // target = nav bag area top-right
    const navBag = document.querySelector(".nav__group--right .nav__link:last-child");
    const tRect = navBag?.getBoundingClientRect() || { left: window.innerWidth - 80, top: 20, width: 40, height: 24 };
    const targetX = tRect.left + tRect.width/2 - rect.left - 45;
    const targetY = tRect.top  + tRect.height/2 - rect.top  - 55;
    ghost.animate([
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: `translate(${targetX/2}px, ${targetY/2 - 80}px) scale(0.65)`, opacity: 0.95, offset: 0.55 },
      { transform: `translate(${targetX}px, ${targetY}px) scale(0.15)`, opacity: 0 },
    ], { duration: 850, easing: "cubic-bezier(0.65, 0, 0.35, 1)" }).onfinish = () => {
      ghost.remove();
      done();
    };
  };

  // ── PDP add to bag ──────────────────────────────────────
  const pdpAdd = (product, colorId, sizeId) => {
    addItem(product, colorId, sizeId);
    // Brief delay so the user sees the "Added" state, then open cart
    setTimeout(() => {
      closePdp();
      setCartOpen(true);
    }, 700);
  };

  // ── Wishlist ────────────────────────────────────────────
  const toggleWish = (key) => {
    setWishlist(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // ── Magnetic CTA wiring ─────────────────────────────────
  React.useEffect(() => {
    if (tweaks.motionLevel === "off") return;
    const els = document.querySelectorAll("[data-magnet]");
    const cleanups = [];
    els.forEach(el => {
      let rect;
      const onEnter = () => { rect = el.getBoundingClientRect(); };
      const onMove = (e) => {
        if (!rect) rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width/2) * 0.18;
        const y = (e.clientY - rect.top - rect.height/2) * 0.18;
        el.style.transform = `translate(${x}px, ${y}px)`;
      };
      const onLeave = () => { el.style.transform = ""; rect = null; };
      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mousemove", onMove);
      el.addEventListener("mouseleave", onLeave);
      cleanups.push(() => {
        el.removeEventListener("mouseenter", onEnter);
        el.removeEventListener("mousemove", onMove);
        el.removeEventListener("mouseleave", onLeave);
        el.style.transform = "";
      });
    });
    return () => cleanups.forEach(fn => fn());
  }, [pdp, cartOpen, checkoutOpen, items, tweaks.motionLevel]);

  // ── Scroll reveal observer (any element added later) ────
  React.useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll(".reveal:not(.is-in)").forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [loaded]);

  return (
    <>
      <CookieNotice />
      <NewsletterSlideIn />
      <Nav cartCount={totalQty} onOpenCart={() => setCartOpen(true)} transparent={false} hideUntilScroll />

      <main>
        <Hero />
        <div className="hero-fade" aria-hidden />
        <Categories categories={data.categories} onPickCategory={(c) => {
          setFilter(c ? c.key : "all");
          // A category with a product opens straight into its product view;
          // "Browse all" / empty categories (no product yet) scroll to the collection.
          if (c && c.key === "gallery") { window.location.href = "/gallery"; return; }
          const product = c && data.products.find(p => p.categoryKey === c.key);
          if (product) { openPdp(product); return; }
          document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" });
        }} />
        <Collection data={data} filter={filter} setFilter={setFilter} onOpen={openPdp} onQuickAdd={quickAdd}
                    wishlist={wishlist} toggleWish={toggleWish} />
        <Lookbook />
        <Story pillars={data.storyPillars} />
        <Footer />
      </main>

      <PDP state={pdp} onClose={closePdp} onAdd={pdpAdd} products={data.products} />

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={items}
        findProduct={findProduct}
        onChangeQty={changeQty}
        onRemove={removeItem}
        onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }}
      />

      <Checkout
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        items={items}
        findProduct={findProduct}
        onComplete={() => { setItems([]); }}
      />

      <Tweaks tweaks={tweaks} setTweaks={setTweaks} />
    </>
  );
};

/* ─── Tweaks panel ──────────────────────────────────────── */
const Tweaks = ({ tweaks, setTweaks }) => {
  return (
    <TweaksPanel title="IL MANO · Tweaks">
      <TweakSection label="Surface" />
      <TweakRadio
        label="Palette"
        value={tweaks.surface}
        onChange={(v) => setTweaks("surface", v)}
        options={[
          { value: "warm",  label: "Warm" },
          { value: "cream", label: "Cream" },
          { value: "stark", label: "Stark" },
          { value: "dark",  label: "Dark" },
        ]}
      />
      <TweakSection label="Typography" />
      <TweakRadio
        label="Display face"
        value={tweaks.displayFace}
        onChange={(v) => setTweaks("displayFace", v)}
        options={[
          { value: "cormorant", label: "Cormorant Garamond" },
          { value: "playfair",  label: "Playfair Display" },
          { value: "space",     label: "Space Grotesk" },
        ]}
      />
      <TweakSection label="Motion" />
      <TweakRadio
        label="Intensity"
        value={tweaks.motionLevel}
        onChange={(v) => setTweaks("motionLevel", v)}
        options={[
          { value: "full", label: "Full" },
          { value: "low",  label: "Reduced" },
          { value: "off",  label: "Off" },
        ]}
      />
    </TweaksPanel>
  );
};

// Demo-open from tweaks
window.addEventListener("ilmano:open-cart", () => {
  // No-op: cart is React-controlled; keep here for future use.
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
