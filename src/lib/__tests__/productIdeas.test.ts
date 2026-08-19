import { describe, expect, it } from 'vitest';
import {
  PRODUCT_IDEA_PROGRESS,
  PRODUCT_IDEA_STATUS_META,
  compareProductIdeaCompletion,
  isProductIdeaRoadmapStatus,
  productIdeaProgressIndex,
  productIdeaScore,
} from '@/lib/productIdeas';

describe('product ideas helpers', () => {
  it('uses net community support as the score', () => {
    expect(productIdeaScore(14, 3)).toBe(11);
  });

  it('places executed ideas ahead of every active status', () => {
    expect(compareProductIdeaCompletion('shipped', 'in_progress')).toBeLessThan(0);
    expect(compareProductIdeaCompletion('submitted', 'shipped')).toBeGreaterThan(0);
    expect(compareProductIdeaCompletion('shipped', 'shipped')).toBe(0);
    expect(compareProductIdeaCompletion('planned', 'submitted')).toBe(0);
  });

  it('gives planned work and execution their own visible milestones', () => {
    expect(PRODUCT_IDEA_PROGRESS.map((stage) => stage.key)).toEqual([
      'submitted',
      'under_review',
      'escalated',
      'planned',
      'in_progress',
      'shipped',
    ]);
    expect(productIdeaProgressIndex('planned')).toBe(3);
    expect(productIdeaProgressIndex('in_progress')).toBe(4);
    expect(productIdeaProgressIndex('shipped')).toBe(5);
    expect(PRODUCT_IDEA_STATUS_META.shipped.label).toBe('Executed');
  });

  it('keeps declined ideas anchored at the review decision', () => {
    expect(productIdeaProgressIndex('rejected')).toBe(1);
  });

  it('identifies statuses visible in the roadmap view', () => {
    expect(isProductIdeaRoadmapStatus('escalated')).toBe(true);
    expect(isProductIdeaRoadmapStatus('planned')).toBe(true);
    expect(isProductIdeaRoadmapStatus('in_progress')).toBe(true);
    expect(isProductIdeaRoadmapStatus('submitted')).toBe(false);
    expect(isProductIdeaRoadmapStatus('shipped')).toBe(false);
  });
});
