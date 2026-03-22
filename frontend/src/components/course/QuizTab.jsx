import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Plus, ArrowLeft, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '../../lib/axios';

const defaultRewards = {
  pointsFirstAttempt: '',
  pointsSecondAttempt: '',
  pointsThirdAttempt: '',
  pointsFourthPlusAttempt: '',
};

const ensureMinimumOptions = (options = []) => {
  const normalized = options.map((opt, idx) => ({
    id: opt.id || `temp-${idx}`,
    option_text: opt.option_text || opt.optionText || opt.text || '',
    is_correct: typeof opt.is_correct === 'boolean' ? opt.is_correct : !!opt.isCorrect,
  }));
  while (normalized.length < 2) {
    normalized.push({
      id: `temp-${normalized.length + 1}`,
      option_text: '',
      is_correct: false,
    });
  }
  return normalized;
};

const QuizTab = ({ courseId }) => {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [activeQuizId, setActiveQuizId] = useState(null);
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState([]);
  const [rewards, setRewards] = useState(defaultRewards);

  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ['course-quizzes', courseId],
    queryFn: async () => {
      const res = await axios.get(`/courses/${courseId}/quizzes`);
      const data = res.data?.data?.quizzes || res.data?.quizzes || res.data;
      return Array.isArray(data) ? data : [];
    },
  });

  const activeQuiz = useMemo(
    () => quizzes.find((quiz) => String(quiz.id) === String(activeQuizId)) || null,
    [quizzes, activeQuizId]
  );

  const activeQuestion = useMemo(() => {
    if (!activeQuiz || !activeQuestionId) return null;
    const questions = Array.isArray(activeQuiz.questions) ? activeQuiz.questions : [];
    return questions.find((q) => String(q.id) === String(activeQuestionId)) || null;
  }, [activeQuiz, activeQuestionId]);

  useEffect(() => {
    if (!activeQuiz) return;
    const timer = setTimeout(() => {
      setQuizTitle(activeQuiz.title || '');
      setRewards({
        pointsFirstAttempt: activeQuiz.pointsFirstAttempt ?? activeQuiz.pointsAttempt1 ?? '',
        pointsSecondAttempt: activeQuiz.pointsSecondAttempt ?? activeQuiz.pointsAttempt2 ?? '',
        pointsThirdAttempt: activeQuiz.pointsThirdAttempt ?? activeQuiz.pointsAttempt3 ?? '',
        pointsFourthPlusAttempt: activeQuiz.pointsFourthPlusAttempt ?? activeQuiz.pointsAttempt4plus ?? '',
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [activeQuiz]);

  useEffect(() => {
    if (!activeQuestion) return;
    const timer = setTimeout(() => {
      setQuestionText(activeQuestion.question_text || activeQuestion.questionText || activeQuestion.text || '');
      setOptions(ensureMinimumOptions(activeQuestion.options || []));
    }, 0);
    return () => clearTimeout(timer);
  }, [activeQuestion]);

  const createQuizMutation = useMutation({
    mutationFn: async (title) => {
      const res = await axios.post(`/courses/${courseId}/quizzes`, { title });
      return res.data?.data?.quiz || res.data?.quiz || res.data;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['course-quizzes', courseId] });
      setNewQuizTitle('');
      setIsCreating(false);
      setActiveQuizId(created?.id);
      setActiveQuestionId(null);
    },
    onError: () => toast.error('Failed to create quiz'),
  });

  const updateQuizMutation = useMutation({
    mutationFn: async ({ quizId, payload }) => axios.put(`/quizzes/${quizId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-quizzes', courseId] });
    },
    onError: () => toast.error('Failed to update quiz'),
  });

  const deleteQuizMutation = useMutation({
    mutationFn: async (quizId) => axios.delete(`/quizzes/${quizId}`),
    onSuccess: (_, quizId) => {
      queryClient.invalidateQueries({ queryKey: ['course-quizzes', courseId] });
      if (String(activeQuizId) === String(quizId)) {
        setActiveQuizId(null);
        setActiveQuestionId(null);
      }
      toast.success('Deleted successfully');
    },
    onError: () => toast.error('Failed to delete quiz'),
  });

  const createQuestionMutation = useMutation({
    mutationFn: async (quizId) => {
      const res = await axios.post(`/quizzes/${quizId}/questions`, {
        questionText: 'New Question',
        options: [
          { optionText: 'Option 1', isCorrect: true },
          { optionText: 'Option 2', isCorrect: false },
        ],
      });
      return res.data?.data?.question || res.data?.question || res.data;
    },
    onSuccess: (createdQuestion) => {
      queryClient.invalidateQueries({ queryKey: ['course-quizzes', courseId] });
      setActiveQuestionId(createdQuestion?.id || null);
      setQuestionText(createdQuestion?.question_text || createdQuestion?.questionText || '');
      setOptions(ensureMinimumOptions(createdQuestion?.options || []));
    },
    onError: () => toast.error('Failed to add question'),
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId) => axios.delete(`/questions/${questionId}`),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['course-quizzes', courseId] });
      if (String(activeQuestionId) === String(deletedId)) {
        setActiveQuestionId(null);
        setQuestionText('');
        setOptions([]);
      }
      toast.success('Question deleted');
    },
    onError: () => toast.error('Failed to delete question'),
  });

  const saveQuestionMutation = useMutation({
    mutationFn: async ({ questionId, payload }) => axios.put(`/questions/${questionId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-quizzes', courseId] });
      toast.success('Question saved');
    },
    onError: () => toast.error('Failed to save question'),
  });

  const handleCreateQuiz = () => {
    if (!newQuizTitle.trim()) {
      toast.error('Quiz title is required');
      return;
    }
    createQuizMutation.mutate(newQuizTitle.trim());
  };

  const handleDeleteQuiz = (quizId) => {
    if (!window.confirm('Delete this quiz?')) return;
    deleteQuizMutation.mutate(quizId);
  };

  const handleSaveRewards = () => {
    if (!activeQuizId) return;
    updateQuizMutation.mutate({
      quizId: activeQuizId,
      payload: {
        pointsAttempt1: Number(rewards.pointsFirstAttempt || 0),
        pointsAttempt2: Number(rewards.pointsSecondAttempt || 0),
        pointsAttempt3: Number(rewards.pointsThirdAttempt || 0),
        pointsAttempt4plus: Number(rewards.pointsFourthPlusAttempt || 0),
      },
    }, {
      onSuccess: () => toast.success('Point rewards saved'),
    });
  };

  const handleSaveQuizTitle = () => {
    if (!activeQuizId) return;
    updateQuizMutation.mutate({
      quizId: activeQuizId,
      payload: { title: quizTitle },
    });
  };

  const handleSaveQuestion = () => {
    if (!activeQuestionId) return;
    saveQuestionMutation.mutate({
      questionId: activeQuestionId,
      payload: {
        questionText,
        options: options.map((opt) => ({
          optionText: opt.option_text,
          isCorrect: !!opt.is_correct,
        })),
      },
    });
  };

  const handleDeleteQuestion = () => {
    if (!activeQuestionId) return;
    if (!window.confirm('Delete this question?')) return;
    deleteQuestionMutation.mutate(activeQuestionId);
  };

  const openBuilder = (quizId) => {
    setActiveQuizId(quizId);
    setActiveQuestionId(null);
  };

  if (!activeQuizId) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Quizzes</h3>
          <button
            type="button"
            onClick={() => setIsCreating((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-[#2D31D4] text-white hover:bg-blue-800"
          >
            <Plus className="w-4 h-4" />
            Add Quiz
          </button>
        </div>

        {isCreating ? (
          <div className="mb-3 bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-2">
            <input
              type="text"
              value={newQuizTitle}
              onChange={(e) => setNewQuizTitle(e.target.value)}
              placeholder="Quiz title"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2D31D4]"
            />
            <button
              type="button"
              onClick={handleCreateQuiz}
              disabled={createQuizMutation.isPending}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-[#2D31D4] text-white hover:bg-blue-800 disabled:opacity-70 inline-flex items-center gap-2"
            >
              {createQuizMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Create
            </button>
          </div>
        ) : null}

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="h-14 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : quizzes.length === 0 ? (
          <p className="text-sm text-gray-500">No quizzes yet. Add one to test your learners.</p>
        ) : (
          <div>
            {quizzes.map((quiz) => {
              const count = Array.isArray(quiz.questions) ? quiz.questions.length : quiz.questionsCount || 0;
              return (
                <div key={quiz.id} className="bg-white border border-gray-200 rounded-lg p-3 mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-gray-900">{quiz.title || 'Untitled quiz'}</p>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{count} questions</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openBuilder(quiz.id)}
                      className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-[#2D31D4]"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuiz(quiz.id)}
                      className="p-1.5 rounded-md text-gray-500 hover:bg-red-50 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const questions = Array.isArray(activeQuiz?.questions) ? activeQuiz.questions : [];
  const activeQuestionIndex = questions.findIndex((q) => String(q.id) === String(activeQuestionId));

  return (
    <div className="h-[70vh] min-h-[560px] border border-gray-200 rounded-xl overflow-hidden bg-white flex">
      <aside className="w-72 border-r border-gray-200 flex flex-col">
        <div className="p-3">
          <button
            type="button"
            onClick={() => {
              setActiveQuizId(null);
              setActiveQuestionId(null);
            }}
            className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <input
            type="text"
            value={quizTitle}
            onChange={(e) => setQuizTitle(e.target.value)}
            onBlur={handleSaveQuizTitle}
            className="mt-2 w-full font-semibold text-gray-900 border border-gray-300 rounded-lg px-2.5 py-2 text-sm outline-none focus:border-[#2D31D4]"
          />
        </div>

        <div className="mt-1 px-3 flex-1 overflow-y-auto pb-3">
          <div className="space-y-1">
            {questions.map((question, index) => {
              const active = String(question.id) === String(activeQuestionId);
              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => setActiveQuestionId(question.id)}
                  className={`w-full p-2 rounded-lg text-left transition-colors ${
                    active ? 'bg-[#EEF0FF] text-[#2D31D4]' : 'hover:bg-[#F4F5FF] text-gray-700'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-[11px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Q{index + 1}</span>
                    <span className="text-[13px] leading-5 truncate">{question.question_text || question.questionText || 'Untitled question'}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => createQuestionMutation.mutate(activeQuizId)}
            disabled={createQuestionMutation.isPending}
            className="w-full mt-2 border border-dashed border-[#2D31D4] text-[#2D31D4] rounded-lg py-2.5 text-sm font-medium hover:bg-[#EEF0FF] disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {createQuestionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Add Question
          </button>
        </div>

        <div className="mt-auto border-t border-gray-200 pt-4 px-3 pb-3">
          <p className="text-[13px] font-semibold text-gray-800 mb-2">Points per attempt</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['1st attempt', 'pointsFirstAttempt'],
              ['2nd attempt', 'pointsSecondAttempt'],
              ['3rd attempt', 'pointsThirdAttempt'],
              ['4th+', 'pointsFourthPlusAttempt'],
            ].map(([label, key]) => (
              <label key={key} className="text-[11px] text-gray-600">
                {label}
                <input
                  type="number"
                  min="0"
                  value={rewards[key]}
                  onChange={(e) => setRewards((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="mt-1 w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs outline-none focus:border-[#2D31D4]"
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={handleSaveRewards}
            disabled={updateQuizMutation.isPending}
            className="mt-3 w-full py-2 rounded-lg bg-[#2D31D4] text-white text-xs font-medium hover:bg-blue-800 disabled:opacity-70"
          >
            Save Rewards
          </button>
        </div>
      </aside>

      <section className="flex-1 p-6 overflow-y-auto">
        {!activeQuestion ? (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">← Select a question to edit</div>
        ) : (
          <div>
            <p className="text-sm font-semibold text-[#2D31D4]">Question {activeQuestionIndex + 1}</p>

            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Type your question here..."
              className="mt-2 w-full min-h-24 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2D31D4] resize-y"
            />

            <h4 className="mt-6 text-sm font-semibold text-gray-900">Answer Options</h4>
            <div className="mt-3">
              {options.map((opt, index) => (
                <div
                  key={`${opt.id}-${index}`}
                  className={`flex items-center gap-3 mb-3 rounded-lg p-2 ${
                    opt.is_correct ? 'border-l-4 border-green-500 bg-green-50' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOptions((prev) =>
                        prev.map((item, idx) => (idx === index ? { ...item, is_correct: !item.is_correct } : item))
                      )
                    }
                    className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                      opt.is_correct ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-transparent'
                    }`}
                    title="Toggle correct"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>

                  <input
                    type="text"
                    value={opt.option_text}
                    onChange={(e) =>
                      setOptions((prev) =>
                        prev.map((item, idx) => (idx === index ? { ...item, option_text: e.target.value } : item))
                      )
                    }
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2D31D4]"
                  />

                  {options.length > 2 ? (
                    <button
                      type="button"
                      onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== index))}
                      className="text-gray-500 hover:text-red-600 text-lg leading-none px-1"
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setOptions((prev) => [
                    ...prev,
                    { id: `temp-${Date.now()}`, option_text: '', is_correct: false },
                  ])
                }
                className="text-sm text-[#2D31D4] hover:underline"
              >
                + Add Option
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
              <button
                type="button"
                onClick={handleDeleteQuestion}
                className="text-red-500 text-sm font-medium hover:text-red-700"
              >
                Delete Question
              </button>
              <button
                type="button"
                onClick={handleSaveQuestion}
                disabled={saveQuestionMutation.isPending}
                className="px-4 py-2 rounded-lg bg-[#2D31D4] text-white text-sm font-medium hover:bg-blue-800 disabled:opacity-70 inline-flex items-center gap-2"
              >
                {saveQuestionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save Question
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default QuizTab;
