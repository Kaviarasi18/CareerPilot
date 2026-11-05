import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  CheckSquare,
  Sparkles,
  Award,
  Zap,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Coins,
  FileText,
  CheckCircle2,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getSkills, getLatestQuizAttempt, saveQuiz } from '../services/supabase/database';
import { generate15QuestionQuiz } from '../services/ai/quizGenerator';
import { orderSkillsByPrerequisites } from '../utils/breadthFirstSearch';
import { SkillItem, QuizAttempt } from '../types';

export const AssessmentHubPage: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [selectedSkillNames, setSelectedSkillNames] = useState<string[]>([]);
  const [latestAttempt, setLatestAttempt] = useState<QuizAttempt | null>(null);
  const [assessmentMode, setAssessmentMode] = useState<'resume' | 'focus'>('resume');
  const [topicFocus, setTopicFocus] = useState<string>('Comprehensive Full Stack & Core Concepts');
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!profile) return;
      try {
        const [sk, att] = await Promise.all([
          getSkills(profile.id),
          getLatestQuizAttempt(profile.id),
        ]);
        setSkills(sk);
        setSelectedSkillNames(sk.map((s) => s.skill_name));
        setLatestAttempt(att);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [profile]);

  const toggleSkill = (skillName: string) => {
    setSelectedSkillNames((prev) =>
      prev.includes(skillName) ? prev.filter((s) => s !== skillName) : [...prev, skillName]
    );
  };

  const orderedSelectedSkillNames = orderSkillsByPrerequisites(selectedSkillNames);

  const selectAllSkills = () => {
    setSelectedSkillNames(skills.map((s) => s.skill_name));
  };

  const handleStartQuiz = async () => {
    if (skills.length === 0) {
      setError('Please upload your resume or add your technical skills on the Resume & Skills page first.');
      return;
    }

    if (assessmentMode === 'resume' && selectedSkillNames.length === 0) {
      setError('Please select at least one skill from your extracted resume list.');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const targetSkills = assessmentMode === 'resume'
        ? skills.filter((s) => selectedSkillNames.includes(s.skill_name))
        : skills;

      const focusLabel = assessmentMode === 'resume'
        ? `Tailored Resume Skills: ${selectedSkillNames.slice(0, 4).join(', ')}`
        : topicFocus;

      const quizData = await generate15QuestionQuiz(
        targetSkills,
        focusLabel,
        selectedSkillNames
      );

      const savedQuiz = await saveQuiz(profile.id, quizData);
      navigate(`/assessment/${savedQuiz.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to generate assessment quiz.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Personalized Skill Assessment
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Dynamic 15-question evaluation generated specifically from your extracted resume skills.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Launch Card */}
      <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/60 via-white to-emerald-50/20 p-6 sm:p-8 shadow-xs">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>AI Resume Skill Mapping Engine</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
            15-Question Technical Assessment Tailored to Your Resume
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
            Questions are generated in real-time by AI based on the exact skills extracted from your resume. Difficulty is calibrated with <strong>5 Easy</strong>, <strong>6 Medium</strong>, and <strong>4 Hard</strong> questions.
          </p>

          {/* Assessment Mode Selector */}
          <div className="mb-6 p-1.5 bg-slate-100/90 rounded-2xl flex max-w-md border border-slate-200">
            <button
              type="button"
              onClick={() => setAssessmentMode('resume')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                assessmentMode === 'resume'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Resume Skills Mode
            </button>
            <button
              type="button"
              onClick={() => setAssessmentMode('focus')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                assessmentMode === 'focus'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Custom Focus Domain
            </button>
          </div>

          {/* Extracted Resume Skills Tag Cloud */}
          {assessmentMode === 'resume' && (
            <div className="mb-6 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">
                    Your Extracted Resume Skills ({skills.length} detected):
                  </span>
                </div>
                {skills.length > 0 && (
                  <button
                    type="button"
                    onClick={selectAllSkills}
                    className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                )}
              </div>

              {skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => {
                    const isSelected = selectedSkillNames.includes(skill.skill_name);
                    return (
                      <button
                        key={skill.id || skill.skill_name}
                        type="button"
                        onClick={() => toggleSkill(skill.skill_name)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-300'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 opacity-60'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                        <span>{skill.skill_name}</span>
                        {skill.proficiency && (
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({skill.proficiency})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-slate-500 py-2">
                  No skills extracted yet.{' '}
                  <Link to="/resume" className="font-bold text-emerald-600 hover:underline">
                    Upload your resume on the Resume & Skills page
                  </Link>{' '}
                  to generate tailored questions.
                </div>
              )}
              {orderedSelectedSkillNames.length > 0 && (
                <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3.5 py-3">
                  <p className="text-[11px] font-bold text-indigo-900">
                    BFS question-planning order
                  </p>
                  <p className="mt-1 text-[11px] text-indigo-800">
                    Breadth-First Search orders known skill prerequisites from foundational to advanced; skills without a mapped relationship stay in their selected order:
                    {' '}{orderedSelectedSkillNames.join(' → ')}.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Focus Domain Selector */}
          {assessmentMode === 'focus' && (
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Select Assessment Focus Area:
              </label>
              <select
                value={topicFocus}
                onChange={(e) => setTopicFocus(e.target.value)}
                className="w-full sm:w-96 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none shadow-2xs"
              >
                <option value="Comprehensive Full Stack & Core Concepts">Comprehensive Full Stack & Core Concepts</option>
                <option value="Frontend Architecture & React Patterns">Frontend Architecture & Modern React</option>
                <option value="Backend APIs, Node.js & Database Systems">Backend Systems, Node.js & PostgreSQL</option>
                <option value="Cloud, Docker & DevOps Practices">Cloud, Docker & CI/CD Pipelines</option>
                <option value="System Design, Performance & Security">System Design, Security & Edge Cases</option>
                <option value="Python, Data Engineering & Machine Learning">Python, Data Engineering & Machine Learning</option>
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="text-xs font-bold text-slate-500">Total Questions</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">15 Questions</div>
              <div className="text-[11px] text-slate-400">Dynamic multiple-choice with code</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="text-xs font-bold text-slate-500">Difficulty Curve</div>
              <div className="text-base font-extrabold text-slate-900 mt-0.5">5 Easy • 6 Med • 4 Hard</div>
              <div className="text-[11px] text-slate-400">Calibrated for accurate diagnostics</div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 shadow-2xs">
              <div className="text-xs font-bold text-amber-800">Earn Free Credits</div>
              <div className="text-2xl font-black text-amber-900 mt-0.5">Up to +5 Credits</div>
              <div className="text-[11px] text-amber-700 font-semibold">Awarded for score ≥ 80%</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={handleStartQuiz}
              disabled={generating || skills.length === 0}
              className="px-6 py-3.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Generating Assessment from Your Resume Skills...</span>
                </>
              ) : (
                <>
                  <span>Start 15-Question Assessment</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {skills.length === 0 && (
              <Link
                to="/resume"
                className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1"
              >
                <span>Upload resume first</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Assessment History / Latest Result */}
      {latestAttempt && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Your Latest Assessment Performance</h3>
              <p className="text-xs text-slate-500">
                Completed on {new Date(latestAttempt.created_at || latestAttempt.completed_at || Date.now()).toLocaleDateString()}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              {latestAttempt.percentage}% Score
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="text-[11px] text-slate-500 font-medium">Correct Answers</div>
              <div className="text-lg font-bold text-slate-900 mt-0.5">{latestAttempt.score} / {latestAttempt.total_questions}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="text-[11px] text-slate-500 font-medium">Earned Credits</div>
              <div className="text-lg font-bold text-amber-600 mt-0.5">+{latestAttempt.credits_earned} Credits</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="text-[11px] text-slate-500 font-medium">Strengths Identified</div>
              <div className="text-xs font-bold text-emerald-700 mt-1 line-clamp-1">{latestAttempt.strengths?.join(', ') || 'Core concepts'}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="text-[11px] text-slate-500 font-medium">Key Gap Areas</div>
              <div className="text-xs font-bold text-rose-700 mt-1 line-clamp-1">{latestAttempt.weaknesses?.join(', ') || 'Optimization'}</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                navigate('/results');
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
            >
              Review Full Breakdown & Explanations
            </button>
            <button
              onClick={() => navigate('/skill-gap')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-800 hover:bg-slate-200 cursor-pointer"
            >
              Go to Skill Gap Diagnosis →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
