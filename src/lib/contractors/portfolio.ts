import type { ContractorCase, ContractorPortalLink } from '@/hooks/useContractorReadiness';

export interface ContractorPortfolioCompany {
  organizationId: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  trades: string[];
  cases: ContractorCase[];
  primaryCase: ContractorCase;
  averageScore: number;
  readyScopes: number;
  needsAttention: boolean;
  latestPortal: ContractorPortalLink | null;
}

const ATTENTION_STATUSES = new Set(['blocked', 'correction_needed', 'suspended', 'rejected']);

export function buildContractorPortfolio(
  cases: ContractorCase[],
  links: ContractorPortalLink[] = [],
): ContractorPortfolioCompany[] {
  const byOrganization = new Map<string, ContractorCase[]>();
  for (const item of cases) {
    const group = byOrganization.get(item.organization_id) ?? [];
    group.push(item);
    byOrganization.set(item.organization_id, group);
  }

  return [...byOrganization.entries()].map(([organizationId, groupedCases]) => {
    const sortedCases = [...groupedCases].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
    const primaryCase = sortedCases[0];
    const trades = [...new Set(sortedCases.flatMap((item) => item.profile?.trade_categories ?? []))].sort();
    const latestPortal = links.find((link) => sortedCases.some((item) => item.id === link.case_id)) ?? null;
    return {
      organizationId,
      name: primaryCase.organization?.name ?? 'Contractor',
      email: primaryCase.organization?.email ?? null,
      phone: primaryCase.organization?.phone ?? null,
      website: primaryCase.organization?.website ?? null,
      trades,
      cases: sortedCases,
      primaryCase,
      averageScore: Math.round(sortedCases.reduce((sum, item) => sum + Number(item.score), 0) / sortedCases.length),
      readyScopes: sortedCases.filter((item) => item.work_ready && item.contract_ready && item.payment_ready).length,
      needsAttention: sortedCases.some((item) => ATTENTION_STATUSES.has(item.status)),
      latestPortal,
    };
  }).sort((a, b) => {
    if (a.needsAttention !== b.needsAttention) return a.needsAttention ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
