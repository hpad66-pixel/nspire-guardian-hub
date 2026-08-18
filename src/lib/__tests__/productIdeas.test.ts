import { describe, expect, it } from 'vitest';
import {
  isProductIdeaRoadmapStatus,
  productIdeaProgressIndex,
  productIdeaScore,
} from '@/lib/productIdeas';

describe('product ideas helpers', () => {
  it('uses net community support as the score', () => {
    expect(productIdeaScore(14, 3)).toBe(11);
  });

  it('maps planned work to the escalated milestone until development starts', () => {
    expect(productIdeaProgressIndex('planned')).toBe(2);
    expect(productIdeaProgressIndex('in_progress')).toBe(3);
    expect(productIdeaProgressIndex('shipped')).toBe(4);
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
