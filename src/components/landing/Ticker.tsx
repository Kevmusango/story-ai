const items = [
  "AI STORY ENGINE LIVE",
  "6× MORE ENGAGEMENT THAN ADS",
  "NEW: MULTI-INDUSTRY STORIES",
  "2,400+ BUSINESSES CREATING",
  "REAL ESTATE · RESTAURANTS · GYM · AUTO · EDUCATION · TOURISM",
  "FIRST STORY FREE — NO CREDIT CARD",
];

export function Ticker() {
  const row = [...items, ...items];

  return (
    <div className="bg-[#0e0e12] border-b border-white/5 py-2 overflow-hidden">
      <div
        className="flex whitespace-nowrap will-change-transform"
        style={{ animation: "ticker-scroll 35s linear infinite" }}
      >
        {row.map((t, i) => (
          <span
            key={i}
            className="text-[11px] tracking-widest text-white/40 uppercase px-6 flex items-center gap-6"
          >
            {t}
            <span className="text-[#c8ff00]">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
