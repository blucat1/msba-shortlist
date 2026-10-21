/** Exact aliases: a short skill such as R never matches arbitrary substrings. */
export function canonicalSkill(skill: string): string {
  const key = skill.trim().toLowerCase().replace(/\s+/g, ' ');
  const aliases: Record<string, string> = {
    postgres: 'sql', postgresql: 'sql', mysql: 'sql', powerbi: 'power bi',
    'a/b testing': 'experimentation', 'a/b tests': 'experimentation', 'ab testing': 'experimentation',
    'statistical analysis': 'statistics', 'amazon web services': 'aws', pyspark: 'spark',
  };
  return aliases[key] ?? key;
}
