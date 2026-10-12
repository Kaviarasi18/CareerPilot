import { SkillGapItem, LearningOutcome, CareerRecommendation, SkillItem } from '../../types';

export interface GenerateLearningOutcomesParams {
  gaps: SkillGapItem[];
  career?: CareerRecommendation | null;
  targetCareerName?: string;
  skills?: SkillItem[];
}

export async function generateLearningOutcomes(params: GenerateLearningOutcomesParams): Promise<LearningOutcome[]> {
  try {
    const response = await fetch('/api/ai/learning-outcomes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.outcomes && Array.isArray(data.outcomes) && data.outcomes.length > 0) {
        return ensureDistinctSkillOutcomes(data.outcomes, params.gaps, params.targetCareerName || params.career?.career_name || 'Software Engineering Pathway', params.skills);
      }
    }
  } catch (err) {
    console.warn('Backend learning outcome generation fallback:', err);
  }

  // Fallback Measurable Outcome Generator using resume skills as source
  return fallbackLearningOutcomeGenerator(
    params.gaps,
    params.targetCareerName || params.career?.career_name || 'Software Engineering Pathway',
    params.skills
  );
}

export function areOutcomesSkillSpecific(outcomes: LearningOutcome[], skills: SkillItem[]): boolean {
  const requiredSkills = skills.map((skill) => skill.skill_name.trim().toLowerCase()).filter(Boolean).slice(0, 5);
  if (requiredSkills.length === 0 || outcomes.length < requiredSkills.length) return false;

  const objectives = outcomes
    .map((outcome) => (outcome.objective || '').trim().toLowerCase())
    .filter(Boolean);
  const uniqueObjectives = new Set(objectives);
  return uniqueObjectives.size >= requiredSkills.length && requiredSkills.every((skill) => objectives.some((objective) => objective.includes(skill)));
}

function ensureDistinctSkillOutcomes(
  outcomes: LearningOutcome[],
  gaps: SkillGapItem[],
  careerName: string,
  skills?: SkillItem[]
): LearningOutcome[] {
  const resumeSkills = (skills || []).filter((skill) => skill.skill_name?.trim()).slice(0, 5);
  if (resumeSkills.length === 0) return outcomes;

  const usedSkills = new Set<string>();
  const usedObjectives = new Set<string>();
  return resumeSkills.map((skill, index) => {
    const skillName = skill.skill_name.trim();
    const normalizedSkill = skillName.toLowerCase();
    const matchingOutcome = outcomes.find((outcome) => {
      const objective = (outcome.objective || '').trim().toLowerCase();
      return objective.includes(normalizedSkill) && !usedSkills.has(normalizedSkill) && !usedObjectives.has(objective);
    });

    if (matchingOutcome) {
      usedSkills.add(normalizedSkill);
      usedObjectives.add((matchingOutcome.objective || '').trim().toLowerCase());
      return { ...matchingOutcome, id: matchingOutcome.id || `lo_skill_${index + 1}` };
    }

    const fallback = buildSkillOutcome(skill, index, gaps, careerName);
    usedSkills.add(normalizedSkill);
    usedObjectives.add(fallback.objective.toLowerCase());
    return fallback;
  });
}

function buildSkillOutcome(skill: SkillItem, index: number, gaps: SkillGapItem[], careerName: string): LearningOutcome {
  const skillName = skill.skill_name.trim();
  const relatedGap = gaps.find((gap) => gap.skill_name.toLowerCase() === skillName.toLowerCase());
  const targetLevel = relatedGap?.target_level || 'Advanced';
  const objectiveTemplates = [
    `By the end of this module, you will be able to design and validate a production-ready solution using ${skillName}.`,
    `By the end of this module, you will be able to troubleshoot and improve a real-world system built with ${skillName}.`,
    `By the end of this module, you will be able to integrate ${skillName} into a complete portfolio project with measurable results.`,
    `By the end of this module, you will be able to evaluate architectural trade-offs and choose an effective approach with ${skillName}.`,
    `By the end of this module, you will be able to deliver a tested, documented feature that demonstrates practical ${skillName} expertise.`,
  ];

  return {
    id: `lo_skill_${index + 1}_${Date.now()}`,
    career_name: careerName,
    objective: objectiveTemplates[index % objectiveTemplates.length],
    topics: [`${skillName} Fundamentals`, `${skillName} Applied Patterns`, `${skillName} Testing`, `${skillName} Performance`],
    expected_skill_level: targetLevel,
    practical_task: `Build and validate a focused deliverable using ${skillName}, documenting the design decisions and test results.`,
    project_idea: `${skillName} Portfolio Implementation`,
    expected_outcome: `A working ${skillName} deliverable with documented tests and measurable verification criteria.`,
    is_completed: false,
  };
}

function fallbackLearningOutcomeGenerator(gaps: SkillGapItem[], careerName: string, skills?: SkillItem[]): LearningOutcome[] {
  // Use resume skills as the source for learning outcomes
  const resumeSkills = skills || [];
  
  if (resumeSkills.length > 0) {
    // Generate learning outcomes from resume skills
    return resumeSkills.slice(0, 5).map((skill, idx) => buildSkillOutcome(skill, idx, gaps, careerName));
  }
  
  // Fallback to gaps if no skills available
  if (!gaps || gaps.length === 0) {
    return [
      {
        id: 'lo_default_1',
        career_name: careerName,
        objective: 'By the end of this module, you will be able to design, implement, and benchmark optimized data structures and modular APIs with comprehensive unit test suites.',
        topics: ['Modular Architecture', 'Unit Testing & Mocking', 'Error Boundaries', 'Clean Code Principles'],
        expected_skill_level: 'Intermediate',
        practical_task: 'Refactor a legacy monolithic code module into loosely-coupled, testable services.',
        project_idea: 'Scalable Micro-Service with Automated CI Validation Pipeline',
        expected_outcome: 'Code coverage >85% with zero circular dependencies.',
        is_completed: false,
      },
    ];
  }

  return gaps.slice(0, 5).map((gap, idx) => ({
    id: `lo_gap_${idx + 1}_${Date.now()}`,
    career_name: careerName,
    objective: `By the end of this module, you will be able to master and apply advanced ${gap.skill_name} patterns, solving real-world production scenarios and elevating proficiency from ${gap.current_level} to ${gap.target_level}.`,
    topics: [
      `Core Mechanics & Internal Execution in ${gap.skill_name}`,
      `Common Bottlenecks, Async Lifecycles & Error Handling in ${gap.skill_name}`,
      `Security Best Practices & Input Validation`,
      `Integration with Distributed Services & Databases`,
      `Performance Benchmarking & Profiling`,
    ],
    expected_skill_level: gap.target_level,
    practical_task: `Complete hands-on implementation and debug realistic edge-case challenges in ${gap.skill_name}: ${gap.recommendation}`,
    project_idea: `Production-Grade ${gap.skill_name} Implementation with Automated Testing & CI/CD`,
    expected_outcome: `Demonstrated mastery of ${gap.skill_name} with verifiable test coverage and low-latency benchmark performance.`,
    is_completed: false,
  }));
}
