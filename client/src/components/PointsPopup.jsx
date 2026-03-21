import { useEffect, useRef } from 'react';

// ── Badge tiers (shared constant) ─────────────────────────────────────────────
const BADGES = [
  { name: 'Newbie',     threshold: 20  },
  { name: 'Explorer',   threshold: 40  },
  { name: 'Achiever',   threshold: 60  },
  { name: 'Specialist', threshold: 80  },
  { name: 'Expert',     threshold: 100 },
  { name: 'Master',     threshold: 120 },
];

function getBadgeInfo(totalPoints) {
  let currentBadge  = BADGES[0];
  let currentIdx    = 0;

  for (let i = 0; i < BADGES.length; i++) {
    if (totalPoints >= BADGES[i].threshold) {
      currentBadge = BADGES[i];
      currentIdx   = i;
    } else {
      break;
    }
  }

  const nextBadge      = BADGES[currentIdx + 1] ?? null;
  const prevThreshold  = currentIdx > 0 ? BADGES[currentIdx - 1].threshold : 0;
  const nextThreshold  = nextBadge?.threshold ?? BADGES[BADGES.length - 1].threshold;

  // Progress within current badge range
  const range    = nextThreshold - prevThreshold;
  const progress = range > 0
    ? Math.min((totalPoints - prevThreshold) / range, 1)
    : 1;

  return { currentBadge, nextBadge, prevThreshold, nextThreshold, progress };
}

// ─────────────────────────────────────────────────────────────────────────────
// POINTS POPUP MODAL
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Props:
 *   pointsEarned        – number of points earned this attempt
 *   updatedTotalPoints  – new total after earning
 *   onClose             – called when X or backdrop is clicked
 */
export default function PointsPopup({ pointsEarned, updatedTotalPoints, onClose }) {
  const { currentBadge, nextBadge, prevThreshold, nextThreshold, progress } =
    getBadgeInfo(updatedTotalPoints);

  const isMaxed = !nextBadge;

  // Close on Escape key
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') closeRef.current?.();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Fill width (clamped 0–100%)
  const fillPct = Math.round(progress * 100);

  return (
    /* ── Dark overlay ── */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center
                 bg-black/60 backdrop-blur-sm animate-fade-in px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* ── White modal card ── */}
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl
                   overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Blue top accent strip */}
        <div className="h-1.5 bg-[#1a24cc] w-full" />

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100
                     flex items-center justify-center text-gray-400
                     hover:bg-gray-200 hover:text-gray-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="px-8 py-7">
          {/* ── Bingo header ── */}
          <div className="flex items-baseline gap-2 mb-5">
            <span className="text-3xl font-black text-[#1a24cc] leading-none">
              Bingo!
            </span>
            <span className="text-base font-medium text-gray-500">
              You have earned!
            </span>
          </div>

          {/* ── Points earned display ── */}
          <div className="flex items-end gap-2 mb-6">
            <span className="text-5xl font-black text-[#1a24cc] leading-none tabular-nums">
              {pointsEarned}
            </span>
            <span className="text-xl font-semibold text-[#1a24cc] mb-1">
              points
            </span>
            <span className="ml-auto text-sm text-gray-400 mb-1">
              Total: <span className="font-bold text-gray-700">{updatedTotalPoints}</span> pts
            </span>
          </div>

          {/* ── Progress bar ── */}
          <div className="mb-2">
            {/* Track */}
            <div className="h-3 rounded-full bg-gray-100 overflow-hidden border border-gray-200">
              <div
                className="h-full rounded-full bg-[#1a24cc] transition-all duration-700"
                style={{ width: `${fillPct}%` }}
              />
            </div>
            {/* Labels */}
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-gray-400 font-medium">
                {prevThreshold} Points
              </span>
              <span className="text-xs text-gray-400 font-medium">
                {nextThreshold} Points
              </span>
            </div>
          </div>

          {/* ── Badge progression message ── */}
          <div className="mb-6 mt-3 bg-[#eef2ff] rounded-xl px-4 py-3">
            {isMaxed ? (
              <p className="text-sm text-[#1a24cc] font-semibold text-center">
                🏆 You have reached the highest badge: <strong>{currentBadge.name}</strong>!
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-1.5">
                  Reach the next rank to gain more points.
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Current badge pill */}
                  <span className="inline-flex items-center gap-1.5 bg-[#1a24cc] text-white
                                   text-xs font-bold px-3 py-1 rounded-full">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                         stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {currentBadge.name}
                  </span>

                  {/* Arrow */}
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24"
                       stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>

                  {/* Next badge pill */}
                  <span className="inline-flex items-center gap-1.5 border-2 border-[#1a24cc]
                                   text-[#1a24cc] text-xs font-bold px-3 py-1 rounded-full">
                    {nextBadge.name}
                  </span>

                  <span className="text-xs text-gray-400 ml-auto">
                    {nextThreshold - updatedTotalPoints} pts to go
                  </span>
                </div>
              </>
            )}
          </div>

          {/* ── Close / continue button ── */}
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-[#1a24cc] text-white text-sm font-bold
                       hover:bg-[#1219a0] active:scale-[.98] transition-all"
          >
            Continue Learning
          </button>
        </div>
      </div>
    </div>
  );
}
