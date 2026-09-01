/**
 * Resident + prospect education knowledge for the Glorieta / APAS voice agent.
 * Kept in-repo so call context, DB seed, and ElevenLabs prompt stay aligned.
 */

export interface ResidentEducationEntry {
  id: string;
  topic: string;
  question: string;
  answer: string;
}

/** Canonical Q&A used by the voice agent for HVAC / AC / filter calls. */
export const HVAC_EDUCATION_ENTRIES: ResidentEducationEntry[] = [
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

/**
 * Vacancy / leasing Q&A for outsiders who call asking about available units.
 * Property name on the phone: Glorieta Gardens. Leasing inbox:
 * leasing@glorietagardens.com
 */
export const LEASING_EDUCATION_ENTRIES: ResidentEducationEntry[] = [
  {
    id: 'vacancy-inquiry',
    topic: 'Vacancies',
    question: 'Do you have a vacancy? / I’m interested in renting.',
    answer:
      'Thank them warmly for their interest in Glorieta Gardens. Share that we pride ourselves on a great community and are happy they are considering our location. You cannot confirm live availability on this line — invite them to email leasing@glorietagardens.com and someone will get back ASAP. Collect: preferred move-in date, number of bedrooms and baths, unit size preference, and any other pertinent information they want to share. Spell the email clearly: L-E-A-S-I-N-G at glorietagardens.com. Do NOT create a maintenance work order for a leasing/vacancy inquiry.',
  },
  {
    id: 'leasing-contact',
    topic: 'Leasing contact',
    question: 'How do I apply / who do I contact about leasing?',
    answer:
      'Please send an email to leasing@glorietagardens.com with your preferred move-in date, bedrooms and baths needed, unit size preference, and any other details that would help our leasing team. Someone will get back to you as soon as possible. Tone: to the point, polite, inviting, and friendly — best-in-class customer service.',
  },
  {
    id: 'leasing-info-to-collect',
    topic: 'Leasing intake',
    question: 'What information should I share for a vacancy inquiry?',
    answer:
      'Please tell us: (1) When would you like to move in? (2) How many bedrooms and baths do you need? (3) Are you looking at a particular unit size? (4) Any other pertinent information you would like to share. Then email that to leasing@glorietagardens.com so our team can follow up quickly.',
  },
];

/**
 * Human-in-the-loop escalate — last resort when a caller is unhappy or asks
 * for a live person. Route verbally to APAS operator line.
 */
export const LIVE_OPERATOR_PHONE = '954-243-1238';
export const LIVE_OPERATOR_PHONE_SPOKEN = '9-5-4, 2-4-3, 1-2-3-8';

export const LIVE_OPERATOR_EDUCATION_ENTRIES: ResidentEducationEntry[] = [
  {
    id: 'live-operator-escalate',
    topic: 'Live operator',
    question: 'I want to speak to a real person / I’m not happy with this.',
    answer: `If the caller is frustrated, upset, asks for a manager/human, or says the AI is not helping: apologize briefly, offer a live operator as a last resort, and give them this number clearly — ${LIVE_OPERATOR_PHONE} (speak it slowly as ${LIVE_OPERATOR_PHONE_SPOKEN}). Invite them to call that number now, or stay on the line while you finish creating their maintenance ticket first if they still need one. Never argue. Keep it warm and short.`,
  },
  {
    id: 'live-operator-when',
    topic: 'Escalate when',
    question: 'When should you escalate to a live operator?',
    answer: `Escalate when the caller (1) asks for a human / manager / real person, (2) sounds angry or says they are unhappy, (3) repeats that the bot is not helping, or (4) has a sensitive situation you cannot resolve. Give ${LIVE_OPERATOR_PHONE}. Still create the maintenance request if they reported a unit issue — unless they only wanted to be transferred and refuse to share details.`,
  },
];

/** Full knowledge set injected into call context + knowledge_base. */
export const RESIDENT_EDUCATION_ENTRIES: ResidentEducationEntry[] = [
  ...HVAC_EDUCATION_ENTRIES,
  ...LEASING_EDUCATION_ENTRIES,
  ...LIVE_OPERATOR_EDUCATION_ENTRIES,
];

/** Compact coaching script the agent can paraphrase on AC calls. */
export const AC_EDUCATION_SCRIPT = [
  'Empathize briefly.',
  'Ask them to confirm windows are secured/shut and the front door is closed.',
  'Remind them filter change-outs are the resident’s responsibility; ask when the filter was last changed.',
  'Politely educate: open doors/windows waste cool air (energy bill) and let in humidity that can cause dampness and potential mold.',
  'If everything is already closed / filter is fresh and it still will not cool, create a maintenance request.',
].join(' ');

/** Compact coaching script for vacancy / leasing calls. */
export const LEASING_EDUCATION_SCRIPT = [
  'Thank them for their interest in Glorieta Gardens.',
  'Say we pride ourselves on a great community and are happy they are considering our location.',
  'Ask when they would like to move in.',
  'Ask how many bedrooms and baths they need.',
  'Ask if they have a unit size in mind.',
  'Invite any other pertinent information.',
  'Direct them to email leasing@glorietagardens.com — someone will get back ASAP.',
  'Spell the email clearly. Do not create a maintenance ticket for leasing calls.',
].join(' ');

/** Last-resort human handoff script. */
export const LIVE_OPERATOR_SCRIPT = [
  'Apologize briefly and acknowledge their frustration.',
  `Offer a live operator and give ${LIVE_OPERATOR_PHONE} (speak ${LIVE_OPERATOR_PHONE_SPOKEN}).`,
  'Invite them to call that number now for a person.',
  'If they still have a maintenance issue, create the ticket before ending when they will share details.',
  'Never argue; stay warm, short, and helpful.',
].join(' ');

export function formatResidentEducationForAgent(
  entries: ResidentEducationEntry[] = RESIDENT_EDUCATION_ENTRIES,
): string {
  const lines = [
    'Resident & prospect education knowledge for this call (use when AC, filters, doors/windows, humidity, mold, vacancies, leasing, “do you have a unit available?”, or the caller is unhappy / wants a human):',
    ...entries.map(
      (e, i) => `${i + 1}. Q: ${e.question}\n   A: ${e.answer}`,
    ),
    `AC call coaching: ${AC_EDUCATION_SCRIPT}`,
    `Vacancy / leasing coaching: ${LEASING_EDUCATION_SCRIPT}`,
    `Live operator (last resort): ${LIVE_OPERATOR_SCRIPT}`,
    'Tone: warm, polite, educational, inviting — never lecture or shame. For leasing callers: thank them, collect needs, send them to leasing@glorietagardens.com. For unhappy callers: escalate to the live operator number.',
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
