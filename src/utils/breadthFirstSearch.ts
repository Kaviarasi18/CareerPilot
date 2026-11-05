import type { SkillItem } from '../types';

const skillPrerequisites: Array<[string, string]> = [
  ['html', 'css'],
  ['css', 'javascript'],
  ['javascript', 'react'],
  ['javascript', 'node.js'],
  ['python', 'data structures and algorithms'],
  ['data structures and algorithms', 'machine learning'],
  ['sql', 'database design'],
  ['linux', 'docker'],
  ['docker', 'kubernetes'],
];

const skillAliases: Record<string, string> = {
  'c++': 'cpp',
  'data structures & algorithms': 'data structures and algorithms',
  dsa: 'data structures and algorithms',
  js: 'javascript',
  'react.js': 'react',
  ml: 'machine learning',
  'database management systems': 'database design',
  dbms: 'database design',
  'node js': 'node.js',
};

function normalizeSkillName(skillName: string): string {
  const normalized = skillName.trim().toLowerCase().replace(/\s+/g, ' ');
  return skillAliases[normalized] || normalized;
}

export function orderSkillsByPrerequisites(skills: string[]): string[];
export function orderSkillsByPrerequisites<T extends { skill_name: string }>(skills: T[]): T[];
export function orderSkillsByPrerequisites(
  skills: string[] | SkillItem[]
): string[] | SkillItem[];
export function orderSkillsByPrerequisites<T extends string | { skill_name: string }>(skills: T[]): T[] {
  if (skills.length < 2) return [...skills];

  const names = skills.map((skill) => (typeof skill === 'string' ? skill : skill.skill_name));
  const indexes = skills.map((_, index) => index);
  const graph = new Map<number, number[]>(indexes.map((index) => [index, []]));
  const incomingEdges = new Map<number, number>(indexes.map((index) => [index, 0]));
  const indexByCanonicalName = new Map<string, number>();

  for (const [index, name] of names.entries()) {
    const canonicalName = normalizeSkillName(name);
    if (!indexByCanonicalName.has(canonicalName)) indexByCanonicalName.set(canonicalName, index);
  }

  for (const [prerequisite, advancedSkill] of skillPrerequisites) {
    const prerequisiteIndex = indexByCanonicalName.get(prerequisite);
    const advancedIndex = indexByCanonicalName.get(advancedSkill);
    if (prerequisiteIndex === undefined || advancedIndex === undefined || prerequisiteIndex === advancedIndex) continue;

    graph.get(prerequisiteIndex)!.push(advancedIndex);
    incomingEdges.set(advancedIndex, incomingEdges.get(advancedIndex)! + 1);
  }

  const visited = new Set<number>();
  const orderedIndexes: number[] = [];
  const queue = indexes.filter((index) => incomingEdges.get(index) === 0);
  for (const root of queue) visited.add(root);
  let queueIndex = 0;

  while (queueIndex < queue.length) {
    const current = queue[queueIndex];
    queueIndex += 1;
    orderedIndexes.push(current);

    for (const neighbor of graph.get(current) || []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  for (const start of indexes) {
    if (visited.has(start)) continue;
    visited.add(start);
    queue.push(start);
    while (queueIndex < queue.length) {
      const current = queue[queueIndex];
      queueIndex += 1;
      orderedIndexes.push(current);
      for (const neighbor of graph.get(current) || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
  }

  return orderedIndexes.map((index) => skills[index]);
}
