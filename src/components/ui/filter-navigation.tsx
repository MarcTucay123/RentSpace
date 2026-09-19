import Link from "next/link";

export type FilterOption = {
  value: string;
  label: string;
  count?: number;
};

type FilterNavigationProps = {
  basePath: string;
  selected: string;
  options: FilterOption[];
  label?: string;
  preservedParams?: Record<string, string>;
};

export function FilterNavigation({ basePath, selected, options, label = "Filter list", preservedParams = {} }: FilterNavigationProps) {
  return (
    <nav aria-label={label} className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
      {options.map((option) => {
        const active = selected === option.value;
        const query = new URLSearchParams(preservedParams);
        if (option.value === "all") query.delete("filter");
        else query.set("filter", option.value);
        const href = query.size > 0 ? `${basePath}?${query.toString()}` : basePath;

        return (
          <Link
            key={option.value}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition sm:text-sm ${
              active
                ? "border-[var(--color-dormmate-primary)] bg-[var(--color-dormmate-primary)] text-white shadow-sm"
                : "border-[var(--color-dormmate-border)] bg-white text-[#415a77] hover:bg-[var(--color-dormmate-green-soft)] hover:text-[#1b263b]"
            }`}
          >
            {option.label}
            {option.count !== undefined ? (
              <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] ${active ? "bg-white/20 text-white" : "bg-[var(--color-dormmate-green-soft)] text-[#1b263b]"}`}>
                {option.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}