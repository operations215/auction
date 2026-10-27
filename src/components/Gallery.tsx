"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Images } from "lucide-react";

export function Gallery({ images, alt, lot }: { images: string[]; alt: string; lot: string }) {
  const [i, setI] = useState(0);
  const n = images.length;
  const go = (d: number) => setI((cur) => (cur + d + n) % n);
  return (
    <div>
      <div
        className="gallery-main"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") go(-1);
          if (e.key === "ArrowRight") go(1);
        }}
        aria-label="Photo gallery. Use the arrow keys to browse."
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[i]} alt={`${alt}, photo ${i + 1} of ${n}`} />
        <span className="lot-tag" style={{ position: "absolute", top: 14, left: 14 }}>{lot}</span>
        {n > 1 && (
          <>
            <button className="icon-btn nav-arrow prev" onClick={() => go(-1)} aria-label="Previous photo">
              <ChevronLeft />
            </button>
            <button className="icon-btn nav-arrow next" onClick={() => go(1)} aria-label="Next photo">
              <ChevronRight />
            </button>
          </>
        )}
        <span className="chip chip-dark count">
          <Images /> {i + 1} / {n}
        </span>
      </div>
      {n > 1 && (
        <div className="gallery-thumbs">
          {images.map((src, k) => (
            <button key={src} className={k === i ? "active" : ""} onClick={() => setI(k)} aria-label={`Show photo ${k + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
