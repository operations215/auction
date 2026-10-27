"use client";

/** A sort dropdown that applies as soon as it changes. The Go button stays for no-JS browsers. */
export function SortSelect({ value, options }: { value: string; options: [string, string][] }) {
  return (
    <>
      <select
        id="sort"
        name="sort"
        className="select"
        defaultValue={value}
        style={{ width: 200, height: 38 }}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        {options.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
      </select>
      <noscript><button className="btn btn-sm">Go</button></noscript>
    </>
  );
}
