import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Settings2, X } from 'lucide-react';
import axios from '../../lib/axios';

const defaultColumns = {
  courseName: true,
  participantName: true,
  enrolledDate: true,
  startDate: true,
  timeSpent: true,
  completionPercent: true,
  completedDate: true,
  status: true,
};

const statusToChip = {
  not_started: 'Yet to Start',
  in_progress: 'In Progress',
  completed: '✓ Completed',
};

const statusToColor = {
  not_started: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatTimeSpent = (minutesValue) => {
  if (!minutesValue && minutesValue !== 0) return '-';
  const total = Number(minutesValue);
  if (Number.isNaN(total) || total < 0) return '-';
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
};

const normalizeRows = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.participants)) return payload.participants;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const normalizeCourses = (payload, rows) => {
  if (Array.isArray(payload?.courses)) return payload.courses;
  const map = new Map();
  rows.forEach((row) => {
    const id = row.courseId || row.course_id || row.course?.id;
    const name = row.courseName || row.course_name || row.course?.title || row.course?.name;
    if (id || name) {
      map.set(String(id || name), {
        id: id || name,
        title: name || `Course ${id}`,
      });
    }
  });
  return Array.from(map.values());
};

const normalizeSummary = (payload, rows) => {
  const summary = payload?.summary || payload?.overview;
  if (summary) {
    return {
      totalParticipants: summary.totalParticipants ?? summary.total ?? rows.length,
      notStarted: summary.notStarted ?? summary.yetToStart ?? 0,
      inProgress: summary.inProgress ?? 0,
      completed: summary.completed ?? 0,
    };
  }

  return {
    totalParticipants: rows.length,
    notStarted: rows.filter((r) => (r.status || '').toLowerCase() === 'not_started').length,
    inProgress: rows.filter((r) => (r.status || '').toLowerCase() === 'in_progress').length,
    completed: rows.filter((r) => (r.status || '').toLowerCase() === 'completed').length,
  };
};

export default function ReportingPage() {
  const [selectedCourseId, setSelectedCourseId] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(defaultColumns);

  const { data, isLoading } = useQuery({
    queryKey: ['reporting', selectedCourseId, statusFilter],
    queryFn: async () => {
      const params = {};
      if (selectedCourseId !== 'all') params.courseId = selectedCourseId;
      if (statusFilter !== 'all') params.status = statusFilter;
      const response = await axios.get('/reporting', { params });
      return response.data?.data || response.data;
    },
  });

  const rows = useMemo(() => normalizeRows(data), [data]);
  const courses = useMemo(() => normalizeCourses(data, rows), [data, rows]);
  const summary = useMemo(() => normalizeSummary(data, rows), [data, rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => {
      const participant =
        row.participantName ||
        row.participant_name ||
        row.participant?.name ||
        '';
      return participant.toLowerCase().includes(query);
    });
  }, [rows, search]);

  const cards = [
    {
      id: 'all',
      label: 'Total Participants',
      value: summary.totalParticipants ?? 0,
      border: '#2D31D4',
      text: 'text-[#2D31D4]',
      ring: 'ring-[#2D31D4]',
    },
    {
      id: 'not_started',
      label: 'Yet to Start',
      value: summary.notStarted ?? 0,
      border: '#9CA3AF',
      text: 'text-gray-500',
      ring: 'ring-gray-400',
    },
    {
      id: 'in_progress',
      label: 'In Progress',
      value: summary.inProgress ?? 0,
      border: '#F59E0B',
      text: 'text-amber-500',
      ring: 'ring-amber-400',
    },
    {
      id: 'completed',
      label: 'Completed',
      value: summary.completed ?? 0,
      border: '#10B981',
      text: 'text-emerald-500',
      ring: 'ring-emerald-400',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <h1 className="text-[28px] font-plus-jakarta-sans font-bold text-gray-900">Learner Progress</h1>
        <select
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          className="w-full md:w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-[#2D31D4]"
        >
          <option value="all">All Courses</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title || course.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => {
          const active = statusFilter === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => setStatusFilter(card.id)}
              className={`text-left bg-white border rounded-xl p-5 transition-all ${
                active ? `ring-2 ring-offset-2 ${card.ring}` : 'hover:border-gray-300'
              }`}
              style={{ borderLeft: `4px solid ${card.border}` }}
            >
              <p className={`text-3xl font-bold ${card.text}`}>{card.value}</p>
              <p className="text-sm text-gray-500 mt-1">{card.label}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search participant..."
            className="w-full md:w-72 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2D31D4]"
          />
          <button
            type="button"
            onClick={() => setColumnsOpen(true)}
            className="self-start md:self-auto inline-flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Columns
            <Settings2 className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-auto max-h-[65vh]">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[#F4F5FF] text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  {visibleColumns.courseName && <th className="px-4 py-3 text-left">Course Name</th>}
                  {visibleColumns.participantName && <th className="px-4 py-3 text-left">Participant</th>}
                  {visibleColumns.enrolledDate && <th className="px-4 py-3 text-left">Enrolled Date</th>}
                  {visibleColumns.startDate && <th className="px-4 py-3 text-left">Start Date</th>}
                  {visibleColumns.timeSpent && <th className="px-4 py-3 text-left">Time Spent</th>}
                  {visibleColumns.completionPercent && <th className="px-4 py-3 text-left">Completion %</th>}
                  {visibleColumns.completedDate && <th className="px-4 py-3 text-left">Completed Date</th>}
                  {visibleColumns.status && <th className="px-4 py-3 text-left">Status</th>}
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="border-t border-gray-100 animate-pulse">
                      <td className="px-4 py-3"><div className="h-3 w-6 bg-gray-200 rounded" /></td>
                      <td className="px-4 py-3"><div className="h-3 w-28 bg-gray-200 rounded" /></td>
                      <td className="px-4 py-3"><div className="h-3 w-24 bg-gray-200 rounded" /></td>
                      <td className="px-4 py-3"><div className="h-3 w-20 bg-gray-200 rounded" /></td>
                      <td className="px-4 py-3"><div className="h-3 w-20 bg-gray-200 rounded" /></td>
                      <td className="px-4 py-3"><div className="h-3 w-16 bg-gray-200 rounded" /></td>
                      <td className="px-4 py-3"><div className="h-3 w-24 bg-gray-200 rounded" /></td>
                      <td className="px-4 py-3"><div className="h-3 w-20 bg-gray-200 rounded" /></td>
                      <td className="px-4 py-3"><div className="h-5 w-20 bg-gray-200 rounded-full" /></td>
                    </tr>
                  ))
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-500">
                      No data found. Adjust your filters or share your course.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, index) => {
                    const completion =
                      row.completionPercent ??
                      row.completion_percent ??
                      row.progress ??
                      0;
                    const status = (row.status || 'not_started').toLowerCase();

                    return (
                      <tr key={row.id || `${row.participantId}-${index}`} className="border-t border-gray-100 hover:bg-[#F4F5FF]">
                        <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                        {visibleColumns.courseName && (
                          <td className="px-4 py-3 text-gray-800">
                            {row.courseName || row.course_name || row.course?.title || '-'}
                          </td>
                        )}
                        {visibleColumns.participantName && (
                          <td className="px-4 py-3 text-gray-900 font-medium">
                            {row.participantName || row.participant_name || row.participant?.name || '-'}
                          </td>
                        )}
                        {visibleColumns.enrolledDate && (
                          <td className="px-4 py-3 text-gray-600">
                            {formatDate(row.enrolledDate || row.enrolled_date)}
                          </td>
                        )}
                        {visibleColumns.startDate && (
                          <td className="px-4 py-3 text-gray-600">
                            {formatDate(row.startDate || row.start_date)}
                          </td>
                        )}
                        {visibleColumns.timeSpent && (
                          <td className="px-4 py-3 text-gray-600">
                            {formatTimeSpent(row.timeSpentMinutes ?? row.time_spent_minutes ?? row.timeSpent)}
                          </td>
                        )}
                        {visibleColumns.completionPercent && (
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-blue-100 rounded-full overflow-hidden">
                                <div className="h-full bg-[#2D31D4]" style={{ width: `${Math.max(0, Math.min(100, Number(completion) || 0))}%` }} />
                              </div>
                              <span className="text-xs text-gray-600">{Number(completion) || 0}%</span>
                            </div>
                          </td>
                        )}
                        {visibleColumns.completedDate && (
                          <td className="px-4 py-3 text-gray-600">
                            {formatDate(row.completedDate || row.completed_date)}
                          </td>
                        )}
                        {visibleColumns.status && (
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusToColor[status] || statusToColor.not_started}`}>
                              {statusToChip[status] || 'Yet to Start'}
                            </span>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div
        className={`fixed inset-y-0 right-0 w-64 bg-white shadow-2xl z-50 border-l border-gray-200 transition-transform duration-300 ${
          columnsOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Show / Hide Columns</h3>
          <button
            type="button"
            onClick={() => setColumnsOpen(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {[
            ['courseName', 'Course Name'],
            ['participantName', 'Participant Name'],
            ['enrolledDate', 'Enrolled Date'],
            ['startDate', 'Start Date'],
            ['timeSpent', 'Time Spent'],
            ['completionPercent', 'Completion %'],
            ['completedDate', 'Completed Date'],
            ['status', 'Status'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={visibleColumns[key]}
                onChange={(e) => setVisibleColumns((prev) => ({ ...prev, [key]: e.target.checked }))}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {columnsOpen ? (
        <button
          aria-label="Close column drawer overlay"
          type="button"
          onClick={() => setColumnsOpen(false)}
          className="fixed inset-0 bg-black/20 z-40"
        />
      ) : null}

      {isLoading ? (
        <div className="fixed bottom-4 right-4 text-gray-500 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs shadow-sm inline-flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Loading reporting...
        </div>
      ) : null}
    </div>
  );
}
