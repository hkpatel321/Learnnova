export const badgeLevels = [
  { name: 'Starter', min: 0, max: 19, icon: '🌱', emoji: '🌱', color: 'text-slate-600' },
  { name: 'Newbie', min: 20, max: 39, icon: '🥈', emoji: '🥈', color: 'text-gray-600' },
  { name: 'Explorer', min: 40, max: 59, icon: '🥉', emoji: '🥉', color: 'text-blue-600' },
  { name: 'Achiever', min: 60, max: 79, icon: '🏅', emoji: '🏅', color: 'text-green-600' },
  { name: 'Specialist', min: 80, max: 99, icon: '🎖️', emoji: '🎖️', color: 'text-purple-600' },
  { name: 'Expert', min: 100, max: 119, icon: '🏆', emoji: '🏆', color: 'text-amber-500' },
  { name: 'Master', min: 120, max: Number.POSITIVE_INFINITY, icon: '👑', emoji: '👑', color: 'text-red-600' },
];

export const getBadgeMeta = (points) => {
  const safePoints = Number(points || 0);
  const current = badgeLevels.find((badge) => safePoints >= badge.min && safePoints <= badge.max) || badgeLevels[0];
  const next = badgeLevels.find((badge) => badge.min > current.min) || null;
  const rangeMax = Number.isFinite(current.max) ? current.max : safePoints;
  const denominator = Math.max(1, rangeMax - current.min + 1);
  const progress = Number.isFinite(current.max)
    ? ((safePoints - current.min) / denominator) * 100
    : 100;

  return {
    current,
    next,
    progress: Math.max(0, Math.min(100, progress)),
  };
};
