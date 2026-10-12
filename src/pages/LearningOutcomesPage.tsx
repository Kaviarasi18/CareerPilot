import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Circle,
  FolderGit2,
  Clock,
  Target,
  ArrowRight,
  Layers,
  Award,
  BookOpen,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getSkills, getSkillGaps, getLatestQuizAttempt, getLearningOutcomes, saveLearningOutcomes, toggleLearningOutcomeCompletion } from '../services/supabase/database';
import { generateLearningOutcomes, areOutcomesSkillSpecific } from '../services/ai/learningOutcomeGenerator';
import { LearningOutcome, SkillGapItem, SkillItem } from '../types';

export const LearningOutcomesPage: React.FC = () => {
  const { profile } = useAuth();
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [outcomes, setOutcomes] = useState<LearningOutcome[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    async function init() {
      if (!profile) return;
      try {
        const [sk, storedGaps, latestAttempt, storedOutcomes] = await Promise.all([
          getSkills(profile.id),
          getSkillGaps(profile.id),
          getLatestQuizAttempt(profile.id),
          getLearningOutcomes(profile.id),
        ]);

        setSkills(sk);

        if (sk.length === 0) {
          setLoading(false);
          return;
        }

        const latestOutcomeDate = storedOutcomes.reduce((latest, outcome) => {
          const timestamp = outcome.created_at ? Date.parse(outcome.created_at) : 0;
          return Math.max(latest, timestamp);
        }, 0);
        const latestAssessmentDate = latestAttempt?.completed_at ? Date.parse(latestAttempt.completed_at) : 0;
        const needsAssessmentRefresh = latestAssessmentDate > latestOutcomeDate;

        if (storedOutcomes && storedOutcomes.length > 0 && !needsAssessmentRefresh && areOutcomesSkillSpecific(storedOutcomes, sk)) {
          setOutcomes(sanitizeLearningOutcomes(storedOutcomes));
        } else {
          const fresh = await generateLearningOutcomes({
            gaps: storedGaps,
            skills: sk,
            targetCareerName: profile.target_career || 'Software Engineer',
          });
          const cleanedFresh = sanitizeLearningOutcomes(fresh);
          setOutcomes(cleanedFresh);
          await saveLearningOutcomes(profile.id, cleanedFresh);
        }
      } catch (e) {
        console.error('LearningOutcomesPage init error:', e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [profile]);

  const handleRefresh = async () => {
    if (!profile || skills.length === 0) return;
    setRefreshing(true);
    try {
      const storedGaps = await getSkillGaps(profile.id);
      const fresh = await generateLearningOutcomes({
        gaps: storedGaps,
        skills,
        targetCareerName: profile.target_career || 'Software Engineer',
      });
      const cleanedFresh = sanitizeLearningOutcomes(fresh);
      setOutcomes(cleanedFresh);
      await saveLearningOutcomes(profile.id, cleanedFresh);
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    if (!profile) return;
    const updated = outcomes.map((o) => (o.id === id ? { ...o, is_completed: !currentStatus } : o));
    setOutcomes(updated);
    await toggleLearningOutcomeCompletion(profile.id, id, !currentStatus);
  };

  const sanitizeLearningOutcomes = (items: LearningOutcome[]) => {
    const blockedPatterns = [
      'master modern javascript',
      'javascript (es6+)',
      'modern javascript',
    ];

    return items.filter((item) => {
      const objective = (item.objective || '').trim().toLowerCase();
      const normalizedObjective = objective.replace(/[^a-z0-9\s+]/g, ' ').replace(/\s+/g, ' ').trim();
      return !blockedPatterns.some((pattern) => normalizedObjective.includes(pattern));
    });
  };

  const visibleOutcomes = sanitizeLearningOutcomes(outcomes);
  const completedCount = visibleOutcomes.filter((o) => o.is_completed).length;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-500">Generating measurable learning outcomes from your resume...</p>
      </div>
    );
  }

  if (skills.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 max-w-lg mx-auto shadow-xs">
        <GraduationCap className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">No Resume Skills Found</h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Learning outcome objectives are directly derived from the skills in your resume. Upload your resume or add your technical skills to generate personalized objectives based on your existing competencies.
          </p>
        <Link
          to="/resume"
          className="px-6 py-3 rounded-xl font-bold text-xs bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-2"
        >
          <span>Upload Resume & Skills</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Objectives Derived from Your Resume Skills</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Personalized Measurable Learning Outcomes
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Each objective is directly derived from the skills in your resume, focusing on enhancing your existing competencies.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Recalculating...' : 'Regenerate Outcomes'}</span>
          </button>

          <Link
            to={`/learning/skill/${encodeURIComponent(skills[0]?.skill_name || 'JavaScript')}`}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Open AI Tutor</span>
          </Link>

          <div className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            {completedCount} of {visibleOutcomes.length} Objectives Completed
          </div>
        </div>
      </div>

      {/* Resume Skills Source */}
      <div className="bg-emerald-50/50 rounded-2xl p-6 border border-emerald-200/60 shadow-2xs">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold text-emerald-800">Resume Skills Used for Objectives</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {skills.slice(0, 8).map((skill, idx) => (
            <span
              key={idx}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-emerald-700 border border-emerald-200"
            >
              {skill.skill_name}
            </span>
          ))}
          {skills.length > 8 && (
            <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-slate-500 border border-slate-200">
              +{skills.length - 8} more
            </span>
          )}
        </div>
      </div>

      {/* Progress Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs">
        <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-2">
          <span>Curriculum Mastery Progress</span>
          <span>{visibleOutcomes.length > 0 ? Math.round((completedCount / visibleOutcomes.length) * 100) : 0}% Completed</span>
        </div>
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-emerald-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${visibleOutcomes.length > 0 ? (completedCount / visibleOutcomes.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Outcomes Cards List */}
      <div className="space-y-6">
        {visibleOutcomes.map((item, index) => (
          <div
            key={item.id || index}
            className={`rounded-2xl border p-6 sm:p-8 transition-all shadow-2xs ${
              item.is_completed
                ? 'bg-emerald-50/40 border-emerald-200'
                : 'bg-white border-slate-200/80'
            }`}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleToggle(item.id, item.is_completed)}
                  className="cursor-pointer text-slate-400 hover:text-emerald-600 transition-colors"
                >
                  {item.is_completed ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 fill-emerald-100" />
                  ) : (
                    <Circle className="w-6 h-6 text-slate-300" />
                  )}
                </button>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Objective {index + 1}
                  </span>
                  <h3 className={`text-base font-bold ${item.is_completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                    {item.objective}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                  {item.expected_skill_level}
                </span>
              </div>
            </div>

            {/* Topics Covered */}
            <div className="mb-4">
              <span className="text-[11px] font-bold text-slate-500 block mb-1.5">Topics & Mechanisms</span>
              <div className="flex flex-wrap gap-1.5">
                {item.topics?.map((topic, tIdx) => (
                  <span
                    key={tIdx}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>

            {/* Practical Task & Project Idea */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
                <span className="text-[11px] font-bold text-slate-600 block mb-1">
                  Practical Hands-On Task:
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">{item.practical_task}</p>
              </div>

              <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200/60">
                <span className="text-[11px] font-bold text-emerald-800 block mb-1">
                  Suggested Project Deliverable:
                </span>
                <p className="text-xs text-emerald-950 font-medium">{item.project_idea}</p>
                <div className="text-[11px] text-emerald-700 mt-1 font-semibold">
                  Outcome: {item.expected_outcome}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
