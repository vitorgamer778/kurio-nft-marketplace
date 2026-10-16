export function SlideControls({
  value,
  onChange,
  label,
  controls,
  className = "",
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  controls: string;
  className?: string;
}) {
  return (
    <div
      className={"slide-controls " + className}
      role="group"
      aria-label={label}
    >
      {[0, 1, 2].map((index) => (
        <button
          key={index}
          type="button"
          aria-label={`${label} ${index + 1}`}
          aria-pressed={index === value}
          aria-controls={controls}
          onClick={() => onChange(index)}
        >
          <span>
            <img
              src="/assets/a11b7.svg"
              alt=""
              width={40}
              height={8}
              style={{ transform: `translateX(-${index * 16}px)` }}
            />
          </span>
        </button>
      ))}
    </div>
  );
}
