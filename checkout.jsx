/* ─── Checkout (real Stripe Elements, frontend-only) ──────── */

const Checkout = ({ open, onClose, items, findProduct, onComplete }) => {
  const [step, setStep] = React.useState(0); // 0=contact, 1=delivery, 2=pay, 3=success
  const [contact, setContact] = React.useState({ email: "", phone: "" });
  const [delivery, setDelivery] = React.useState({
    firstName: "", lastName: "",
    address: "", apt: "",
    city: "", state: "", postal: "",
    country: "United States",
  });
  const [method, setMethod] = React.useState("card");
  const [cardholder, setCardholder] = React.useState("");
  const [paying, setPaying] = React.useState(false);
  const [error, setError] = React.useState("");
  const [orderRef, setOrderRef] = React.useState(null);
  const cardElRef = React.useRef(null);
  const stripeRef = React.useRef(null);
  const cardElementRef = React.useRef(null);

  React.useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
  }, [open]);

  React.useEffect(() => {
    if (!open) {
      // Reset on close (after transition)
      const t = setTimeout(() => {
        setStep(0); setError(""); setPaying(false); setOrderRef(null);
      }, 700);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Initialize Stripe Elements when step 2 mounts
  React.useEffect(() => {
    if (step !== 2 || method !== "card") return;
    if (!window.Stripe) {
      setError("Stripe failed to load. Please reload and try again.");
      return;
    }
    if (!stripeRef.current) {
      stripeRef.current = window.Stripe(window.IL_MANO_DATA.settings.stripePublishableKey);
    }
    const stripe = stripeRef.current;
    const elements = stripe.elements({
      fonts: [{ cssSrc: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap" }],
    });
    const isDark = document.body.dataset.surface === "dark";
    const inkColor = isDark ? "#f5f4f0" : "#0a0a0a";
    const midColor = isDark ? "#6a6660" : "#8c8780";
    const cardEl = elements.create("card", {
      hidePostalCode: true,
      style: {
        base: {
          color: inkColor,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "14px",
          letterSpacing: "0.06em",
          "::placeholder": { color: midColor },
          iconColor: inkColor,
        },
        invalid: { color: "#b3492f", iconColor: "#b3492f" },
      },
    });
    const t = setTimeout(() => {
      if (cardElRef.current) {
        cardEl.mount(cardElRef.current);
        cardElementRef.current = cardEl;
      }
    }, 50);
    return () => {
      clearTimeout(t);
      try { cardEl.unmount(); } catch (e) {}
      cardElementRef.current = null;
    };
  }, [step, method, open]);

  const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);
  const { shipping, tax, total } = window.IL_MANO_DATA.computeTotals(subtotal);

  const goNext = () => {
    setError("");
    if (step === 0) {
      if (!contact.email.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) { setError("Enter a valid email."); return; }
      setStep(1);
    } else if (step === 1) {
      if (!delivery.firstName || !delivery.lastName || !delivery.address || !delivery.city || !delivery.postal) {
        setError("Complete your delivery address.");
        return;
      }
      setStep(2);
    }
  };

  const goBack = () => {
    setError("");
    if (step > 0 && step < 3) setStep(step - 1);
  };

  const onPay = async () => {
    setError("");
    if (paying) return;
    if (method !== "card") {
      setError("Apple Pay / Google Pay aren't available yet — please pay by card.");
      return;
    }
    if (!cardholder.trim()) { setError("Add the name on card."); return; }
    if (!stripeRef.current || !cardElementRef.current) { setError("Card field still loading…"); return; }
    setPaying(true);
    try {
      // 1. Create the PaymentMethod (tokenize the card — never touches our server).
      const pmResult = await stripeRef.current.createPaymentMethod({
        type: "card",
        card: cardElementRef.current,
        billing_details: {
          name: cardholder,
          email: contact.email,
          phone: contact.phone,
          address: {
            line1: delivery.address,
            line2: delivery.apt,
            city: delivery.city,
            state: delivery.state,
            postal_code: delivery.postal,
            country: "US",
          },
        },
      });
      if (pmResult.error) {
        setError(pmResult.error.message || "Card was declined.");
        setPaying(false);
        return;
      }

      // 2. Ask our backend to create a PaymentIntent (server recomputes the total —
      //    it never trusts a price from the browser).
      const piRes = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: contact.email,
          firstName: delivery.firstName,
          lastName: delivery.lastName,
          address: delivery.address,
          apt: delivery.apt,
          city: delivery.city,
          state: delivery.state,
          postal: delivery.postal,
          country: delivery.country,
          items: items.map(it => ({ productId: it.productId, colorId: it.colorId, sizeId: it.sizeId, qty: it.qty })),
        }),
      });
      const piData = await piRes.json();
      if (!piRes.ok) {
        setError(piData.error || "Could not start payment. Please try again.");
        setPaying(false);
        return;
      }

      // 3. Confirm the PaymentIntent with the tokenized card — this authorizes the
      //    card (places a hold) but does not capture funds yet.
      const confirmResult = await stripeRef.current.confirmCardPayment(piData.clientSecret, {
        payment_method: pmResult.paymentMethod.id,
      });
      if (confirmResult.error) {
        setError(confirmResult.error.message || "Payment could not be confirmed.");
        setPaying(false);
        return;
      }
      const intent = confirmResult.paymentIntent;
      if (intent.status !== "requires_capture" && intent.status !== "succeeded") {
        setError("Payment is pending — please try again in a moment.");
        setPaying(false);
        return;
      }

      setOrderRef(intent.id);
      setStep(3);
      onComplete && onComplete(intent.id, pmResult.paymentMethod.id);
    } catch (e) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  const steps = ["Contact", "Delivery", "Payment"];

  return (
    <div className={"checkout" + (open ? " is-open" : "")}>
      <header className="checkout__head">
        <div className="checkout__head-left">
          <button className="cart__close" onClick={onClose} aria-label="Close" style={{width: 32, height: 32}}>
            <Icon name="close" size={14}/>
          </button>
          {step > 0 && step < 3 && (
            <button onClick={goBack} style={{fontFamily:'var(--font-mono)', fontSize: 10, letterSpacing:'0.22em', textTransform:'uppercase', color:'var(--mid)'}}>← Back</button>
          )}
        </div>
        <div className="checkout__wordmark">IL MANO</div>
        <div className="checkout__head-right">
          <div className="checkout__steps">
            {steps.map((s, i) => (
              <div key={s} className={"checkout__step" + (i === step ? " is-active" : "") + (i < step ? " is-done" : "")}>
                <div className="checkout__step-num">{i < step ? <Icon name="check" size={11}/> : i + 1}</div>
                <span className="checkout__step-lbl">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {step === 3 ? (
        <div className="checkout__success">
          <div className="checkout__success-mark">
            <Icon name="check" size={36} stroke={1.2}/>
          </div>
          <div className="kinetic" style={{fontSize: 10, letterSpacing: '0.3em', color: 'var(--mid)'}}>Order Received</div>
          <h1>Thank you, <em style={{fontStyle:'italic'}}>{delivery.firstName || "friend"}</em>.</h1>
          <p>Your card has been authorized and your order is being reviewed before it ships from Los Angeles. A confirmation is on its way to {contact.email}.</p>
          <div className="checkout__success-meta">
            <div><b>Order</b>{orderRef}</div>
            <div><b>Total</b>{fmtPrice(total)}</div>
            <div><b>Delivery</b>4–6 business days</div>
          </div>
          <button className="cta cta--secondary" style={{maxWidth: 260, marginTop: 36}} onClick={onClose}>Continue browsing</button>
        </div>
      ) : (
        <div className="checkout__body">
          <div className="checkout__form">
            {step === 0 && (
              <>
                <h2>Contact.</h2>
                <div className="field-row field-row--single">
                  <div className="field">
                    <input type="email" placeholder=" " value={contact.email} onChange={(e)=>setContact({...contact, email:e.target.value})} />
                    <label>Email</label>
                  </div>
                </div>
                <div className="field-row field-row--single">
                  <div className="field">
                    <input type="tel" placeholder=" " value={contact.phone} onChange={(e)=>setContact({...contact, phone:e.target.value})} />
                    <label>Phone (optional · for shipping updates)</label>
                  </div>
                </div>
                <div style={{display:'flex', alignItems:'center', gap: 10, marginTop: 8, fontSize: 12, color: 'var(--mid)'}}>
                  <input type="checkbox" defaultChecked /> Email me about new drops & private restocks
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <h2>Delivery.</h2>
                <div className="field-row">
                  <div className="field"><input placeholder=" " value={delivery.firstName} onChange={(e)=>setDelivery({...delivery, firstName:e.target.value})}/><label>First name</label></div>
                  <div className="field"><input placeholder=" " value={delivery.lastName} onChange={(e)=>setDelivery({...delivery, lastName:e.target.value})}/><label>Last name</label></div>
                </div>
                <div className="field-row field-row--single">
                  <div className="field"><input placeholder=" " value={delivery.address} onChange={(e)=>setDelivery({...delivery, address:e.target.value})}/><label>Street address</label></div>
                </div>
                <div className="field-row field-row--single">
                  <div className="field"><input placeholder=" " value={delivery.apt} onChange={(e)=>setDelivery({...delivery, apt:e.target.value})}/><label>Apartment, suite, etc. (optional)</label></div>
                </div>
                <div className="field-row">
                  <div className="field"><input placeholder=" " value={delivery.city} onChange={(e)=>setDelivery({...delivery, city:e.target.value})}/><label>City</label></div>
                  <div className="field"><input placeholder=" " value={delivery.state} onChange={(e)=>setDelivery({...delivery, state:e.target.value})}/><label>State / Region</label></div>
                </div>
                <div className="field-row">
                  <div className="field"><input placeholder=" " value={delivery.postal} onChange={(e)=>setDelivery({...delivery, postal:e.target.value})}/><label>Postal code</label></div>
                  <div className="field"><input placeholder=" " value={delivery.country} onChange={(e)=>setDelivery({...delivery, country:e.target.value})}/><label>Country</label></div>
                </div>

                <div className="checkout__section-label">— Shipping method</div>
                <div className="method-row">
                  <div className="method is-active">Standard · Free</div>
                  <div className="method">Express · $18</div>
                  <div className="method">Same Day LA · $35</div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h2>Payment.</h2>
                <div className="checkout__section-label">— Pay with</div>
                <div className="method-row">
                  {[
                    { id: "card", lbl: "Card" },
                    { id: "apple", lbl: "Apple Pay · Soon" },
                    { id: "google", lbl: "Google Pay · Soon" },
                  ].map(m => (
                    <div key={m.id}
                         className={"method" + (method === m.id ? " is-active" : "") + (m.id !== "card" ? " is-disabled" : "")}
                         onClick={() => m.id === "card" && setMethod(m.id)}>{m.lbl}</div>
                  ))}
                </div>

                {method === "card" ? (
                  <>
                    <div className="field-row field-row--single">
                      <div className="field">
                        <input placeholder=" " value={cardholder} onChange={(e)=>setCardholder(e.target.value)}/>
                        <label>Name on card</label>
                      </div>
                    </div>
                    <div className="field-row field-row--single" style={{marginTop: 4}}>
                      <div className="card-input">
                        <div className="card-input__brand">CARD</div>
                        <div ref={cardElRef} style={{flex:1}} />
                      </div>
                    </div>
                    <p style={{fontFamily:'var(--font-mono)', fontSize: 10, letterSpacing:'0.18em', color:'var(--mid)', textTransform:'uppercase', marginTop: 18, display:'flex', alignItems:'center', gap: 8}}>
                      <Icon name="lock" size={12}/> Secured & tokenized by Stripe
                    </p>
                  </>
                ) : (
                  <div style={{padding: '40px 0', textAlign:'center', color:'var(--mid)', fontFamily:'var(--font-mono)', fontSize: 11, letterSpacing:'0.16em', textTransform:'uppercase'}}>
                    {method === "apple" ? "Apple Pay" : "Google Pay"} will open after you confirm
                  </div>
                )}
              </>
            )}

            {error && (
              <div style={{marginTop: 18, color:'#b3492f', fontFamily:'var(--font-mono)', fontSize: 11, letterSpacing:'0.08em'}}>{error}</div>
            )}

            <div style={{marginTop: 32}}>
              {step < 2 ? (
                <button className="cta" onClick={goNext} data-magnet>
                  Continue <Icon name="arrow-right" size={14}/>
                </button>
              ) : (
                <button className="cta" onClick={onPay} disabled={paying} data-magnet>
                  {paying ? "Processing…" : <>Pay {fmtPrice(total)} <Icon name="lock" size={13}/></>}
                </button>
              )}
            </div>

            <div style={{marginTop: 28, display:'flex', gap: 20, alignItems:'center', fontFamily:'var(--font-mono)', fontSize: 10, letterSpacing:'0.18em', color:'var(--mid)', textTransform:'uppercase'}}>
              <span><Icon name="lock" size={11}/> SSL Encrypted</span>
              <span>· Free returns 14 days</span>
              <span>· Made in LA</span>
            </div>
          </div>

          <aside className="checkout__summary">
            <h3>— Order summary</h3>
            {items.map((it) => {
              const product = findProduct(it.productId);
              const color = product?.colors.find(c => c.id === it.colorId);
              return (
                <div className="sum-line" key={it.lineId}>
                  <div className="sum-line__img"><img {...window.IL_MANO_DATA.imgAttrs(color?.front, "64px")} alt=""/></div>
                  <div>
                    <div className="sum-line__name">{product.name}</div>
                    <div className="sum-line__meta">{color?.name} · {it.sizeLabel} · ×{it.qty}</div>
                  </div>
                  <div className="sum-line__price">{fmtPrice(it.price * it.qty)}</div>
                </div>
              );
            })}
            <div className="sum-totals">
              <div className="sum-row"><span>Subtotal</span><span>{fmtPrice(subtotal)}</span></div>
              <div className="sum-row"><span>Shipping</span><span>{shipping === 0 ? "Free" : fmtPrice(shipping)}</span></div>
              <div className="sum-row"><span>Tax (est.)</span><span>{fmtPrice(tax)}</span></div>
              <div className="sum-row sum-row--total"><span>Total</span><span>{fmtPrice(total)}</span></div>
            </div>
            <p style={{marginTop: 22, fontFamily:'var(--font-mono)', fontSize: 10, letterSpacing:'0.18em', color:'var(--mid)', textTransform:'uppercase'}}>
              Manufactured & shipped from Los Angeles · 4–6 business days
            </p>
          </aside>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { Checkout });
