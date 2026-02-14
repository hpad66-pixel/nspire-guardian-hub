import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  calculatePropertyScore,
  calculateUnitPerformanceScore,
  getHudSampleSize,
  type DefectForScoring,
  type ScoreBreakdown,
} from '@/lib/nspire-scoring';
import { getDefectCatalog } from '@/data/nspire-catalog';

/**
 * Hook to get the HUD sample size for a property based on its unit count.
 */
export function useSampleSize(propertyId: string | null) {
  return useQuery({
    queryKey: ['nspire', 'sample-size', propertyId],
    queryFn: async () => {
      if (!propertyId) return 1;
      const { data, error } = await supabase
        .from('units')
        .select('id')
        .eq('property_id', propertyId);
      if (error) throw error;
      return getHudSampleSize(data.length);
    },
    enabled: !!propertyId,
  });
}

/**
 * Hook to compute the NSPIRE property score for a given property.
 * Fetches all open (unrepaired) defects from inspections on this property
 * and runs the scoring engine.
 */
export function usePropertyScore(propertyId: string | null) {
  return useQuery<ScoreBreakdown | null>({
    queryKey: ['nspire', 'property-score', propertyId],
    queryFn: async () => {
      if (!propertyId) return null;

      // Get unit count for sample size
      const { data: units, error: unitsError } = await supabase
        .from('units')
        .select('id')
        .eq('property_id', propertyId);
      if (unitsError) throw unitsError;

      const sampleSize = getHudSampleSize(units.length);

      // Get all open defects for this property's inspections
      const { data: defects, error: defectsError } = await supabase
        .from('defects')
        .select(`
          id,
          nspire_item_id,
          category,
          severity,
          life_threatening,
          point_value,
          inspection:inspections!inner(
            property_id,
            area,
            unit_id
          )
        `)
        .is('repaired_at', null);

      if (defectsError) throw defectsError;

      // Filter to this property and map to scoring format
      const catalog = getDefectCatalog();
      const propertyDefects: DefectForScoring[] = (defects as any[])
        .filter((d: any) => d.inspection?.property_id === propertyId)
        .map((d: any) => {
          const catalogItem = catalog.find((c) => c.id === d.nspire_item_id);
          return {
            id: d.id,
            nspireItemId: d.nspire_item_id,
            category: d.category,
            severity: d.severity,
            lifeThreatening: d.life_threatening ?? false,
            area: d.inspection.area,
            unitId: d.inspection.unit_id,
            isUnscored: catalogItem?.isUnscored ?? false,
            pointValue: d.point_value,
          };
        });

      return calculatePropertyScore(propertyDefects, sampleSize);
    },
    enabled: !!propertyId,
  });
}

/**
 * Hook to compute the Unit Performance Score for a property.
 */
export function useUnitPerformanceScore(propertyId: string | null) {
  return useQuery({
    queryKey: ['nspire', 'ups', propertyId],
    queryFn: async () => {
      if (!propertyId) return { score: 0, isAutoFail: false };

      const { data: units, error: unitsError } = await supabase
        .from('units')
        .select('id')
        .eq('property_id', propertyId);
      if (unitsError) throw unitsError;

      const sampleSize = getHudSampleSize(units.length);

      const { data: defects, error: defectsError } = await supabase
        .from('defects')
        .select(`
          id,
          nspire_item_id,
          category,
          severity,
          life_threatening,
          point_value,
          inspection:inspections!inner(
            property_id,
            area,
            unit_id
          )
        `)
        .is('repaired_at', null);

      if (defectsError) throw defectsError;

      const catalog = getDefectCatalog();
      const propertyDefects: DefectForScoring[] = (defects as any[])
        .filter((d: any) => d.inspection?.property_id === propertyId)
        .map((d: any) => {
          const catalogItem = catalog.find((c) => c.id === d.nspire_item_id);
          return {
            id: d.id,
            nspireItemId: d.nspire_item_id,
            category: d.category,
            severity: d.severity,
            lifeThreatening: d.life_threatening ?? false,
            area: d.inspection.area,
            unitId: d.inspection.unit_id,
            isUnscored: catalogItem?.isUnscored ?? false,
            pointValue: d.point_value,
          };
        });

      return calculateUnitPerformanceScore(propertyDefects, sampleSize);
    },
    enabled: !!propertyId,
  });
}
