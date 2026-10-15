// Original Figma exports, positioned inside the design's 20 px icon slot.
export function SocialIcon({ provider }: { provider: "Google" | "Facebook" }) {
  if (provider === "Facebook")
    return <img src="/assets/5561e.svg" width={20} height={20} alt="" />;
  const parts = [
    ["88a3c", "57.68% 17.83% 0 7.11%"],
    ["75804", "71.33% 17.83% 0 50%"],
    ["a3c98", "24.69% 75.25% 24.69% 0"],
    ["1c266", "38.28% 0 11.97% 47.07%"],
    ["1174b", "38.28% 0 11.97% 50%"],
    ["5f1dc", "0 17.01% 57.68% 7.11%"],
    ["e1073", "0 17.01% 70.51% 50%"],
  ];
  return (
    <span className="google-icon" aria-hidden="true">
      {parts.map(([asset, inset]) => (
        <span key={asset} style={{ position: "absolute", inset }}>
          <img src={`/assets/${asset}.svg`} alt="" />
        </span>
      ))}
    </span>
  );
}
