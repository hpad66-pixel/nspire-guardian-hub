import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ModuleConfig } from '@/types/modules';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ModuleContextType {
  modules: ModuleConfig;
  toggleModule: (module: keyof ModuleConfig) => Promise<void>;
  isModuleEnabled: (module: keyof ModuleConfig) => boolean;
  updatePropertyModule: (propertyId: string, module: keyof ModuleConfig, enabled: boolean) => Promise<void>;
  userRole: 'super_admin' | 'tenant_admin' | 'property_manager' | 'inspector' | 'viewer';
  setUserRole: (role: ModuleContextType['userRole']) => void;
  isLoading: boolean;
  refetchModules: () => Promise<void>;
}

const defaultModules: ModuleConfig = {
  nspireEnabled: false,
  dailyGroundsEnabled: false,
  projectsEnabled: false,
  occupancyEnabled: false,
  emailInboxEnabled: false,
  qrScanningEnabled: false,
};

// Map from ModuleConfig keys to database column names
const moduleColumnMap: Record<string, string> = {
  nspireEnabled: 'nspire_enabled',
  dailyGroundsEnabled: 'daily_grounds_enabled',
  projectsEnabled: 'projects_enabled',
};

const ModuleContext = createContext<ModuleContextType | undefined>(undefined);

export function ModuleProvider({ children }: { children: ReactNode }) {
  const [modules, setModules] = useState<ModuleConfig>(defaultModules);
  const [userRole, setUserRole] = useState<ModuleContextType['userRole']>('tenant_admin');
  const [isLoading, setIsLoading] = useState(true);

  // Load module settings from properties on app start
  const loadModulesFromProperties = async () => {
    try {
      const { data: properties, error } = await supabase
        .from('properties')
        .select('nspire_enabled, daily_grounds_enabled, projects_enabled');

      if (error) throw error;

      // Module is enabled if ANY property has it enabled
      setModules({
        nspireEnabled: properties?.some(p => p.nspire_enabled) || false,
        dailyGroundsEnabled: properties?.some(p => p.daily_grounds_enabled) || false,
        projectsEnabled: properties?.some(p => p.projects_enabled) || false,
        occupancyEnabled: false,
        emailInboxEnabled: false,
        qrScanningEnabled: false,
      });
    } catch (error) {
      console.error('Failed to load module settings:', error);
      // Fall back to defaults on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadModulesFromProperties();
  }, []);

  // Toggle module tenant-wide (updates all properties)
  const toggleModule = async (module: keyof ModuleConfig) => {
    const columnName = moduleColumnMap[module];
    
    if (!columnName) {
      // For future modules not in DB, just toggle locally
      setModules(prev => ({ ...prev, [module]: !prev[module] }));
      return;
    }

    const newValue = !modules[module];

    try {
      const { error } = await supabase
        .from('properties')
        .update({ [columnName]: newValue })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all properties

      if (error) throw error;

      setModules(prev => ({ ...prev, [module]: newValue }));
      toast.success(`${module.replace('Enabled', '')} module ${newValue ? 'enabled' : 'disabled'} for all properties`);
    } catch (error) {
      console.error('Failed to toggle module:', error);
      toast.error('Failed to update module settings');
    }
  };

  // Update module for a specific property
  const updatePropertyModule = async (propertyId: string, module: keyof ModuleConfig, enabled: boolean) => {
    const columnName = moduleColumnMap[module];
    
    if (!columnName) {
      console.warn('Module not persisted to database:', module);
      return;
    }

    try {
      const { error } = await supabase
        .from('properties')
        .update({ [columnName]: enabled })
        .eq('id', propertyId);

      if (error) throw error;

      // Refetch modules to update global state
      await loadModulesFromProperties();
    } catch (error) {
      console.error('Failed to update property module:', error);
      toast.error('Failed to update property module');
      throw error;
    }
  };

  const isModuleEnabled = (module: keyof ModuleConfig) => {
    return modules[module];
  };

  return (
    <ModuleContext.Provider 
      value={{ 
        modules, 
        toggleModule, 
        isModuleEnabled, 
        updatePropertyModule,
        userRole, 
        setUserRole,
        isLoading,
        refetchModules: loadModulesFromProperties,
      }}
    >
      {children}
    </ModuleContext.Provider>
  );
}

export function useModules() {
  const context = useContext(ModuleContext);
  if (!context) {
    throw new Error('useModules must be used within a ModuleProvider');
  }
  return context;
}
