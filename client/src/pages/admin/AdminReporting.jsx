import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getReporting, getReportingCourses } from '../../services/adminService';

// ── Icons ────────────────────────────────────────────────────────────────────
const ViewColumnsIcon = () => (
  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const ExportIcon = () => (
  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// ── Default Columns Config ───────────────────────────────────────────────────
const ALL_COLUMNS = [
  { id: 'course_name',       label: 'Course Name',      defaultVisible: true },
  { id: 'participant_name',  label: 'Participant Name', defaultVisible: true },
  { id: 'participant_email', label: 'Participant Email',defaultVisible: false },
  { id: 'enrolled_at',       label: 'Enrolled Date',    defaultVisible: true },
  { id: 'started_at',        label: 'Start Date',       defaultVisible: false },
  { id: 'time_spent_mins',   label: 'Time Spent',       defaultVisible: true },
  { id: 'completion_pct',    label: 'Completion %',     defaultVisible: true },
  { id: 'completed_at',      label: 'Completed Date',   defaultVisible: false },
  { id: 'status',            label: 'Status',           defaultVisible: true },
];

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

function formatMins(mins) {
  if (!mins) return '0m';
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

// ── Main Page Component ──────────────────────────────────────────────────────
export default function AdminReporting() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  
  const [isColumnCustomizerOpen, setIsColumnCustomizerOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('ln_admin_columns');
    if (saved) return JSON.parse(saved);
    return ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.id);
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // reset to page 1 on search change
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Persist column preferences
  useEffect(() => {
    localStorage.setItem('ln_admin_columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Queries
  const { data: filterCoursesData } = useQuery({
    queryKey: ['admin-reporting-courses'],
    queryFn: getReportingCourses,
  });

  const { data: reportData, isLoading, isFetching } = useQuery({
    queryKey: ['admin-reporting', debouncedSearch, courseFilter, statusFilter, page],
    queryFn: () => getReporting({
      search: debouncedSearch,
      course_id: courseFilter || undefined,
      status: statusFilter || undefined,
      page,
      limit: 20
    }),
    keepPreviousData: true,
  });

  const filterCourses = filterCoursesData?.courses || [];
  const overview = reportData?.overview || { total_participants: 0, yet_to_start: 0, in_progress: 0, completed: 0 };
  const rows = reportData?.rows || [];
  const pagination = reportData?.pagination || { page: 1, total_pages: 1, total_rows: 0 };

  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setCourseFilter('');
    setStatusFilter('');
    setPage(1);
  };

  const toggleColumn = (colId) => {
    setVisibleColumns(prev => 
      prev.includes(colId) 
        ? prev.filter(id => id !== colId)
        : [...prev, colId]
    );
  };

  // ── Render Helpers ─────────────────────────────────────────────────────────
  const renderStatusBadge = (status) => {
    if (status === 'completed') {
      return <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase">Completed</span>;
    }
    if (status === 'in_progress') {
      return <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase">In Progress</span>;
    }
    return <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase">Not Started</span>;
  };

  const renderCell = (colId, row) => {
    switch (colId) {
      case 'course_name': return <span className="font-semibold text-gray-900">{row.course_name}</span>;
      case 'participant_name': return (
        <div>
           <div className="font-medium text-gray-900">{row.participant_name}</div>
           {visibleColumns.includes('participant_email') ? null : <div className="text-xs text-gray-500">{row.participant_email}</div>}
        </div>
      );
      case 'participant_email': return <span className="text-gray-500 text-xs">{row.participant_email}</span>;
      case 'enrolled_at': return formatDate(row.enrolled_at);
      case 'started_at': return formatDate(row.started_at);
      case 'completed_at': return formatDate(row.completed_at);
      case 'time_spent_mins': return formatMins(row.time_spent_mins);
      case 'status': return renderStatusBadge(row.status);
      case 'completion_pct': return (
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-brand rounded-full" style={{ width: `${row.completion_pct}%` }} />
          </div>
          <span className="text-xs font-medium text-gray-700">{row.completion_pct}%</span>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="animate-fade-in pb-12 overflow-x-hidden relative">
      
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>
            Reporting
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Track learner progress and course metrics
          </p>
        </div>
        
        <button className="inline-flex items-center px-4 py-2 bg-white text-gray-700 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2">
          <ExportIcon />
          Export CSV
        </button>
      </div>

      {/* ── Overview Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { key: '', label: 'Total Participants', count: overview.total_participants, color: 'brand' },
          { key: 'not_started', label: 'Yet to Start', count: overview.yet_to_start, color: 'gray' },
          { key: 'in_progress', label: 'In Progress', count: overview.in_progress, color: 'amber' },
          { key: 'completed', label: 'Completed', count: overview.completed, color: 'green' },
        ].map(card => {
          const isActive = statusFilter === card.key;
          const bgHover = {
            'brand': 'hover:bg-brand/5 focus:ring-brand',
            'gray': 'hover:bg-gray-100 focus:ring-gray-400',
            'amber': 'hover:bg-amber-50 focus:ring-amber-500',
            'green': 'hover:bg-green-50 focus:ring-green-500'
          }[card.color];
          
          return (
            <button
              key={card.label}
              onClick={() => { setStatusFilter(card.key); setPage(1); }}
              className={`flex flex-col items-start p-5 rounded-xl border-2 transition-all 
                focus:outline-none focus:ring-2 focus:ring-offset-2 text-left bg-white shadow-sm hover:shadow-md
                ${isActive ? 'border-brand' : 'border-gray-200'} ${bgHover}`}
            >
              <span className={`text-3xl font-black mb-1 ${isActive ? 'text-brand' : 'text-gray-900'}`} style={{ fontFamily: "'Fraunces', serif" }}>
                {card.count.toLocaleString()}
              </span>
              <span className="text-sm font-medium text-gray-500">
                {card.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Toolbar (Filters & Columns) ─────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Badge indicator if filtered */}
          {statusFilter && (
             <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-light rounded-lg border border-brand/20 text-sm font-semibold text-brand">
               <span>Status: {statusFilter.replace('_', ' ').toUpperCase()}</span>
               <button onClick={() => { setStatusFilter(''); setPage(1); }} className="hover:text-brand-dark">&times;</button>
             </div>
          )}

          {/* Course Dropdown */}
          <div className="relative">
             <select 
               value={courseFilter}
               onChange={(e) => { setCourseFilter(e.target.value); setPage(1); }}
               className="appearance-none w-[200px] pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand shadow-sm"
             >
               <option value="">All Courses</option>
               {filterCourses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
             </select>
             <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
             </div>
          </div>

          {/* Search */}
          <div className="relative relative w-full sm:w-[280px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon />
            </div>
            <input
              type="text"
              className="pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand shadow-sm bg-white"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          
          {(search || debouncedSearch || courseFilter || statusFilter) && (
            <button onClick={handleResetFilters} className="text-sm font-medium text-brand hover:text-brand-dark px-2">
              Reset Filters
            </button>
          )}
        </div>

        <button 
           onClick={() => setIsColumnCustomizerOpen(true)}
           className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
        >
           <ViewColumnsIcon />
           Columns
        </button>

      </div>

      {/* ── Table Area ──────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden relative">
        {/* Loading overlay */}
        {(isLoading || isFetching) && (
           <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center backdrop-blur-[1px]">
             <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin shadow-sm" />
           </div>
        )}

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-bold text-gray-600 uppercase text-[10px] tracking-wider sticky left-0 bg-gray-50/95 backdrop-blur z-20 w-16 text-center">
                  #
                </th>
                {ALL_COLUMNS.filter(c => visibleColumns.includes(c.id)).map(col => (
                  <th key={col.id} className="px-6 py-4 font-bold text-gray-600 uppercase text-[10px] tracking-wider">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="px-6 py-20 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <SearchIcon />
                      <span className="mt-2 block">No results found matching your criteria.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row.enrollment_id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-gray-400 font-mono text-xs text-center sticky left-0 bg-white/95 group-hover:bg-gray-50/95">
                      {(page - 1) * 20 + idx + 1}
                    </td>
                    {ALL_COLUMNS.filter(c => visibleColumns.includes(c.id)).map(col => (
                      <td key={col.id} className="px-6 py-4 text-sm">
                        {renderCell(col.id, row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
          <div className="text-sm text-gray-500 font-medium">
            Showing <span className="font-bold text-gray-900">{rows.length}</span> of <span className="font-bold text-gray-900">{pagination.total_rows}</span> results
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
            >
              Previous
            </button>
            <div className="px-3 py-1.5 text-sm font-bold text-gray-700">
              {page} / {pagination.total_pages || 1}
            </div>
            <button 
              onClick={() => setPage(p => Math.min(pagination.total_pages, p + 1))}
              disabled={page >= pagination.total_pages}
              className="px-4 py-1.5 text-sm font-medium bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ── Column Customizer Drawer ────────────────────────────── */}
      {isColumnCustomizerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={() => setIsColumnCustomizerOpen(false)} />
          <div className="relative w-80 bg-white h-full shadow-2xl flex flex-col animate-[fade-in_0.2s_ease-out]">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-bold text-lg text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>Customize Columns</h3>
              <button onClick={() => setIsColumnCustomizerOpen(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                 <CloseIcon />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto space-y-3">
              <p className="text-sm text-gray-500 mb-4">Select which columns to display in the reporting table.</p>
              
              {ALL_COLUMNS.map(col => (
                <label key={col.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-brand/30 hover:bg-brand/5 cursor-pointer transition-colors group select-none">
                  <input
                    type="checkbox"
                    checked={visibleColumns.includes(col.id)}
                    onChange={() => toggleColumn(col.id)}
                    className="w-4 h-4 text-brand bg-gray-100 border-gray-300 rounded focus:ring-brand focus:ring-2 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-brand">{col.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
