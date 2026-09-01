/**
 * Resident education knowledge for the Glorieta / APAS voice agent.
 * Kept in-repo so call context, DB seed, and ElevenLabs prompt stay aligned.
 */

export interface ResidentEducationEntry {
  id: string;
  topic: string;
  question: string;
  answer: string;
}

/** Canonical Q&A used by the voice agent for HVAC / AC / filter calls. */
export const RESIDENT_EDUCATION_ENTRIES: ResidentEducationEntry[] = [
  {
    id: 'filter-responsibility',
    topic: 'Filters',
    question: 'Who is responsible for changing the AC / HVAC filter?',
    answer:
      'Filter change-outs are the resident’s (client’s) responsibility. Keeping a clean filter helps the AC run properly and can prevent many cooling complaints. Maintenance can still check the unit if the problem continues after a fresh filter.',
  },
  {
    id: 'ac-windows-doors',
    topic: 'AC not cooling',
    question: 'My AC is not working / not cooling. What should I check first?',
    answer:
      'Before assuming the system is broken, please check that all windows are closed and properly secured, and that the front door (and any balcony or patio door) is not left open. Cool air escapes when doors or windows stay open, so the AC can feel like it is not working even when it is running.',
  },
  {
    id: 'humidity-mold-education',
    topic: 'Humidity & mold',
    question: 'Why does it matter if I leave the door or windows open with the AC on?',
    answer:
      'Leaving the door or windows open is not only about comfort and the energy bill. Warm humid air comes in, which can create damp conditions in the unit. Over time that dampness is not healthy and can encourage mold growth. Keeping windows secured and the front door closed helps the AC cool properly, saves energy, and helps keep the unit healthy and dry. Please share this politely — never scold; many residents leave doors open without realizing the impact.',
  },
];

/** Compact coaching script the agent can paraphrase on AC calls. */
export const AC_EDUCATION_SCRIPT = [
  'Empathize briefly.',
  'Ask them to confirm windows are secured/shut and the front door is closed.',
  'Remind them filter change-outs are the resident’s responsibility; ask when the filter was last changed.',
  'Politely educate: open doors/windows waste cool air (energy bill) and let in humidity that can cause dampness and potential mold.',
  'If everything is already closed / filter is fresh and it still will not cool, create a maintenance request.',
].join(' ');

export function formatResidentEducationForAgent(
  entries: ResidentEducationEntry[] = RESIDENT_EDUCATION_ENTRIES,
): string {
  const lines = [
    'Resident education knowledge for this call (use when AC, filters, doors/windows, humidity, or mold come up):',
    ...entries.map(
      (e, i) => `${i + 1}. Q: ${e.question}\n   A: ${e.answer}`,
    ),
    `Call coaching: ${AC_EDUCATION_SCRIPT}`,
    'Tone: warm, polite, educational — never lecture or shame the resident.',
  ];
  return lines.join('\n');
}

/** Shape stored in voice_agent_config.knowledge_base (question/answer pairs). */
export function toKnowledgeBaseJson(
  entries: ResidentEducationEntry[] = RESIDENT_EDUCATION_ENTRIES,
): Array<{ question: string; answer: string; topic?: string; id?: string }> {
  return entries.map((e) => ({
    id: e.id,
    topic: e.topic,
    question: e.question,
    answer: e.answer,
  }));
}
