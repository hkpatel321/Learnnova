import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createQuiz, updateQuiz, deleteQuiz, addQuestion, updateQuestion, deleteQuestion } from '../../services/adminService';

// ── Icons ────────────────────────────────────────────────────────────────────
const TrashIcon = () => (
  <svg className="w-4 h-4 text-gray-400 hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4 text-gray-400 hover:text-brand transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
  </svg>
);

export default function AdminCourseQuiz({ courseId, quizzes = [] }) {
  const queryClient = useQueryClient();
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);
  const [newQuizTitle, setNewQuizTitle] = useState('');

  // Find the selected quiz object
  const selectedQuiz = quizzes.find(q => q.id === selectedQuizId);

  // ── Quiz Mutations ─────────────────────────────────────────────────────────
  const createQuizMut = useMutation({
    mutationFn: (title) => createQuiz({ course_id: courseId, title }),
    onSuccess: (data) => {
      queryClient.setQueryData(['admin-course', courseId], old => ({
        ...old,
        course: { ...old.course, quizzes: [...(old.course.quizzes || []), data.quiz] }
      }));
      setNewQuizTitle('');
      setIsCreatingQuiz(false);
      setSelectedQuizId(data.quiz.id);
    },
    onError: (err) => alert(err.response?.data?.error || err.message)
  });

  const deleteQuizMut = useMutation({
    mutationFn: (quizId) => deleteQuiz(quizId),
    onSuccess: (_, quizId) => {
      queryClient.setQueryData(['admin-course', courseId], old => ({
        ...old,
        course: { ...old.course, quizzes: old.course.quizzes.filter(q => q.id !== quizId) }
      }));
      if (selectedQuizId === quizId) setSelectedQuizId(null);
    },
    onError: (err) => alert(err.response?.data?.error || err.message)
  });

  // ── Question Form State ────────────────────────────────────────────────────
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newOptions, setNewOptions] = useState([
    { option_text: '', is_correct: true },
    { option_text: '', is_correct: false },
  ]);

  const handleAddOption = () => {
    setNewOptions([...newOptions, { option_text: '', is_correct: false }]);
  };

  const handleOptionChange = (index, field, value) => {
    const updated = [...newOptions];
    if (field === 'is_correct') {
      // If marking as correct, optionally unmark others (single choice usually)
      updated.forEach((o, i) => o.is_correct = (i === index ? value : false)); // Enforce Single Correct for simplicity
    } else {
      updated[index][field] = value;
    }
    setNewOptions(updated);
  };

  const handleRemoveOption = (index) => {
    if (newOptions.length <= 2) return alert('At least 2 options are required.');
    setNewOptions(newOptions.filter((_, i) => i !== index));
  };

  // ── Question Mutations ─────────────────────────────────────────────────────
  const addQuestionMut = useMutation({
    mutationFn: () => addQuestion(selectedQuizId, { 
      question_text: newQuestionText, 
      options: newOptions.filter(o => o.option_text.trim() !== '') 
    }),
    onSuccess: (data) => {
      queryClient.setQueryData(['admin-course', courseId], old => {
        const up = { ...old };
        const qz = up.course.quizzes.find(q => q.id === selectedQuizId);
        qz.questions = [...(qz.questions || []), data.question];
        return up;
      });
      setIsAddingQuestion(false);
      setNewQuestionText('');
      setNewOptions([{ option_text: '', is_correct: true }, { option_text: '', is_correct: false }]);
    },
    onError: (err) => alert(err.response?.data?.error || err.message)
  });

  const deleteQuestionMut = useMutation({
    mutationFn: (qId) => deleteQuestion(qId),
    onSuccess: (_, qId) => {
      queryClient.setQueryData(['admin-course', courseId], old => {
        const up = { ...old };
        const qz = up.course.quizzes.find(q => q.id === selectedQuizId);
        qz.questions = qz.questions.filter(q => q.id !== qId);
        return up;
      });
    },
    onError: (err) => alert(err.response?.data?.error || err.message)
  });

  return (
    <div className="flex gap-4 min-h-[500px]">
      
      {/* ── Left Sidebar (Quiz List) ── */}
      <div className="w-1/3 border-r border-gray-200 pr-4 flex flex-col gap-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-gray-900 text-sm">Course Quizzes</h3>
          <button 
            onClick={() => setIsCreatingQuiz(true)}
            className="p-1 hover:bg-gray-100 rounded text-brand transition-colors"
            title="Create Quiz"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>

        {isCreatingQuiz && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg animate-fade-in mb-2">
            <input 
              type="text" 
              placeholder="Quiz Title"
              value={newQuizTitle}
              onChange={e => setNewQuizTitle(e.target.value)}
              className="w-full text-sm p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand mb-2"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setIsCreatingQuiz(false); setNewQuizTitle(''); }} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
              <button 
                onClick={() => createQuizMut.mutate(newQuizTitle)} 
                disabled={!newQuizTitle.trim() || createQuizMut.isPending}
                className="text-xs font-bold text-brand hover:text-brand-dark disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        )}

        {quizzes.length === 0 && !isCreatingQuiz && (
          <p className="text-xs text-gray-500 italic">No quizzes created yet.</p>
        )}

        <div className="space-y-2 overflow-y-auto">
          {quizzes.map(q => (
            <div 
              key={q.id}
              onClick={() => setSelectedQuizId(q.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between group
                ${selectedQuizId === q.id 
                  ? 'border-brand bg-brand-light/20 shadow-sm' 
                  : 'border-gray-200 bg-white hover:border-brand/40 hover:bg-gray-50'}`}
            >
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-0.5 max-w-[150px] truncate" title={q.title}>{q.title}</p>
                <p className="text-xs text-gray-500">{q.questions?.length || 0} Questions</p>
              </div>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if(window.confirm('Delete this quiz? All questions will be lost.')) deleteQuizMut.mutate(q.id);
                }}
                className="p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Content (Quiz Editor) ── */}
      <div className="w-2/3 pl-2 flex flex-col">
        {!selectedQuiz ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <svg className="w-12 h-12 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-center max-w-[200px]">Select a quiz from the left, or create a new one to start adding questions.</p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">{selectedQuiz.title}</h2>
                <p className="text-sm text-gray-500">{selectedQuiz.questions?.length || 0} Questions configured</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              
              {/* Question List */}
              {(selectedQuiz.questions || []).map((q, idx) => (
                <div key={q.id} className="p-4 border border-gray-200 bg-white rounded-lg shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="text-sm font-bold text-gray-900 w-5/6">
                      <span className="text-gray-400 mr-2">{idx + 1}.</span>
                      {q.question_text}
                    </h4>
                    <button 
                      onClick={() => { if(window.confirm('Delete this question?')) deleteQuestionMut.mutate(q.id); }}
                      className="p-1"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                  
                  <div className="space-y-1.5 ml-6">
                    {(q.options || []).map(opt => (
                      <div key={opt.id} className={`flex items-center text-sm px-3 py-1.5 rounded-md border ${opt.is_correct ? 'bg-green-50 border-green-200 text-green-800 font-medium' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                        <div className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center shrink-0 ${opt.is_correct ? 'bg-green-500' : 'border-2 border-gray-300'}`}>
                          {opt.is_correct && <CheckIcon />}
                        </div>
                        <span className="truncate">{opt.option_text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Add Question Box */}
              {isAddingQuestion ? (
                <div className="p-4 bg-brand-light/10 border-2 border-brand/30 rounded-lg animate-fade-in shadow-inner">
                  <h3 className="text-sm font-bold text-brand mb-3">New Question</h3>
                  
                  <textarea 
                    placeholder="Enter the question text..."
                    value={newQuestionText}
                    onChange={e => setNewQuestionText(e.target.value)}
                    className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-brand mb-4 resize-y h-20"
                  />
                  
                  <div className="space-y-2 mb-4">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Options (Check the correct answer)</p>
                    {newOptions.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <button
                          onClick={() => handleOptionChange(oIdx, 'is_correct', true)}
                          className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${opt.is_correct ? 'bg-green-500 text-white' : 'border-2 border-gray-300 hover:border-green-400'}`}
                        >
                          {opt.is_correct && <CheckIcon />}
                        </button>
                        <input 
                          type="text" 
                          value={opt.option_text}
                          onChange={e => handleOptionChange(oIdx, 'option_text', e.target.value)}
                          placeholder={`Option ${oIdx + 1}`}
                          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-brand"
                        />
                        <button onClick={() => handleRemoveOption(oIdx)} className="p-1 text-gray-400 hover:text-red-500">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={handleAddOption}
                    className="text-xs text-brand font-semibold hover:text-brand-dark mb-4"
                  >
                    + Add Option
                  </button>

                  <div className="flex justify-end gap-2 border-t border-brand/10 pt-3">
                    <button onClick={() => setIsAddingQuestion(false)} className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                      Cancel
                    </button>
                    <button 
                      onClick={() => addQuestionMut.mutate()}
                      disabled={!newQuestionText.trim() || newOptions.some(o => !o.option_text.trim()) || addQuestionMut.isPending}
                      className="px-5 py-1.5 text-sm font-bold text-white bg-brand hover:bg-brand-dark rounded-lg shadow-sm disabled:opacity-50"
                    >
                      Save Question
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAddingQuestion(true)}
                  className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-brand hover:text-brand transition-colors font-medium text-sm flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Question
                </button>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
