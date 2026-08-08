"use client";

import { useCallback, useRef, useState } from "react";
import styles from "../page.module.css";

type CaretPos = { left: number; top: number; height: number };

export default function HomeTagline() {
  const ref = useRef<HTMLHeadingElement>(null);
  const [caret, setCaret] = useState<CaretPos | null>(null);

  const updateCaret = useCallback((clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return;

    const doc = document as Document & {
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
      caretPositionFromPoint?: (
        x: number,
        y: number
      ) => { offsetNode: Node; offset: number } | null;
    };

    let range: Range | null = null;
    if (typeof doc.caretRangeFromPoint === "function") {
      range = doc.caretRangeFromPoint(clientX, clientY);
    } else if (typeof doc.caretPositionFromPoint === "function") {
      const pos = doc.caretPositionFromPoint(clientX, clientY);
      if (pos) {
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
      }
    }

    if (!range || !el.contains(range.startContainer)) {
      return;
    }

    const rects = range.getClientRects();
    const rect = rects.length > 0 ? rects[0] : range.getBoundingClientRect();
    const parent = el.getBoundingClientRect();
    const fontSize = parseFloat(getComputedStyle(el).fontSize) || parent.height;
    // Cap caret to glyph size so it doesn't run past the letter bottoms
    const rawHeight = rect.height > 0 ? rect.height : fontSize;
    const height = Math.min(rawHeight, fontSize) * 0.78;
    const topBase = rect.top - parent.top;
    const top =
      topBase + Math.max(0, (rawHeight - height) / 2);

    setCaret({
      left: rect.left - parent.left,
      top,
      height,
    });
  }, []);

  return (
    <h1
      ref={ref}
      className={styles.landingHeadline}
      onMouseEnter={(e) => updateCaret(e.clientX, e.clientY)}
      onMouseMove={(e) => updateCaret(e.clientX, e.clientY)}
      onMouseLeave={() => setCaret(null)}
    >
      Precise. Fast.{" "}
      <span className={styles.landingHeadlineAccent}>Funky Yellow.</span>
      {caret && (
        <span
          className={styles.landingHeadlineCaret}
          style={{
            left: caret.left,
            top: caret.top,
            height: caret.height,
          }}
          aria-hidden
        />
      )}
    </h1>
  );
}
