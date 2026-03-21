import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inviteAttendees, getAttendees, removeAttendee } from '../../services/adminService';
import { useSocket } from '../../lib/useSocket';

// ── Icons ──────────────────────────────────────────────────────────────────────
const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const PersonIcon = () => (
  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
const CheckIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

// ── Status badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    in_progress: { text: 'In Progress', cls: 'text-blue-700 bg-blue-50 border-blue-200' },
    not_started:  { text: 'Not Started',  cls: 'text-gray-600 bg-gray-50 border-gray-200' },
    completed:    { text: 'Completed',    cls: 'text-green-700 bg-green-50 border-green-200' },
  };
  const s = map[status] || { text: status, cls: 'text-gray-600 bg-gray-50 border-gray-200' };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${s.cls}`}>
      {s.text}
    </span>
  );
}

// ── Email Pill ─────────────────────────────────────────────────────────────────
function EmailPill({ email, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-brand/10 text-brand text-xs font-medium px-2.5 py-1 rounded-full">
      {email}
      <button type="button" onClick={() => onRemove(email)} className="hover:text-red-500 transition-colors">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────────
export default function AddAttendeesModal({ isOpen, onClose, courseId }) {
  const queryClient = useQueryClient();
  const [view, setView] = useState('enroll'); // 'enroll' | 'enrolled'
  const [rawEmails, setRawEmails] = useState('');
  const [parsedEmails, setParsedEmails] = useState([]);
  const [result, setResult] = useState(null);
  const [step, setStep]   = useState(1); // 1=input, 2=confirm, 3=done

  // Fetch enrolled attendees
  const { data: attendeesData, isLoading: attendeesLoading } = useQuery({
    queryKey: ['attendees', courseId],
    queryFn: () => getAttendees(courseId),
    enabled: isOpen && view === 'enrolled',
  });
  const attendees = attendeesData?.attendees ?? [];
  // Local state for real-time completion_pct updates
  const [liveAttendees, setLiveAttendees] = useState([]);
  useEffect(() => { setLiveAttendees(attendees); }, [attendeesData]);

  // ⚡ Real-time: Join course room, update completion_pct on progress events
  const socket = useSocket();
  useEffect(() => {
    if (!isOpen || !courseId || !socket) return;
    socket.emit('join_course', { courseId });
    const handleProgress = (data) => {
      if (data.course_id !== courseId) return;
      setLiveAttendees(prev => prev.map(a =>
        a.enrollment_id === data.enrollment_id
          ? { ...a, completion_pct: data.completion_pct, status: data.enrollment_status }
          : a
      ));
    };
    socket.on('progress_update', handleProgress);
    return () => {
      socket.off('progress_update', handleProgress);
      socket.emit('leave_course', { courseId });
    };
  }, [isOpen, courseId, socket]);

  const removeMut = useMutation({
    mutationFn: ({ enrollmentId }) => removeAttendee(courseId, enrollmentId),
    onSuccess: () => queryClient.invalidateQueries(['attendees', courseId]),
    onError: (err) => alert(`Failed to remove: ${err.message}`),
  });

  const inviteMut = useMutation({
    mutationFn: (emails) => inviteAttendees(courseId, emails),
    onSuccess: (data) => {
      setResult(data);
      setStep(3);
      queryClient.invalidateQueries(['attendees', courseId]);
      queryClient.invalidateQueries(['admin-course', courseId]);
    },
    onError: (err) => alert(`Failed to enroll: ${err.response?.data?.error || err.message}`),
  });

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setView('enroll');
      setStep(1);
      setRawEmails('');
      setParsedEmails([]);
      setResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Parse emails from textarea
  const parseEmails = () => {
    const list = rawEmails
      .split(/[\n,;]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    const unique = [...new Set(list)];
    setParsedEmails(unique);
    if (unique.length > 0) setStep(2);
    else alert('No valid email addresses found.');
  };

  const removeEmail = (email) => {
    setParsedEmails(p => p.filter(e => e !== email));
  };

  const handleClose = () => {
    setStep(1);
    setRawEmails('');
    setParsedEmails([]);
    setResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col my-8">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => { setView('enroll'); setStep(1); setResult(null); }}
              className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all ${
                view === 'enroll' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Enroll Students
            </button>
            <button
              onClick={() => setView('enrolled')}
              className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all ${
                view === 'enrolled' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Enrolled ({attendees.length})
            </button>
          </div>
          <button type="button" onClick={handleClose} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400">
            <CloseIcon />
          </button>
        </div>

        {/* ── Enroll View ──────────────────────────────────────────────────── */}
        {view === 'enroll' && (
          <div className="p-6 space-y-4">
            {step === 1 && (
              <>
                <div>
                  <h3 className="text-base font-bold text-gray-900 mb-1" style={{ fontFamily: "'Fraunces', serif" }}>
                    Add Students to Course
                  </h3>
                  <p className="text-sm text-gray-500">
                    Enter email addresses of students to enroll. Existing Learnova users will be
                    <span className="font-semibold text-brand"> directly enrolled</span> in the course.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Email Addresses
                  </label>
                  <textarea
                    value={rawEmails}
                    onChange={e => setRawEmails(e.target.value)}
                    placeholder={"student1@example.com\nstudent2@example.com, student3@example.com"}
                    className="w-full h-36 p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand resize-y"
                  />
                  <p className="text-xs text-gray-400 mt-1">Separate by comma, semicolon, or new line</p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={parseEmails}
                    disabled={!rawEmails.trim()}
                    className="px-5 py-2 bg-brand text-white text-sm font-bold rounded-lg hover:bg-brand-dark transition-all shadow-sm disabled:opacity-50"
                  >
                    Review →
                  </button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <h3 className="text-base font-bold text-gray-900 mb-1" style={{ fontFamily: "'Fraunces', serif" }}>
                    Confirm Enrollment
                  </h3>
                  <p className="text-sm text-gray-500">
                    Enrolling <span className="font-bold text-gray-800">{parsedEmails.length}</span> student{parsedEmails.length !== 1 ? 's' : ''}.
                    {' '}Existing accounts will be enrolled immediately.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {parsedEmails.map(email => (
                    <EmailPill key={email} email={email} onRemove={removeEmail} />
                  ))}
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 flex items-start gap-2">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Users not found in the system will receive an invitation link to join later. Already invited or enrolled students will be skipped.</span>
                </div>

                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={() => setStep(1)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => inviteMut.mutate(parsedEmails)}
                    disabled={inviteMut.isPending || parsedEmails.length === 0}
                    className="px-5 py-2 bg-brand text-white text-sm font-bold rounded-lg hover:bg-brand-dark shadow-sm disabled:opacity-50 flex items-center gap-2"
                  >
                    {inviteMut.isPending ? 'Enrolling...' : 'Enroll Students'}
                  </button>
                </div>
              </>
            )}

            {step === 3 && result && (
              <div className="text-center py-6 space-y-4 animate-fade-in">
                <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Fraunces', serif" }}>
                    Done!
                  </h3>
                  <p className="text-sm text-gray-600">
                    <span className="font-bold text-gray-900">{result.invited?.length || 0}</span> student{(result.invited?.length || 0) !== 1 ? 's' : ''} enrolled successfully.
                    {result.skipped?.length > 0 && (
                      <span className="block text-gray-400 mt-1">{result.skipped.length} skipped (already enrolled or invited).</span>
                    )}
                  </p>
                </div>
                <div className="flex justify-center gap-3">
                  <button onClick={() => { setView('enrolled'); setStep(1); }} className="px-4 py-2 text-sm font-medium text-brand border border-brand rounded-lg hover:bg-brand/5">
                    View Enrolled →
                  </button>
                  <button onClick={() => { setStep(1); setRawEmails(''); setParsedEmails([]); setResult(null); }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                    Enroll More
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Enrolled List View ────────────────────────────────────────────── */}
        {view === 'enrolled' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>
                Enrolled Students
              </h3>
              <span className="text-sm text-gray-400">{liveAttendees.length} total</span>
            </div>

            {attendeesLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : liveAttendees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <PersonIcon />
                <p className="text-sm mt-2">No students enrolled yet.</p>
                <button
                  onClick={() => setView('enroll')}
                  className="mt-3 text-brand text-sm font-semibold hover:underline"
                >
                  + Enroll Students
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {liveAttendees.map(a => (
                  <div key={a.enrollment_id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-brand/30 transition-colors group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {(a.user_name || a.user_email || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{a.user_name || '—'}</p>
                        <p className="text-xs text-gray-400 truncate">{a.user_email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <StatusBadge status={a.status} />
                      <span className="text-xs font-medium text-gray-500 hidden sm:block">
                        {a.completion_pct}%
                      </span>
                      <button
                        onClick={() => {
                          if (window.confirm(`Remove ${a.user_name || a.user_email} from this course?`)) {
                            removeMut.mutate({ enrollmentId: a.enrollment_id });
                          }
                        }}
                        disabled={removeMut.isPending}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove from course"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0">
          <button onClick={onClose} className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 shadow-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
