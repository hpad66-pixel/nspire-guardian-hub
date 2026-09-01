import { describe, expect, it } from 'vitest';
import {
  AC_EDUCATION_SCRIPT,
  RESIDENT_EDUCATION_ENTRIES,
  formatResidentEducationForAgent,
  toKnowledgeBaseJson,
} from '../residentEducation';

describe('residentEducation', () => {
  it('covers filter responsibility, window/door checks, and mold education', () => {
    const blob = RESIDENT_EDUCATION_ENTRIES.map((e) => `${e.question} ${e.answer}`).join(' ');
    expect(blob.toLowerCase()).toMatch(/filter/);
    expect(blob.toLowerCase()).toMatch(/resident/);
    expect(blob.toLowerCase()).toMatch(/window/);
    expect(blob.toLowerCase()).toMatch(/front door/);
    expect(blob.toLowerCase()).toMatch(/humidity|damp/);
    expect(blob.toLowerCase()).toMatch(/mold/);
  });

  it('formats a contextual update the voice agent can use on calls', () => {
    const text = formatResidentEducationForAgent();
    expect(text).toContain('Resident education knowledge');
    expect(text).toContain(RESIDENT_EDUCATION_ENTRIES[0].question);
    expect(text).toContain(AC_EDUCATION_SCRIPT.split('.')[0]);
    expect(text.toLowerCase()).toContain('never lecture');
  });

  it('maps to voice_agent_config knowledge_base shape', () => {
    const json = toKnowledgeBaseJson();
    expect(json).toHaveLength(RESIDENT_EDUCATION_ENTRIES.length);
    expect(json[0]).toMatchObject({
      question: expect.any(String),
      answer: expect.any(String),
      id: 'filter-responsibility',
    });
  });
});
