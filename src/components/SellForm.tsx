"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { BadgeCheck, CircleAlert, Gavel, ImagePlus, Receipt, RotateCcw, Star, Timer } from "lucide-react";
import { createListing, type FormState } from "@/app/actions";

type Photo = { file: File; url: string };
const MAX = 10;
const money = (c: number) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

/** Downscale big phone photos in the browser so uploads stay fast. Falls back to the original. */
async function shrink(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1.5e6) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.86));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

export function SellForm(props: {
  categories: { slug: string; name: string }[];
  conditions: readonly string[];
  paypalEmail: string;
  location: string;
  feeNote: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(createListing, undefined);
  const [pending, start] = useTransition();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [drag, setDrag] = useState(false);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [shipping, setShipping] = useState("");
  const [days, setDays] = useState("7");
  const fileRef = useRef<HTMLInputElement>(null);
  const f = state?.fields ?? {};

  async function add(list: FileList | null) {
    if (!list) return;
    const files = Array.from(list).filter((x) => x.type.startsWith("image/")).slice(0, MAX - photos.length);
    const processed = await Promise.all(files.map(shrink));
    setPhotos((p) => [...p, ...processed.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, MAX));
  }

  function remove(i: number) {
    setPhotos((p) => p.filter((_, k) => k !== i));
  }

  function makeCover(i: number) {
    setPhotos((p) => [p[i], ...p.filter((_, k) => k !== i)]);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.delete("photos");
    photos.forEach((p) => fd.append("photos", p.file));
    start(() => action(fd));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const cents = Math.round(parseFloat(price || "0") * 100) || 0;
  const shipCents = Math.round(parseFloat(shipping || "0") * 100) || 0;

  return (
    <form onSubmit={submit} className="sell-layout" noValidate>
      <div>
        {state?.error && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: 18 }}>
            <CircleAlert /> <span>{state.error}</span>
          </div>
        )}

        <section className="card sell-step">
          <h3><span className="step-num">1</span> Photos</h3>
          <p className="muted small">Up to {MAX} photos. Show the front, back, labels, stamps, maker&apos;s marks and any damage. The first photo is the cover.</p>
          <label
            className={`dropzone${drag ? " drag" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
          >
            <ImagePlus />
            <b>Drop photos here or click to choose</b>
            <div className="small muted">JPEG, PNG, WebP or GIF · up to 8 MB each</div>
            <input ref={fileRef} type="file" name="photos" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
          </label>
          {photos.length > 0 && (
            <div className="previews">
              {photos.map((p, i) => (
                <div className="p" key={p.url}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={`Photo ${i + 1}`} onClick={() => makeCover(i)} style={{ cursor: i ? "pointer" : "default" }} title={i ? "Make cover photo" : "Cover photo"} />
                  {i === 0 && <span className="chip chip-brass cover-badge">Cover</span>}
                  <button type="button" onClick={() => remove(i)} aria-label={`Remove photo ${i + 1}`}>×</button>
                </div>
              ))}
            </div>
          )}
          {photos.length > 1 && <p className="small muted" style={{ margin: "8px 0 0" }}>Tip: click a photo to make it the cover.</p>}
        </section>

        <section className="card sell-step">
          <h3><span className="step-num">2</span> Describe your item</h3>
          <div className="field">
            <label htmlFor="title">Title</label>
            <input id="title" name="title" className="input" maxLength={90} required defaultValue={f.title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. US Army M-1965 Field Jacket, Medium-Regular, 1972 dated" />
            <span className="hint">Include the item, country, model or pattern, size and date if known.</span>
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="category">Category</label>
              <select id="category" name="category" className="select" required defaultValue={f.category ?? ""}>
                <option value="" disabled>Choose a category</option>
                {props.categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="condition">Condition</label>
              <select id="condition" name="condition" className="select" required defaultValue={f.condition ?? ""}>
                <option value="" disabled>Choose condition</option>
                {props.conditions.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="era">Era / conflict</label>
              <input id="era" name="era" className="input" defaultValue={f.era} placeholder="e.g. Vietnam War, Cold War, WWII" />
            </div>
            <div className="field">
              <label htmlFor="origin_country">Country of origin</label>
              <input id="origin_country" name="origin_country" className="input" defaultValue={f.origin_country} placeholder="e.g. United States, West Germany" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="markings">Markings &amp; stamps</label>
            <input id="markings" name="markings" className="input" defaultValue={f.markings} placeholder="e.g. Contract DSA-100-72-C-1234, size label intact, maker 'Alpha Industries'" />
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea id="description" name="description" className="textarea" required defaultValue={f.description} style={{ minHeight: 180 }} placeholder="Describe the item honestly: measurements, wear, repairs, smells, missing parts, and anything a collector would want to know." />
          </div>
          <div className="field">
            <label htmlFor="provenance">Provenance (optional)</label>
            <textarea id="provenance" name="provenance" className="textarea" defaultValue={f.provenance} style={{ minHeight: 80 }} placeholder="Where did it come from? Veteran's estate, unit, paperwork, previous collections…" />
          </div>
        </section>

        <section className="card sell-step">
          <h3><span className="step-num">3</span> Pricing &amp; auction length</h3>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="starting_price">Starting bid</label>
              <div className="input-money"><input id="starting_price" name="starting_price" className="input" inputMode="decimal" required defaultValue={f.starting_price} onChange={(e) => setPrice(e.target.value)} placeholder="9.99" /></div>
              <span className="hint">Low starting bids attract more bidders.</span>
            </div>
            <div className="field">
              <label htmlFor="reserve_price">Reserve price (optional)</label>
              <div className="input-money"><input id="reserve_price" name="reserve_price" className="input" inputMode="decimal" defaultValue={f.reserve_price} placeholder="Hidden minimum" /></div>
              <span className="hint">The item won&apos;t sell below this. Bidders only see whether it&apos;s met.</span>
            </div>
          </div>
          <div className="field">
            <span className="label">Auction length</span>
            <div className="duration-pick" role="radiogroup">
              {["1", "3", "5", "7", "10"].map((d) => (
                <label key={d}>
                  <input type="radio" name="duration" value={d} checked={days === d} onChange={() => setDays(d)} />
                  <span>{d} {d === "1" ? "day" : "days"}</span>
                </label>
              ))}
            </div>
            <span className="hint">7 days is the sweet spot: two weekends of browsing.</span>
          </div>
        </section>

        <section className="card sell-step">
          <h3><span className="step-num">4</span> Shipping, returns &amp; payment</h3>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="shipping">Shipping cost</label>
              <div className="input-money"><input id="shipping" name="shipping" className="input" inputMode="decimal" defaultValue={f.shipping} onChange={(e) => setShipping(e.target.value)} placeholder="0.00 for free shipping" /></div>
            </div>
            <div className="field">
              <label htmlFor="ships_from">Ships from</label>
              <input id="ships_from" name="ships_from" className="input" defaultValue={f.ships_from ?? props.location} placeholder="City, State" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="paypal_email">PayPal email for payment</label>
            <input id="paypal_email" name="paypal_email" type="email" className="input" required defaultValue={f.paypal_email ?? props.paypalEmail} placeholder="you@example.com" />
            <span className="hint">The winning bidder pays straight into this PayPal account. It&apos;s never shown publicly.</span>
          </div>
          <div className="fee-note">
            <Receipt />
            <span>{props.feeNote} <a className="link" href="/how-it-works#fees" target="_blank">How fees work</a></span>
          </div>
          <div className="stack" style={{ gap: 10 }}>
            <label className="check"><input type="checkbox" name="authenticity_guarantee" defaultChecked /> <span><b>I guarantee this item is original</b>, not a reproduction, unless the title says otherwise. Adds an authenticity badge.</span></label>
            <label className="check"><input type="checkbox" name="returns_accepted" /> <span>Accept returns within 14 days (buyer pays return shipping).</span></label>
          </div>
        </section>

        <section className="card sell-step">
          <h3><span className="step-num">5</span> Confirm &amp; publish</h3>
          <div className="rules-box">
            <b>Quartermaster does not allow:</b>
            <ul>
              <li>Firearms, receivers, frames, magazines or ammunition, live or inert-but-convertible</li>
              <li>Explosives, grenades, fuzes or ordnance, unless certified inert and legally saleable where you are</li>
              <li>Body armor or items restricted where you or the buyer live, or stolen government property</li>
              <li>Reproductions passed off as originals</li>
            </ul>
          </div>
          <label className="check" style={{ marginBottom: 18 }}>
            <input type="checkbox" name="confirm_rules" required />
            <span>This item follows the <a className="link" href="/rules" target="_blank">listing rules</a>, I own it, and my photos and description are accurate.</span>
          </label>
          <button className="btn btn-brass btn-lg" disabled={pending}>
            <Gavel /> {pending ? "Publishing…" : "Publish auction"}
          </button>
        </section>
      </div>

      <aside className="sell-aside stack" style={{ position: "sticky", top: 90, gap: 16 }}>
        <div className="eyebrow">Live preview</div>
        <article className="lcard" style={{ pointerEvents: "none" }}>
          <div className="lcard-img">
            {photos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photos[0].url} alt="" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/placeholder.svg" alt="" />
            )}
            <span className="lot lot-tag">LOT NEW</span>
            <span className="tl"><span className="chip chip-dark"><Timer /> {days}d 0h</span></span>
          </div>
          <div className="lcard-body">
            <div className="lcard-title">{title || "Your item title appears here"}</div>
            <div className="lcard-foot">
              <div className="lcard-price"><small>Starting bid</small>{money(cents)}</div>
              <div className="lcard-bids">0 bids<br />{shipCents ? `+${money(shipCents)} ship` : "Free shipping"}</div>
            </div>
          </div>
        </article>
        <div className="card" style={{ padding: 18 }}>
          <b style={{ display: "block", marginBottom: 8 }}>What sells well</b>
          <ul className="small" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6, color: "var(--ink-2)" }}>
            <li><Star size={13} style={{ verticalAlign: -2 }} /> Bright, sharp photos on a plain background</li>
            <li><BadgeCheck size={13} style={{ verticalAlign: -2 }} /> Close-ups of labels, stamps and contract numbers</li>
            <li><RotateCcw size={13} style={{ verticalAlign: -2 }} /> Honest notes on flaws: it builds trust and prevents returns</li>
            <li><Timer size={13} style={{ verticalAlign: -2 }} /> End your auction on a Sunday evening</li>
          </ul>
        </div>
      </aside>
    </form>
  );
}
