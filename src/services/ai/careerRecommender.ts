import { SkillItem, QuizAttempt, CareerRecommendation, CareerRoadmapPhase } from '../../types';

export interface CareerRecommenderParams {
  skills: SkillItem[];
  attempt?: QuizAttempt | null;
  gapSummary?: any;
  targetCareer?: string;
  resumeText?: string;
}

export async function generateCareerRecommendations(params: CareerRecommenderParams): Promise<CareerRecommendation[]> {
  if (!params.skills || params.skills.length === 0) {
    return [];
  }

  try {
    const response = await fetch('/api/ai/career-recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.careers && Array.isArray(data.careers) && data.careers.length > 0) {
        return data.careers.map((career: CareerRecommendation) => ({
          ...career,
          heuristic_score: career.heuristic_score ?? career.match_percentage,
          constraint_fit: career.constraint_fit ?? 'Medium',
          decision_rationale: career.decision_rationale ?? career.reasoning,
        }));
      }
    }
  } catch (err) {
    console.warn('Backend career recommendation fallback:', err);
  }

  // Fallback Dynamic Career Generator strictly built around candidate's actual resume skills & assessment performance
  return fallbackCareerRecommender(params.skills, params.attempt, params.targetCareer);
}

function getConstraintFit(score: number): 'High' | 'Medium' | 'Low' {
  if (score >= 75) return 'High';
  if (score >= 50) return 'Medium';
  return 'Low';
}

function buildHeuristicCareerScore(
  candidateSkills: string[],
  allSkills: string[],
  assessmentScore: number,
  targetCareer?: string
): { heuristic_score: number; constraint_fit: 'High' | 'Medium' | 'Low'; decision_rationale: string } {
  const normalizedAll = allSkills.map((skill) => skill.toLowerCase());
  const requiredSkills = candidateSkills.map((skill) => skill.toLowerCase());

  const matchedSkills = requiredSkills.filter((skill) => normalizedAll.some((item) => item.includes(skill) || skill.includes(item)));
  const constraintCoverage = requiredSkills.length > 0 ? (matchedSkills.length / requiredSkills.length) * 100 : 0;
  const performanceBoost = assessmentScore > 80 ? 12 : assessmentScore > 60 ? 6 : 2;
  const targetBoost = targetCareer ? 5 : 0;

  const heuristic_score = Math.min(99, Math.max(50, Math.round(constraintCoverage * 0.65 + performanceBoost + targetBoost)));
  const constraint_fit = getConstraintFit(heuristic_score);

  const decision_rationale =
    requiredSkills.length > 0
      ? `Heuristic score ${heuristic_score}/100 based on ${matchedSkills.length}/${requiredSkills.length} required skill matches and assessment performance ${assessmentScore}%.`
      : `Heuristic score ${heuristic_score}/100 based on your broader skill portfolio and assessment performance.`;

  return { heuristic_score, constraint_fit, decision_rationale };
}

function fallbackCareerRecommender(skills: SkillItem[], attempt?: QuizAttempt | null, targetCareer?: string): CareerRecommendation[] {
  const skillNames = skills.map((s) => s.skill_name);
  const sNamesLower = skills.map((s) => s.skill_name.toLowerCase());

  const scorePct = attempt?.percentage ?? 80;
  const assessmentEvidence = attempt
    ? `Verified by your ${scorePct}% assessment score across ${Object.keys(attempt.skill_breakdown || {}).length || skillNames.length} tested topics.`
    : `Directly formulated from your declared resume competencies in ${skillNames.slice(0, 3).join(', ')}.`;

  const hasCad = sNamesLower.some((s) => s.includes('cad') || s.includes('autocad') || s.includes('solidworks') || s.includes('catia') || s.includes('creo'));
  const hasStructural = sNamesLower.some((s) => s.includes('structural') || s.includes('fea') || s.includes('ansys') || s.includes('analysis'));
  const hasRobotics = sNamesLower.some((s) => s.includes('robotics') || s.includes('automation') || s.includes('plc') || s.includes('scada') || s.includes('mechatronics'));
  const hasProjectMgmt = sNamesLower.some((s) => s.includes('project management') || s.includes('management') || s.includes('pmp') || s.includes('leadership') || s.includes('agile') || s.includes('strategic'));
  const hasPython = sNamesLower.some((s) => s.includes('python') || s.includes('django') || s.includes('flask') || s.includes('fastapi'));
  const hasJava = sNamesLower.some((s) => s.includes('java') || s.includes('spring'));
  const hasData = sNamesLower.some((s) => s.includes('pandas') || s.includes('machine learning') || s.includes('data') || s.includes('ai') || s.includes('tensorflow') || s.includes('pytorch'));
  const hasCloud = sNamesLower.some((s) => s.includes('docker') || s.includes('aws') || s.includes('kubernetes') || s.includes('cloud') || s.includes('devops'));

  const careers: CareerRecommendation[] = [];

  const createRoadmap = (focus: string, tools: string[], advanceTopics: string[]): CareerRoadmapPhase[] => [
    {
      phase: 1,
      title: `Core Proficiency & Standard Practices (${focus})`,
      duration: '2 weeks',
      skills: tools.slice(0, 3),
      topics: ['Advanced Industry Standards', 'Workflow Optimization', 'Technical Specifications & Quality Assurance'],
      expected_outcome: `Establish rigorous, production-level proficiency in ${tools[0] || focus} aligned with assessment findings.`,
      suggested_projects: [`Comprehensive Real-World Project Implementing ${tools.slice(0, 2).join(' & ')}`],
      difficulty: 'Intermediate',
    },
    {
      phase: 2,
      title: 'Systems Integration & Cross-Functional Execution',
      duration: '3 weeks',
      skills: [...tools.slice(1, 4), 'Integration Workflows'],
      topics: advanceTopics,
      expected_outcome: 'Execute complex multi-stage engineering requirements with high efficiency and budget control.',
      suggested_projects: [`End-to-End System Deliverable with Validation & Performance Metrics`],
      difficulty: 'Intermediate',
    },
    {
      phase: 3,
      title: 'Advanced Optimization & Technical Leadership',
      duration: '3 weeks',
      skills: ['Performance Auditing', 'Strategic Lifecycle Management', 'Risk Mitigation'],
      topics: ['Scalability Benchmarking', 'Regulatory Compliance', 'Executive Technical Reporting'],
      expected_outcome: 'Drive strategic engineering outcomes with measurable cost reduction and operational excellence.',
      suggested_projects: [`Enterprise Technical Case Study & Capstone Deployment`],
      difficulty: 'Advanced',
    },
  ];

  // 1. Robotics & Automation Systems
  if (hasRobotics || (hasCad && hasStructural)) {
    const relevantSkills = skillNames.filter((s) => /robotics|automation|cad|structural|control|plc/i.test(s));
    careers.push({
      id: 'car_robotics_auto',
      career_name: 'Robotics & Automation Systems Engineer',
      match_percentage: Math.min(96, Math.max(82, scorePct + 10)),
      reasoning: `Strong alignment with your resume skills in ${relevantSkills.join(', ')}. ${assessmentEvidence}`,
      strong_skills: relevantSkills.length > 0 ? relevantSkills : skillNames.slice(0, 3),
      missing_skills: ['PLC / SCADA Integration', 'Industrial IoT Protocols (MQTT/OPC UA)', 'Predictive Maintenance Analytics'],
      market_demand: 'Very High',
      avg_salary: '$115,000 - $155,000',
      roadmap: createRoadmap('Robotics & Automation', ['Robotics and Automation', 'CAD', 'Control Systems'], ['Kinematic Modeling', 'Sensor Fusion & Telemetry', 'Safety Standards (ISO 10218)']),
      is_primary: true,
    });
  }

  // 2. Structural Analysis & CAD Engineering
  if (hasStructural || hasCad) {
    const structSkills = skillNames.filter((s) => /structural|cad|analysis|fea|solidworks|autocad/i.test(s));
    careers.push({
      id: 'car_structural_cad',
      career_name: 'Senior Structural Design & Analysis Engineer',
      match_percentage: Math.min(94, Math.max(80, scorePct + 8)),
      reasoning: `Your expertise in ${structSkills.join(' & ')} directly matches mission-critical engineering design roles. ${assessmentEvidence}`,
      strong_skills: structSkills.length > 0 ? structSkills : skillNames.slice(0, 2),
      missing_skills: ['Non-linear Finite Element Analysis (FEA)', 'Thermal Stress Optimization', 'Dynamic Load Simulation'],
      market_demand: 'High',
      avg_salary: '$110,000 - $148,000',
      roadmap: createRoadmap('Structural Analysis & CAD', ['Structural Analysis', 'CAD', 'Finite Element Analysis'], ['Stress Distribution & Yield Criteria', 'Material Non-linearities', 'Computational Fluid/Solid Coupling']),
      is_primary: careers.length === 0,
    });
  }

  // 3. Technical Project & Engineering Executive Management
  if (hasProjectMgmt) {
    const mgmtSkills = skillNames.filter((s) => /project|management|leadership|strategic|pmp|agile/i.test(s));
    careers.push({
      id: 'car_eng_management',
      career_name: 'Engineering Project & Program Manager',
      match_percentage: Math.min(95, Math.max(84, scorePct + 9)),
      reasoning: `Your proven competencies in ${mgmtSkills.join(', ')} position you well to manage cross-functional engineering deliverables. ${assessmentEvidence}`,
      strong_skills: mgmtSkills.length > 0 ? mgmtSkills : ['Project Management'],
      missing_skills: ['Agile Hardware/Software Co-design', 'Earned Value Management (EVM)', 'Risk & Vendor SLA Governance'],
      market_demand: 'Very High',
      avg_salary: '$125,000 - $168,000',
      roadmap: createRoadmap('Engineering Project Management', ['Project Management', 'Resource Allocation', 'Strategic Planning'], ['Milestone Budgeting & Risk Forecasting', 'Agile & Waterfall Hybrid Delivery', 'Executive Stakeholder Governance']),
      is_primary: careers.length === 0,
    });
  }

  // 4. Data / AI / Software pathways (if applicable)
  if (hasData || hasPython) {
    const aiSkills = skillNames.filter((s) => /python|pandas|data|sql|ai|learning|numpy/i.test(s));
    careers.push({
      id: 'car_ai_data',
      career_name: 'AI & Applied Data Systems Engineer',
      match_percentage: 92,
      reasoning: `Strong alignment with your technical skills in ${aiSkills.join(', ')}. ${assessmentEvidence}`,
      strong_skills: aiSkills,
      missing_skills: ['Vector Embeddings & RAG', 'Model Serving (FastAPI/Triton)', 'MLOps & Experiment Tracking'],
      market_demand: 'Very High',
      avg_salary: '$125,000 - $165,000',
      roadmap: createRoadmap('AI & Data Architecture', ['Python', 'SQL', 'FastAPI'], ['Distributed Data Processing', 'Model Quantization & Inference', 'Data Pipeline Observability']),
      is_primary: careers.length === 0,
    });
  }

  if (hasJava) {
    const javaSkills = skillNames.filter((s) => /java|spring|sql|database|backend/i.test(s));
    careers.push({
      id: 'car_java',
      career_name: 'Enterprise Backend Systems Architect',
      match_percentage: 90,
      reasoning: `Your background in ${javaSkills.join(', ')} matches enterprise microservices. ${assessmentEvidence}`,
      strong_skills: javaSkills,
      missing_skills: ['Event-Driven Architecture (Kafka)', 'Distributed Tracing (OpenTelemetry)', 'Kubernetes Orchestration'],
      market_demand: 'High',
      avg_salary: '$120,000 - $158,000',
      roadmap: createRoadmap('Enterprise Java', ['Java', 'Spring Boot', 'SQL'], ['Microservices Resiliency', 'Distributed Caching', 'Cloud-Native Deployment']),
      is_primary: careers.length === 0,
    });
  }

  // 5. Tailored primary pathway matching user's specific skills
  const primaryResumeSkills = skillNames.slice(0, 4);
  careers.push({
    id: 'car_custom_main',
    career_name: targetCareer || `${primaryResumeSkills[0] || 'Technical Systems'} Engineer`,
    match_percentage: Math.min(92, Math.max(78, scorePct + 5)),
    reasoning: `Customized career track built specifically around your verified resume skills in ${primaryResumeSkills.join(', ')}. ${assessmentEvidence}`,
    strong_skills: primaryResumeSkills,
    missing_skills: ['Cross-Disciplinary System Integration', 'Automated Testing & Continuous Validation', 'Scalability & Reliability Architecture'],
    market_demand: 'Very High',
    avg_salary: '$115,000 - $152,000',
    roadmap: createRoadmap(primaryResumeSkills[0] || 'Engineering Systems', primaryResumeSkills, ['Modular Architecture', 'Quality Benchmarking', 'Lifecycle Deployment']),
    is_primary: careers.length === 0,
  });

  const evaluatedCareers = careers.map((career) => {
    const candidateSkills = [...new Set([...(career.strong_skills || []), ...(career.missing_skills || [])])];
    const heuristic = buildHeuristicCareerScore(candidateSkills, skillNames, scorePct, targetCareer);
    return {
      ...career,
      heuristic_score: heuristic.heuristic_score,
      constraint_fit: heuristic.constraint_fit,
      decision_rationale: heuristic.decision_rationale,
      match_percentage: Math.max(career.match_percentage, heuristic.heuristic_score),
    };
  });

  evaluatedCareers.sort((a, b) => (b.heuristic_score ?? 0) - (a.heuristic_score ?? 0));
  evaluatedCareers[0].is_primary = true;

  return evaluatedCareers;
}
