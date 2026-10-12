import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Route,
  Sparkles,
  CheckCircle2,
  XCircle,
  Briefcase,
  Layers,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Award,
  ChevronRight,
  FolderGit2,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getSkills, getLatestQuizAttempt, getCareerRecommendations, saveCareerRecommendations } from '../services/supabase/database';
import { generateCareerRecommendations } from '../services/ai/careerRecommender';
import { CareerRecommendation, SkillItem, QuizAttempt } from '../types';
import { PremiumFeatureGuard } from '../components/common/PremiumFeatureGuard';

export const CareerPathPage: React.FC = () => {
  const { profile } = useAuth();
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [careers, setCareers] = useState<CareerRecommendation[]>([]);
  const [selectedCareer, setSelectedCareer] = useState<CareerRecommendation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    async function init() {
      if (!profile) return;
      try {
        const [sk, attempt, stored] = await Promise.all([
          getSkills(profile.id),
          getLatestQuizAttempt(profile.id),
          getCareerRecommendations(profile.id),
        ]);

        setSkills(sk);

        if (sk.length === 0) {
          setLoading(false);
          return;
        }

        if (stored && stored.length > 0) {
          setCareers(stored);
          setSelectedCareer(stored[0]);
        } else {
          const fresh = await generateCareerRecommendations({
            skills: sk,
            attempt,
            targetCareer: profile.target_career,
          });
          setCareers(fresh);
          if (fresh.length > 0) {
            setSelectedCareer(fresh[0]);
            await saveCareerRecommendations(profile.id, fresh);
          }
        }
      } catch (e) {
        console.error('CareerPathPage init error:', e);
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
      const attempt = await getLatestQuizAttempt(profile.id);
      const fresh = await generateCareerRecommendations({
        skills,
        attempt,
        targetCareer: profile.target_career,
      });
      setCareers(fresh);
      if (fresh.length > 0) {
        setSelectedCareer(fresh[0]);
        await saveCareerRecommendations(profile.id, fresh);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-500">Generating tailored career pathways from your resume...</p>
      </div>
    );
  }

  if (skills.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 max-w-lg mx-auto shadow-xs">
        <Briefcase className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">No Resume Skills Found</h2>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          Career pathways and 6-phase roadmaps are generated strictly from the skills extracted from your resume. Upload your resume or add your technical skills to view personalized recommendations.
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

  const primaryCareer = careers[0];
  const secondaryCareers = careers.slice(1);
  const activeCareer = selectedCareer || primaryCareer;
  const formatMatchPercentage = (value: number | string | undefined) =>
    `${String(value ?? '').replace(/%+$/, '')}%`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tailored to Your {skills.length} Extracted Resume Skills</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            AI Career Path Recommendations & Roadmaps
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Discover roles that map directly to your technical skillset and follow 6-phase actionable milestones.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Recalculating...' : 'Regenerate Pathways'}</span>
          </button>
          <Link
            to="/learning"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5"
          >
            <span>Learning Outcomes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Selected / Primary Recommended Career Card */}
      {activeCareer && (
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-emerald-50/20 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Recommended Role Alignment</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">{activeCareer.career_name}</h2>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-3xl font-black text-emerald-600">{formatMatchPercentage(activeCareer.match_percentage)}</div>
                <div className="text-[11px] font-semibold text-slate-400">Skill Match Score</div>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
                <div className="text-slate-400 font-medium">Avg Salary</div>
                <div className="font-extrabold text-slate-900 mt-0.5">{activeCareer.avg_salary}</div>
              </div>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-6 max-w-3xl">
            {activeCareer.reasoning}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-xs font-bold text-emerald-700 block mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Strong Skills Matched from Your Resume
              </span>
              <div className="flex flex-wrap gap-1.5">
                {activeCareer.strong_skills?.map((s, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-xs font-bold text-amber-700 block mb-2 flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-amber-600" /> Target Skills for Seniority
              </span>
              <div className="flex flex-wrap gap-1.5">
                {activeCareer.missing_skills?.map((s, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Alternative Matching Pathways */}
      {secondaryCareers.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-4">
            Alternative Career Pathways Based on Your Resume
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {secondaryCareers.map((c, cIdx) => (
              <div
                key={`secondary-career-${c.id || c.career_name || cIdx}`}
                onClick={() => setSelectedCareer(c)}
                className={`p-5 rounded-xl border-2 transition-all cursor-pointer ${
                  selectedCareer?.career_name === c.career_name || selectedCareer?.id === c.id
                    ? 'border-emerald-600 bg-emerald-50/30 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-slate-900">{c.career_name}</h4>
                  <span className="text-sm font-black text-emerald-600">{formatMatchPercentage(c.match_percentage)}</span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2 mb-3">{c.reasoning}</p>
                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <span>Salary: {c.avg_salary}</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    Select Pathway <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
