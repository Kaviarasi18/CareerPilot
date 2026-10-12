export type PlanType = 'free' | 'premium' | 'pro';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  plan: PlanType;
  credits: number;
  avatar_url?: string;
  target_career?: string;
  bio?: string;
  created_at?: string;
  updated_at?: string;
}

export type SkillProficiency = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
export type SkillSource = 'resume' | 'manual' | 'assessment';

export interface SkillItem {
  id: string;
  user_id?: string;
  skill_name: string;
  category: string;
  proficiency: SkillProficiency;
  confidence: number; // 0.0 to 1.0 (e.g. 0.92)
  evidence: string;
  source: SkillSource;
  created_at?: string;
}

export interface ResumeItem {
  id?: string;
  user_id?: string;
  file_name: string;
  file_url?: string;
  file_size?: number;
  extracted_text?: string;
  parsed_text?: string;
  analysis_result?: any;
  created_at?: string;
}

export type QuestionDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface QuizQuestion {
  id: string;
  quiz_id?: string;
  question_number: number;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  skill: string;
  difficulty: QuestionDifficulty;
}

export interface Quiz {
  id: string;
  user_id?: string;
  title: string;
  total_questions: number;
  skills_tested: string[];
  status: 'active' | 'completed' | 'abandoned';
  questions: QuizQuestion[];
  created_at?: string;
}

export type QuizData = Quiz;

export interface UserAnswer {
  question_id: string;
  question_number: number;
  selected_option: string;
  is_correct: boolean;
  time_spent_seconds?: number;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id?: string;
  score: number;
  total_questions: number;
  percentage: number;
  correct_answers: number;
  incorrect_answers: number;
  credits_earned: number;
  skill_breakdown: Record<string, any>;
  difficulty_breakdown: Record<string, any>;
  answers: UserAnswer[];
  strengths?: string[];
  weaknesses?: string[];
  user_answers?: Record<string, string>;
  completed_at?: string;
  created_at?: string;
}

export type GapLevel = 'Critical' | 'High' | 'Moderate' | 'Low' | 'None';
export type PriorityLevel = 'High' | 'Medium' | 'Low';

export interface SkillGapItem {
  id: string;
  user_id?: string;
  skill_name: string;
  current_level: SkillProficiency | string;
  target_level: SkillProficiency | string;
  gap_level: GapLevel;
  priority: PriorityLevel;
  reason: string;
  recommendation: string;
  created_at?: string;
}

export interface SkillGapSummary {
  overall_score: number; // e.g. 68/100
  gap_level: GapLevel;
  gaps: SkillGapItem[];
  strong_skills: string[];
  moderate_skills: string[];
  weak_skills: string[];
  missing_skills: string[];
}

export type SkillGapAnalysis = SkillGapSummary;

export interface CareerRoadmapPhase {
  phase: number;
  title: string;
  duration: string;
  skills: string[];
  topics: string[];
  expected_outcome: string;
  suggested_projects: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}

export interface CareerRecommendation {
  id: string;
  user_id?: string;
  career_name: string;
  match_percentage: number;
  reasoning: string;
  missing_skills: string[];
  strong_skills: string[];
  roadmap: CareerRoadmapPhase[];
  is_primary?: boolean;
  market_demand?: 'Very High' | 'High' | 'Moderate';
  avg_salary?: string;
  heuristic_score?: number;
  constraint_fit?: 'High' | 'Medium' | 'Low';
  decision_rationale?: string;
  created_at?: string;
}

export interface LearningOutcome {
  id: string;
  user_id?: string;
  career_name: string;
  objective: string;
  topics: string[];
  expected_skill_level: string;
  practical_task: string;
  project_idea: string;
  expected_outcome: string;
  is_completed?: boolean;
  created_at?: string;
}

export type TransactionType = 'EARNED' | 'SPENT' | 'BONUS' | 'REFUND';

export interface CreditTransaction {
  id: string;
  user_id: string;
  transaction_type: TransactionType;
  amount: number;
  feature?: string;
  description: string;
  balance_after?: number;
  created_at: string;
}

export interface PremiumFeature {
  id: string;
  feature_name: string;
  credit_cost: number;
  enabled: boolean;
  description: string;
}

export interface TechNewsArticle {
  id: string;
  title: string;
  summary: string;
  category: 'AI/ML' | 'Frameworks' | 'Cloud & DevOps' | 'Cybersecurity' | 'Developer Tools' | 'Tech Trends' | string;
  date: string;
  source: string;
  read_time: string;
  url?: string;
  tags: string[];
}
