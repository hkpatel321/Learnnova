import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarRange, Flame, Loader2, Mail, Shield, Sparkles, Star, UserCircle2 } from 'lucide-react';
import axios from '../../lib/axios';
import useAuthStore from '../../store/authStore';

const getInitials = (name) =>
  (name || 'U')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const getIntensityClass = (count, maxCount) => {
  if (!count) return 'bg-[#374151]';

  const scaleBase = Math.max(maxCount, 4);
  const ratio = count / scaleBase;
  if (ratio >= 0.75) return 'bg-[#4fe46d]';
  if (ratio >= 0.5) return 'bg-[#2fc95a]';
  if (ratio >= 0.25) return 'bg-[#1f9d45]';
  return 'bg-[#166534]';
};

const formatActivityDate = (value) => {
  if (!value) return 'No activity';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const buildHeatmapColumns = (days = []) => {
  if (!days.length) return [];

  const columns = [];
  let currentColumn = new Array(7).fill(null);

  days.forEach((day, index) => {
    const date = new Date(day.date);
    const weekday = date.getDay();

    if (index === 0) {
      currentColumn = new Array(7).fill(null);
    } else if (weekday === 0) {
      columns.push(currentColumn);
      currentColumn = new Array(7).fill(null);
    }

    currentColumn[weekday] = day;
  });

  if (currentColumn.some(Boolean)) {
    columns.push(currentColumn);
  }

  return columns;
};

const buildMonthMarkers = (columns = []) => {
  let previousMonth = null;

  return columns.map((column, index) => {
    const firstDay = column.find(Boolean);
    if (!firstDay?.date) return '';

    const date = new Date(firstDay.date);
    const month = date.getMonth();

    if (index === 0 || month !== previousMonth) {
      previousMonth = month;
      return MONTH_LABELS[month];
    }

    return '';
  });
};

export default function ProfilePage() {
  const { user: storedUser } = useAuthStore();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const res = await axios.get('/auth/me');
      return res.data?.data?.user || res.data?.user || res.data;
    },
    initialData: storedUser || undefined,
  });

  const { data: heatmapData } = useQuery({
    queryKey: ['activity-heatmap'],
    queryFn: async () => {
      const res = await axios.get('/users/me/activity-heatmap');
      return res.data?.data || res.data;
    },
  });

  const totalPoints = Number(user?.totalPoints || user?.points || 0);
  const heatmapDays = useMemo(
    () => (Array.isArray(heatmapData?.days) ? heatmapData.days : []),
    [heatmapData]
  );
  const heatmapColumns = useMemo(() => buildHeatmapColumns(heatmapDays), [heatmapDays]);
  const monthMarkers = useMemo(() => buildMonthMarkers(heatmapColumns), [heatmapColumns]);
  const maxDailyCount = heatmapDays.reduce((max, day) => Math.max(max, day.count || 0), 0);
  const activeSummary = heatmapData?.summary || {};
  const lastActiveDay = [...heatmapDays].reverse().find((day) => day.count > 0) || null;

  if (isLoading && !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#2D31D4] animate-spin" />
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="max-w-3xl mx-auto rounded-2xl border border-red-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-gray-900">Profile unavailable</h1>
        <p className="mt-2 text-sm text-gray-600">
          {error?.response?.data?.message || 'We could not load your profile right now.'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[#2D31D4] via-[#3940df] to-[#171bb8] text-white shadow-lg">
        <div className="px-6 py-8 md:px-8 md:py-10 flex flex-col md:flex-row md:items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-white/15 border border-white/20 flex items-center justify-center text-2xl font-bold">
            {getInitials(user?.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm uppercase tracking-[0.2em] text-white/70">My Profile</p>
            <h1 className="mt-2 text-3xl font-bold truncate">{user?.name || 'Learner'}</h1>
            <p className="mt-2 text-white/80">{user?.email || 'No email available'}</p>
          </div>
          <div className="rounded-2xl bg-white/10 border border-white/15 px-5 py-4 min-w-[180px]">
            <p className="text-sm text-white/70">Reward Points</p>
            <p className="mt-1 text-3xl font-bold">{totalPoints}</p>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center gap-3 text-gray-900">
            <UserCircle2 className="w-5 h-5 text-[#2D31D4]" />
            <p className="font-semibold">Full Name</p>
          </div>
          <p className="mt-3 text-sm text-gray-600">{user?.name || 'Not available'}</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center gap-3 text-gray-900">
            <Mail className="w-5 h-5 text-[#2D31D4]" />
            <p className="font-semibold">Email</p>
          </div>
          <p className="mt-3 text-sm text-gray-600 break-all">{user?.email || 'Not available'}</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center gap-3 text-gray-900">
            <Shield className="w-5 h-5 text-[#2D31D4]" />
            <p className="font-semibold">Role</p>
          </div>
          <p className="mt-3 text-sm capitalize text-gray-600">{user?.role || 'learner'}</p>
        </div>
      </section>

      <section className="mt-6 rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-emerald-500" />
              <h2 className="text-lg font-semibold text-gray-900">Learning Activity</h2>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Your last 365 days of learning streaks across video, quiz, document, and image activity.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-[#F8FAFC] px-4 py-3">
              <p className="text-gray-500">Active days</p>
              <p className="mt-1 font-semibold text-gray-900">{activeSummary.activeDays || 0}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-[#F8FAFC] px-4 py-3">
              <p className="text-gray-500">Current streak</p>
              <p className="mt-1 font-semibold text-gray-900">{activeSummary.currentStreak || 0}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-[#F8FAFC] px-4 py-3">
              <p className="text-gray-500">Longest streak</p>
              <p className="mt-1 font-semibold text-gray-900">{activeSummary.longestStreak || 0}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-[#F8FAFC] px-4 py-3">
              <p className="text-gray-500">Last active</p>
              <p className="mt-1 font-semibold text-gray-900">
                {lastActiveDay ? formatActivityDate(lastActiveDay.date) : 'No activity'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[24px] bg-[#0d1117] p-5 text-white ring-1 ring-white/5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex items-center gap-2 text-sm text-white/80">
              <CalendarRange className="w-4 h-4 text-[#7dff8a]" />
              <span>Consistency builds streaks. Every meaningful learning action adds a square.</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-white/75">
              <Sparkles className="w-3.5 h-3.5 text-[#7dff8a]" />
              <span>{activeSummary.totalEvents || 0} total actions this year</span>
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="min-w-[980px]">
              <div className="mb-3 flex items-end gap-3">
                <div className="w-12 shrink-0" />
                <div className="flex gap-1.5">
                  {monthMarkers.map((label, index) => (
                    <div
                      key={`month-${index}`}
                      className="h-5 w-[14px] shrink-0 text-[12px] font-medium leading-5 text-white/80"
                    >
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <div className="grid shrink-0 grid-rows-7 gap-1.5 text-[13px] font-medium text-white/85">
                  {DAY_LABELS.map((label) => (
                    <div key={label} className="flex h-[14px] items-center">
                      {label}
                    </div>
                  ))}
                </div>

                <div className="flex gap-1.5">
                  {heatmapColumns.map((column, columnIndex) => (
                    <div key={`week-${columnIndex}`} className="grid grid-rows-7 gap-1.5">
                      {Array.from({ length: 7 }).map((_, rowIndex) => {
                        const cell = column[rowIndex];
                        const count = cell?.count || 0;
                        const dateLabel = cell?.date || 'No date';
                        return (
                          <div
                            key={`${columnIndex}-${rowIndex}`}
                            title={`${formatActivityDate(dateLabel)}: ${count} activit${count === 1 ? 'y' : 'ies'}`}
                            style={{
                              width: '14px',
                              height: '14px',
                              minWidth: '14px',
                              minHeight: '14px',
                            }}
                            className={`rounded-[3px] border border-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)] transition-all duration-150 hover:scale-110 hover:border-white/30 ${getIntensityClass(count, maxDailyCount)}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center gap-2">
            <Flame className="w-4 h-4 text-emerald-600" />
            <span>{activeSummary.totalEvents || 0} tracked learning actions</span>
          </div>
          <div className="inline-flex items-center gap-2">
            <span>Less</span>
            <span className="h-3.5 w-3.5 rounded-[3px] bg-[#374151]" />
            <span className="h-3.5 w-3.5 rounded-[3px] bg-[#166534]" />
            <span className="h-3.5 w-3.5 rounded-[3px] bg-[#1f9d45]" />
            <span className="h-3.5 w-3.5 rounded-[3px] bg-[#2fc95a]" />
            <span className="h-3.5 w-3.5 rounded-[3px] bg-[#4fe46d]" />
            <span>More</span>
          </div>
        </div>
      </section>
    </div>
  );
}
