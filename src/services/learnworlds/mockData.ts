import type { LWCourse, LWUserProgress, LWCertificate } from './learnworldsTypes';

// ─────────────────────────────────────────────────────────────────────────────
// Realistic mock courses matching the real LearnWorlds catalog
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_COURSES: LWCourse[] = [
  {
    id: 'lw-course-001',
    title: 'OSHA 10-Hour Construction Safety',
    description:
      'Covers the most common hazards found on construction sites including fall protection, electrical safety, scaffolding, and personal protective equipment. Required for most federal and state contracts.',
    thumbnailUrl: null,
    category: 'safety',
    durationMinutes: 600,
    difficulty: 'beginner',
    tags: ['osha', 'construction', 'safety', 'certification'],
    lwUrl: 'https://your-school.learnworlds.com/course/osha-10-construction',
  },
  {
    id: 'lw-course-002',
    title: 'Sexual Harassment Prevention (California)',
    description:
      'California AB 1825 and SB 1343 compliant training covering recognition, prevention, reporting, and bystander intervention for all employees and supervisors.',
    thumbnailUrl: null,
    category: 'compliance',
    durationMinutes: 120,
    difficulty: 'beginner',
    tags: ['hr', 'compliance', 'california', 'mandatory'],
    lwUrl: 'https://your-school.learnworlds.com/course/harassment-prevention-ca',
  },
  {
    id: 'lw-course-003',
    title: 'Lead Renovator Certification (RRP)',
    description:
      'EPA-accredited Renovation, Repair and Painting (RRP) course for contractors working in pre-1978 housing. Covers lead-safe work practices, recordkeeping, and compliance requirements.',
    thumbnailUrl: null,
    category: 'compliance',
    durationMinutes: 480,
    difficulty: 'intermediate',
    tags: ['epa', 'lead', 'rrp', 'renovation', 'certification'],
    lwUrl: 'https://your-school.learnworlds.com/course/lead-renovator-rrp',
  },
  {
    id: 'lw-course-004',
    title: 'AI Productivity for Professionals',
    description:
      'Practical AI tools for property managers, project managers, and field teams. Covers ChatGPT workflows, document automation, reporting with AI, and smart communication strategies.',
    thumbnailUrl: null,
    category: 'ai_productivity',
    durationMinutes: 90,
    difficulty: 'beginner',
    tags: ['ai', 'productivity', 'chatgpt', 'automation'],
    lwUrl: 'https://your-school.learnworlds.com/course/ai-productivity',
  },
  {
    id: 'lw-course-005',
    title: 'NSPIRE Inspection Standards',
    description:
      'Comprehensive guide to HUD\'s NSPIRE inspection protocol. Learn defect identification, scoring logic, severity classification, life-threatening conditions, and documentation requirements.',
    thumbnailUrl: null,
    category: 'property_management',
    durationMinutes: 180,
    difficulty: 'intermediate',
    tags: ['nspire', 'hud', 'inspection', 'compliance', 'reac'],
    lwUrl: 'https://your-school.learnworlds.com/course/nspire-standards',
  },
  {
    id: 'lw-course-006',
    title: 'Construction Project Management Fundamentals',
    description:
      'Core skills for managing construction and renovation projects: scope management, scheduling, budget tracking, subcontractor coordination, change orders, and closeout procedures.',
    thumbnailUrl: null,
    category: 'construction',
    durationMinutes: 240,
    difficulty: 'intermediate',
    tags: ['project management', 'construction', 'scheduling', 'budget'],
    lwUrl: 'https://your-school.learnworlds.com/course/construction-pm',
  },
  {
    id: 'lw-course-007',
    title: 'Hazmat Transportation (DOT)',
    description:
      'DOT 49 CFR compliant training for employees who transport or handle hazardous materials. Covers classification, packaging, labeling, placarding, documentation, and emergency response.',
    thumbnailUrl: null,
    category: 'safety',
    durationMinutes: 300,
    difficulty: 'advanced',
    tags: ['dot', 'hazmat', 'transportation', 'compliance', 'safety'],
    lwUrl: 'https://your-school.learnworlds.com/course/hazmat-dot',
  },
  {
    id: 'lw-course-008',
    title: 'Property Manager Essentials',
    description:
      'Core competencies for property managers: tenant relations, lease administration, maintenance coordination, fair housing compliance, financial reporting, and vendor management.',
    thumbnailUrl: null,
    category: 'property_management',
    durationMinutes: 150,
    difficulty: 'beginner',
    tags: ['property management', 'fair housing', 'leasing', 'maintenance'],
    lwUrl: 'https://your-school.learnworlds.com/course/pm-essentials',
  },
];

// 3 months ago
const threeMonthsAgo = new Date();
threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

// 1 month ago
const oneMonthAgo = new Date();
oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

// yesterday
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);

export const MOCK_PROGRESS: LWUserProgress[] = [
  {
    courseId: 'lw-course-001',
    status: 'completed',
    progressPercent: 100,
    lastAccessedAt: threeMonthsAgo.toISOString(),
    completedAt: threeMonthsAgo.toISOString(),
  },
  {
    courseId: 'lw-course-002',
    status: 'completed',
    progressPercent: 100,
    lastAccessedAt: oneMonthAgo.toISOString(),
    completedAt: oneMonthAgo.toISOString(),
  },
  {
    courseId: 'lw-course-004',
    status: 'in_progress',
    progressPercent: 45,
    lastAccessedAt: yesterday.toISOString(),
    completedAt: null,
  },
  {
    courseId: 'lw-course-005',
    status: 'not_started',
    progressPercent: 0,
    lastAccessedAt: null,
    completedAt: null,
  },
];

// Certificate expiry — OSHA cert expires 4 years from issue
const oshaExpiry = new Date(threeMonthsAgo);
oshaExpiry.setFullYear(oshaExpiry.getFullYear() + 4);

// Harassment cert — typically 2 years
const harassmentExpiry = new Date(oneMonthAgo);
harassmentExpiry.setFullYear(harassmentExpiry.getFullYear() + 2);

export const MOCK_CERTIFICATES: LWCertificate[] = [
  {
    courseId: 'lw-course-001',
    courseTitle: 'OSHA 10-Hour Construction Safety',
    issuedAt: threeMonthsAgo.toISOString(),
    expiresAt: oshaExpiry.toISOString(),
    certificateUrl: 'https://your-school.learnworlds.com/certificate/osha-10-mock',
    certificateId: 'CERT-OSHA-2025-001',
  },
  {
    courseId: 'lw-course-002',
    courseTitle: 'Sexual Harassment Prevention (California)',
    issuedAt: oneMonthAgo.toISOString(),
    expiresAt: harassmentExpiry.toISOString(),
    certificateUrl: 'https://your-school.learnworlds.com/certificate/harassment-mock',
    certificateId: 'CERT-SHP-2025-042',
  },
];
