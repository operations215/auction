import { orderStage, type ListingRow } from "@/lib/auctions";

const STEPS = [
  ["won", "Won"],
  ["paid", "Paid"],
  ["shipped", "Shipped"],
  ["received", "Delivered"],
] as const;

export function OrderTimeline({ l }: { l: Pick<ListingRow, "paid_at" | "shipped_at" | "received_at"> }) {
  const stage = orderStage(l);
  const idx = STEPS.findIndex(([k]) => k === stage);
  return (
    <div className="timeline" aria-label={`Order status: ${STEPS[idx][1]}`}>
      {STEPS.map(([k, label], i) => (
        <div key={k} className={`step${i <= idx ? " done" : ""}${i === idx + 1 ? " current" : ""}`}>{label}</div>
      ))}
    </div>
  );
}
