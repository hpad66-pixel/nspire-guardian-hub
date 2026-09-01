import { describe, expect, it } from 'vitest';
import {
  AC_EDUCATION_SCRIPT,
  HVAC_EDUCATION_ENTRIES,
  LEASING_EDUCATION_ENTRIES,
  LEASING_EDUCATION_SCRIPT,
  LIVE_OPERATOR_EDUCATION_ENTRIES,
  LIVE_OPERATOR_PHONE,
  LIVE_OPERATOR_SCRIPT,
  RESIDENT_EDUCATION_ENTRIES,
  formatResidentEducationForAgent,
  toKnowledgeBaseJson,
} from '../residentEducation';

describe('residentEducation', () => {
  it('covers filter responsibility, window/door checks, and mold education', () => {
    const blob = HVAC_EDUCATION_ENTRIES.map((e) => `${e.question} ${e.answer}`).join(' ');
    expect(blob.toLowerCase()).toMatch(/filter/);
    expect(blob.toLowerCase()).toMatch(/resident/);
    expect(blob.toLowerCase()).toMatch(/window/);
    expect(blob.toLowerCase()).toMatch(/front door/);
    expect(blob.toLowerCase()).toMatch(/humidity|damp/);
    expect(blob.toLowerCase()).toMatch(/mold/);
  });

  it('covers vacancy / leasing intake and leasing email', () => {
    const blob = LEASING_EDUCATION_ENTRIES.map((e) => `${e.question} ${e.answer}`).join(' ');
    expect(blob.toLowerCase()).toMatch(/vacanc|rent|unit available|interested/);
    expect(blob.toLowerCase()).toMatch(/glorieta gardens/);
    expect(blob.toLowerCase()).toMatch(/leasing@glorietagardens\.com/);
    expect(blob.toLowerCase()).toMatch(/bedroom/);
    expect(blob.toLowerCase()).toMatch(/bath/);
    expect(blob.toLowerCase()).toMatch(/move in|move-in/);
    expect(blob.toLowerCase()).toMatch(/do not create a maintenance/);
  });

  it('covers live-operator escalate to 954-243-1238', () => {
    const blob = LIVE_OPERATOR_EDUCATION_ENTRIES.map((e) => `${e.question} ${e.answer}`).join(' ');
    expect(blob).toContain(LIVE_OPERATOR_PHONE);
    expect(blob.toLowerCase()).toMatch(/unhappy|frustrated|human|real person|manager/);
    expect(LIVE_OPERATOR_SCRIPT).toContain(LIVE_OPERATOR_PHONE);
  });

  it('formats a contextual update the voice agent can use on calls', () => {
    const text = formatResidentEducationForAgent();
    expect(text).toContain('Resident & prospect education knowledge');
    expect(text).toContain(RESIDENT_EDUCATION_ENTRIES[0].question);
    expect(text).toContain(AC_EDUCATION_SCRIPT.split('.')[0]);
    expect(text).toContain(LEASING_EDUCATION_SCRIPT.split('.')[0]);
    expect(text).toContain(LIVE_OPERATOR_SCRIPT.split('.')[0]);
    expect(text.toLowerCase()).toContain('never lecture');
    expect(text.toLowerCase()).toContain('leasing@glorietagardens.com');
    expect(text).toContain(LIVE_OPERATOR_PHONE);
  });

  it('maps to voice_agent_config knowledge_base shape including leasing + operator', () => {
    const json = toKnowledgeBaseJson();
    expect(json).toHaveLength(RESIDENT_EDUCATION_ENTRIES.length);
    expect(json[0]).toMatchObject({
      question: expect.any(String),
      answer: expect.any(String),
      id: 'filter-responsibility',
    });
    expect(json.some((e) => e.id === 'vacancy-inquiry')).toBe(true);
    expect(json.some((e) => e.id === 'leasing-contact')).toBe(true);
    expect(json.some((e) => e.id === 'live-operator-escalate')).toBe(true);
  });
});
