"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ListSearchFormProps = {
  basePath: string;
  query: string;
  selectedFilter?: string;
  placeholder: string;
  label: string;
  suggestions?: string[];
  preservedParams?: Record<string, string>;
};

export function ListSearchForm({ basePath, query, selectedFilter = "all", placeholder, label, suggestions = [], preservedParams = {} }: ListSearchFormProps) {
  const router = useRouter();
  const [value, setValue] = useState(query);
  const [focused, setFocused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const normalizedValue = value.trim().toLocaleLowerCase();
  const matchingSuggestions = normalizedValue
    ? suggestions.filter((suggestion) => suggestion.toLocaleLowerCase().includes(normalizedValue)).slice(0, 6)
    : [];

  function navigate(nextQuery: string) {
    const params = new URLSearchParams(preservedParams);
    if (selectedFilter !== "all") params.set("filter", selectedFilter);
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    router.replace(params.size > 0 ? `${basePath}?${params.toString()}` : basePath, { scroll: false });
  }

  function updateValue(nextValue: string) {
    setValue(nextValue);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => navigate(nextValue), 300);
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); navigate(value); }} className="flex w-full items-start gap-2">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">{label}</span>
        <input name="q" type="search" value={value} onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 150)} onChange={(event) => updateValue(event.target.value)} placeholder={placeholder} autoComplete="off" className="w-full rounded-[14px] border border-[var(--color-dormmate-border)] bg-[var(--color-dormmate-surface)] px-4 py-2.5 text-sm outline-none transition placeholder:text-[#778da9] focus:border-[var(--color-dormmate-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--color-dormmate-primary-soft)]" />
        {focused && matchingSuggestions.length > 0 ? (
          <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-[14px] border border-[var(--color-dormmate-border)] bg-white py-1 shadow-lg">
            {matchingSuggestions.map((suggestion) => (
              <button key={suggestion} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setValue(suggestion); setFocused(false); navigate(suggestion); }} className="block w-full px-4 py-2 text-left text-sm text-[var(--color-dormmate-text-strong)] hover:bg-[var(--color-dormmate-green-soft)]">{suggestion}</button>
            ))}
          </div>
        ) : null}
      </label>
      {value ? <button type="button" onClick={() => { updateValue(""); navigate(""); }} className="rounded-[14px] border border-[var(--color-dormmate-border)] px-4 py-2.5 text-sm font-semibold text-[var(--color-dormmate-muted)] hover:bg-[var(--color-dormmate-surface)]">Clear</button> : null}
    </form>
  );
}