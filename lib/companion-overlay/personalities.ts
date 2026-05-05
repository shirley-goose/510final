export type CompanionPersonality = 'active' | 'calm' | 'playful';

export function parseCompanionPersonality(raw: unknown): CompanionPersonality {
  if (raw === 'active' || raw === 'calm' || raw === 'playful') return raw;
  return 'calm';
}
