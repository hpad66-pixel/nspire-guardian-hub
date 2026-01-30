import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useInspectionStats() {
  return useQuery({
    queryKey: ['inspections', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inspections')
        .select('status, area, completed_at, inspection_date');
      
      if (error) throw error;
      
      const completed = data.filter(i => i.status === 'completed').length;
      const inProgress = data.filter(i => i.status === 'in_progress').length;
      const scheduled = data.filter(i => i.status === 'scheduled').length;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const overdue = data.filter(i => {
        if (i.status === 'completed') return false;
        const inspDate = new Date(i.inspection_date);
        inspDate.setHours(0, 0, 0, 0);
        return inspDate < today;
      }).length;
      
      // By area
      const outside = data.filter(i => i.area === 'outside');
      const inside = data.filter(i => i.area === 'inside');
      const unit = data.filter(i => i.area === 'unit');
      
      const outsideCompleted = outside.filter(i => i.status === 'completed').length;
      const insideCompleted = inside.filter(i => i.status === 'completed').length;
      const unitCompleted = unit.filter(i => i.status === 'completed').length;
      
      return {
        total: data.length,
        completed,
        inProgress,
        scheduled,
        overdue,
        byArea: {
          outside: { total: outside.length, completed: outsideCompleted },
          inside: { total: inside.length, completed: insideCompleted },
          unit: { total: unit.length, completed: unitCompleted },
        },
      };
    },
  });
}

export function useAnnualInspectionProgress() {
  return useQuery({
    queryKey: ['inspections', 'annual-progress'],
    queryFn: async () => {
      // Get current year's start
      const yearStart = new Date();
      yearStart.setMonth(0, 1);
      yearStart.setHours(0, 0, 0, 0);
      
      // Get total units count
      const { data: units, error: unitsError } = await supabase
        .from('units')
        .select('id');
      
      if (unitsError) throw unitsError;
      
      // Get total properties count  
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('id')
        .eq('nspire_enabled', true);
      
      if (propertiesError) throw propertiesError;
      
      // Get this year's completed unit inspections
      const { data: unitInspections, error: unitError } = await supabase
        .from('inspections')
        .select('unit_id')
        .eq('area', 'unit')
        .eq('status', 'completed')
        .gte('completed_at', yearStart.toISOString());
      
      if (unitError) throw unitError;
      
      // Get unique units inspected
      const uniqueUnitsInspected = new Set(unitInspections.map(i => i.unit_id).filter(Boolean)).size;
      
      // Get completed outside inspections (per property)
      const { data: outsideInspections, error: outsideError } = await supabase
        .from('inspections')
        .select('property_id')
        .eq('area', 'outside')
        .eq('status', 'completed')
        .gte('completed_at', yearStart.toISOString());
      
      if (outsideError) throw outsideError;
      
      const uniquePropertiesOutside = new Set(outsideInspections.map(i => i.property_id)).size;
      
      // Get completed inside inspections (per property)
      const { data: insideInspections, error: insideError } = await supabase
        .from('inspections')
        .select('property_id')
        .eq('area', 'inside')
        .eq('status', 'completed')
        .gte('completed_at', yearStart.toISOString());
      
      if (insideError) throw insideError;
      
      const uniquePropertiesInside = new Set(insideInspections.map(i => i.property_id)).size;
      
      const totalUnits = units.length;
      const totalProperties = properties.length;
      
      return {
        units: {
          total: totalUnits,
          completed: uniqueUnitsInspected,
          percentage: totalUnits > 0 ? Math.round((uniqueUnitsInspected / totalUnits) * 100) : 0,
        },
        outside: {
          total: totalProperties,
          completed: uniquePropertiesOutside,
          percentage: totalProperties > 0 ? Math.round((uniquePropertiesOutside / totalProperties) * 100) : 0,
        },
        inside: {
          total: totalProperties,
          completed: uniquePropertiesInside,
          percentage: totalProperties > 0 ? Math.round((uniquePropertiesInside / totalProperties) * 100) : 0,
        },
        overall: {
          percentage: totalUnits > 0 ? Math.round((uniqueUnitsInspected / totalUnits) * 100) : 0,
        },
      };
    },
  });
}
