import { SkillItem } from '../../types';

export interface ResumeAnalysisResult {
  skills: Omit<SkillItem, 'id' | 'user_id' | 'created_at'>[];
  summary: string;
  experience_years?: number;
  domain?: string;
}

export interface AnalyzeResumeOptions {
  resumeText?: string;
  base64Data?: string;
  mimeType?: string;
  fileName?: string;
}

function normalizeConfidence(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.min(1, Math.max(0, value));
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    const confidenceLevels: Record<string, number> = {
      'very high': 0.98,
      high: 0.9,
      medium: 0.75,
      moderate: 0.75,
      low: 0.5,
      'very low': 0.25,
    };
    if (normalized in confidenceLevels) return confidenceLevels[normalized];

    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return Math.min(1, Math.max(0, parsed));
  }

  return 0.95;
}

// Validator to ensure an item is a real technical/professional skill, not noise/address/phone
export function isValidSkillName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const clean = name.trim();
  const lower = clean.toLowerCase();

  // Reject if too short or too long
  if (clean.length < 2 || clean.length > 35) return false;

  // Reject phone numbers, dates, numbers
  if (/\d{3,}/.test(clean) || /\d+-\d+/.test(clean) || /\b(19\d\d|20\d\d)\b/.test(clean)) return false;

  // Reject URLs, emails, websites
  if (/@|\.com|\.org|\.net|\.edu|www\.|http/i.test(clean)) return false;

  // Reject address and location words
  if (/\b(street|st\.|avenue|ave\.|road|rd\.|drive|dr\.|city|state|zip|anywhere|any city|address)\b/i.test(lower)) return false;

  // Reject section titles and spoken languages
  if (/\b(languages|language|certifications|awards|activities|education|experience|summary|thesis|university|college|bachelor|master|phd|english|malay|german|spanish|french|hindi|tamil)\b/i.test(lower)) {
    return false;
  }

  // Reject generic sentences or long clauses
  if (clean.split(/\s+/).length > 5) return false;

  // Must contain actual alphabet characters
  if (!/[a-zA-Z]/.test(clean)) return false;

  return true;
}

export async function analyzeResume(
  input: string | AnalyzeResumeOptions,
  fileNameParam?: string
): Promise<ResumeAnalysisResult> {
  const payload: AnalyzeResumeOptions =
    typeof input === 'string'
      ? { resumeText: input, fileName: fileNameParam }
      : input;

  try {
    const response = await fetch('/api/ai/analyze-resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.skills && Array.isArray(data.skills) && data.skills.length > 0) {
        // Sanitize AI results to guarantee no noise passes through
        const cleanAiSkills = data.skills
          .filter((s: any) => s && s.skill_name && isValidSkillName(s.skill_name))
          .map((s: any) => ({
            skill_name: s.skill_name.trim(),
            category: s.category || 'Core Engineering',
            proficiency: s.proficiency || 'Intermediate',
            confidence: normalizeConfidence(s.confidence),
            evidence: s.evidence || 'Directly identified in resume',
            source: 'resume' as const,
          }));

        if (cleanAiSkills.length > 0) {
          return {
            ...data,
            skills: cleanAiSkills,
          };
        }
      }
    }
  } catch (err) {
    console.warn('Backend resume analysis error, running local NLP extractor:', err);
  }

  // Fallback strictly extracts only actual technical skills found in the text
  return fallbackResumeExtractor(payload.resumeText || '');
}

export async function analyzeManualSkills(skillsInput: string[] | string): Promise<ResumeAnalysisResult> {
  try {
    const response = await fetch('/api/ai/analyze-manual-skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skills: skillsInput }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.skills && Array.isArray(data.skills) && data.skills.length > 0) {
        return {
          ...data,
          skills: data.skills.map((skill: any) => ({
            ...skill,
            confidence: normalizeConfidence(skill.confidence),
          })),
        };
      }
    }
  } catch (err) {
    console.warn('Backend manual skill analysis fallback:', err);
  }

  const skillList = Array.isArray(skillsInput)
    ? skillsInput
    : skillsInput.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);

  return fallbackManualSkillsNormalizer(skillList);
}

export function fallbackResumeExtractor(text: string): ResumeAnalysisResult {
  if (!text || text.trim().length === 0) {
    return {
      skills: [],
      summary: 'No text content was detected in this document.',
      experience_years: 0,
      domain: 'General Engineering',
    };
  }

  const detectedSkills: Omit<SkillItem, 'id' | 'user_id' | 'created_at'>[] = [];
  const registeredNames = new Set<string>();

  const addSkill = (
    name: string,
    category: string,
    evidence: string,
    proficiency: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' = 'Intermediate'
  ) => {
    const clean = name.trim().replace(/^[:\-\s•*]+|[:\-\s•*]+$/g, '');
    if (!isValidSkillName(clean)) return;

    const lower = clean.toLowerCase();
    if (registeredNames.has(lower)) return;
    registeredNames.add(lower);

    detectedSkills.push({
      skill_name: clean,
      category,
      proficiency,
      confidence: 0.98,
      evidence,
      source: 'resume',
    });
  };

  // --------------------------------------------------------------------------
  // 1. BOUNDED TECHNICAL SKILLS SECTION PARSER
  // Specifically captures ONLY the segment between "Technical Skills:" and the NEXT section
  // --------------------------------------------------------------------------
  const boundedSkillsRegex = /(?:Technical\s+Skills|Key\s+Skills|Core\s+Competencies|Skills|Areas\s+of\s+Expertise)\s*[:\-]\s*([^:\n\r]+?)(?=(?:Languages|Certifications|Education|Experience|Awards|Work|Projects|Summary|Contact|\d{3}-\d{3}|$))/gi;
  
  let match: RegExpExecArray | null;
  while ((match = boundedSkillsRegex.exec(text)) !== null) {
    if (match[1]) {
      const segment = match[1].trim();
      const rawTokens = segment.split(/[,;•|\/]+/).map((s) => s.trim()).filter(Boolean);
      for (const token of rawTokens) {
        if (!isValidSkillName(token)) continue;

        let cat = 'Core Engineering';
        const lowerToken = token.toLowerCase();
        if (lowerToken.includes('management') || lowerToken.includes('leadership') || lowerToken.includes('agile') || lowerToken.includes('scrum') || lowerToken.includes('planning')) {
          cat = 'Project & Product Management';
        } else if (lowerToken.includes('robotics') || lowerToken.includes('automation') || lowerToken.includes('control') || lowerToken.includes('plc')) {
          cat = 'Robotics & Automation';
        } else if (lowerToken.includes('cad') || lowerToken.includes('structural') || lowerToken.includes('solidworks') || lowerToken.includes('autocad')) {
          cat = 'Core Engineering';
        } else if (lowerToken.includes('python') || lowerToken.includes('java') || lowerToken.includes('c++') || lowerToken.includes('sql')) {
          cat = 'Programming Languages';
        }

        addSkill(token, cat, `Technical Skills: ${segment}`, 'Advanced');
      }
    }
  }

  // --------------------------------------------------------------------------
  // 2. ONLY IF ZERO SKILLS FOUND ABOVE: SCAN FOR DEFINITIVE TECHNICAL TOOLS
  // --------------------------------------------------------------------------
  if (detectedSkills.length === 0) {
    const lowerText = text.toLowerCase();
    const technicalToolsCatalog = [
      { name: 'CAD', category: 'Core Engineering', aliases: ['cad', 'autocad', 'solidworks', 'catia', 'creo'] },
      { name: 'Structural Analysis', category: 'Core Engineering', aliases: ['structural analysis', 'fea', 'ansys'] },
      { name: 'Robotics and Automation', category: 'Robotics & Automation', aliases: ['robotics and automation', 'robotics', 'automation'] },
      { name: 'Project Management', category: 'Project & Product Management', aliases: ['project management', 'strategic project management'] },
      { name: 'Python', category: 'Programming Languages', aliases: ['python', 'django', 'fastapi'] },
      { name: 'Java', category: 'Programming Languages', aliases: ['java', 'spring boot'] },
      { name: 'C++', category: 'Programming Languages', aliases: ['c++', 'cpp'] },
      { name: 'SQL', category: 'Databases', aliases: ['sql', 'postgresql', 'mysql'] },
      { name: 'Docker', category: 'DevOps & Cloud', aliases: ['docker', 'kubernetes'] },
      { name: 'AWS', category: 'DevOps & Cloud', aliases: ['aws', 'amazon web services'] },
    ];

    for (const item of technicalToolsCatalog) {
      const matched = item.aliases.find((alias) => {
        const regex = new RegExp(`(?:^|[\\s,;:.•(])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[\\s,;:.•)])`, 'i');
        return regex.test(lowerText);
      });

      if (matched) {
        addSkill(item.name, item.category, `Identified "${item.name}" in resume`);
      }
    }
  }

  return {
    skills: detectedSkills,
    summary: detectedSkills.length > 0
      ? `Extracted ${detectedSkills.length} technical skills: ${detectedSkills.map((s) => s.skill_name).join(', ')}.`
      : 'No skills could be extracted.',
    experience_years: 5,
    domain: detectedSkills.some((s) => s.category === 'Core Engineering' || s.category === 'Robotics & Automation')
      ? 'Mechanical & Engineering Technology'
      : 'Software & Technology',
  };
}

function fallbackManualSkillsNormalizer(skills: string[]): ResumeAnalysisResult {
  const categoryMap: Record<string, string> = {
    cad: 'Core Engineering',
    autocad: 'Core Engineering',
    solidworks: 'Core Engineering',
    structural: 'Core Engineering',
    robotics: 'Robotics & Automation',
    automation: 'Robotics & Automation',
    project: 'Project & Product Management',
    management: 'Project & Product Management',
    python: 'Programming Languages',
    java: 'Programming Languages',
    'c++': 'Programming Languages',
    sql: 'Databases',
    aws: 'DevOps & Cloud',
    docker: 'DevOps & Cloud',
  };

  const normalized: Omit<SkillItem, 'id' | 'user_id' | 'created_at'>[] = skills
    .filter((s) => isValidSkillName(s))
    .map((name) => {
      const cleanName = name.trim();
      const lower = cleanName.toLowerCase();
      let cat = 'Core Engineering';

      for (const [key, val] of Object.entries(categoryMap)) {
        if (lower.includes(key)) {
          cat = val;
          break;
        }
      }

      return {
        skill_name: cleanName,
        category: cat,
        proficiency: 'Intermediate',
        confidence: 1.0,
        evidence: 'Candidate declared skill',
        source: 'manual',
      };
    });

  return {
    skills: normalized,
    summary: `Structured ${normalized.length} declared technical proficiencies.`,
    domain: 'Technical Skills Profile',
  };
}
