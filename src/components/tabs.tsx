import type { KeyboardEvent } from "react";
export function Tabs({
  id,
  label,
  value,
  onChange,
  tabs,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  tabs: readonly (readonly [string, string])[];
  className?: string;
}) {
  const keyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft")
      next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    onChange(tabs[next][0]);
    const buttons =
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]',
      );
    buttons?.item(next)?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className={className}>
      {tabs.map(([key, title], index) => (
        <button
          key={key}
          role="tab"
          id={`${id}-${key}-tab`}
          aria-controls={`${id}-panel`}
          aria-selected={key === value}
          tabIndex={key === value ? 0 : -1}
          onClick={() => onChange(key)}
          onKeyDown={(event) => keyDown(event, index)}
        >
          {title}
        </button>
      ))}
    </div>
  );
}
