import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { ModuleConfig } from '@/types/modules';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserPermissions } from '@/hooks/usePermissions';

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
  credentialWalletEnabled: false,
  trainingHubEnabled: false,
  safetyModuleEnabled: false,
  equipmentTrackerEnabled: false,
  clientPortalEnabled: false,
};

// Map from ModuleConfig keys to database column names
const moduleColumnMap: Record<string, string> = {
  nspireEnabled: 'nspire_enabled',
  dailyGroundsEnabled: 'daily_grounds_enabled',
  projectsEnabled: 'projects_enabled',
  occupancyEnabled: 'occupancy_enabled',
  qrScanningEnabled: 'qr_scanning_enabled',
};

const ModuleContext = createContext<ModuleContextType | undefined>(undefined);

export function ModuleProvider({ children }: { children: ReactNode }) {
  const [tenantModules, setTenantModules] = useState<ModuleConfig>(defaultModules);
  const [userModuleOverrides, setUserModuleOverrides] = useState<Record<keyof ModuleConfig, boolean | null>>({
    nspireEnabled: null,
    dailyGroundsEnabled: null,
    projectsEnabled: null,
    occupancyEnabled: null,
    emailInboxEnabled: null,
    qrScanningEnabled: null,
    credentialWalletEnabled: null,
    trainingHubEnabled: null,
    safetyModuleEnabled: null,
    equipmentTrackerEnabled: null,
    clientPortalEnabled: null,
  });
  const [userRole, setUserRole] = useState<ModuleContextType['userRole']>('tenant_admin');
  const [isLoading, setIsLoading] = useState(true);
  const { isAdmin } = useUserPermissions();

  // Load module settings from properties + workspace_modules on app start
  const loadModulesFromProperties = async () => {
    try {
      const [{ data: properties, error: propError }, { data: wsModules, error: wsError }] = await Promise.all([
        supabase
          .from('properties')
          .select('nspire_enabled, daily_grounds_enabled, projects_enabled, occupancy_enabled, qr_scanning_enabled'),
        supabase
          .from('workspace_modules')
          .select('*')
          .limit(1)
          .maybeSingle(),
      ]);

      if (propError) throw propError;
      if (wsError) throw wsError;

      const ws = wsModules as any;

      // For workspace-level modules:
      // effective = platform gate AND workspace admin toggle (defaults to true if no row yet)
      const wsEnabled = (platformField: string, wsField: string): boolean => {
        if (!ws) return true; // no row yet → show as enabled (dev / first-run mode)
        // Default both platform gate and workspace toggle to true if null/undefined
        const platformOn = ws[platformField] !== false;
        const wsOn = ws[wsField] !== false;
        return platformOn && wsOn;
      };

      // Module is enabled if ANY property has it enabled
      const tenant: ModuleConfig = {
        nspireEnabled: properties?.some(p => p.nspire_enabled) || false,
        dailyGroundsEnabled: properties?.some(p => p.daily_grounds_enabled) || false,
        projectsEnabled: properties?.some(p => p.projects_enabled) || false,
        occupancyEnabled: wsEnabled('platform_occupancy', 'occupancy_enabled'),
        emailInboxEnabled: wsEnabled('platform_email_inbox', 'email_inbox_enabled'),
        qrScanningEnabled: wsEnabled('platform_qr_scanning', 'qr_scanning_enabled'),
        credentialWalletEnabled: wsEnabled('platform_credential_wallet', 'credential_wallet_enabled'),
        trainingHubEnabled: wsEnabled('platform_training_hub', 'training_hub_enabled'),
        safetyModuleEnabled: wsEnabled('platform_safety_module', 'safety_module_enabled'),
        equipmentTrackerEnabled: wsEnabled('platform_equipment_tracker', 'equipment_tracker_enabled'),
        clientPortalEnabled: wsEnabled('platform_client_portal', 'client_portal_enabled'),
      };

      setTenantModules(tenant);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserModuleOverrides({
          nspireEnabled: null,
          dailyGroundsEnabled: null,
          projectsEnabled: null,
          occupancyEnabled: null,
          emailInboxEnabled: null,
          qrScanningEnabled: null,
          credentialWalletEnabled: null,
          trainingHubEnabled: null,
          safetyModuleEnabled: null,
          equipmentTrackerEnabled: null,
          clientPortalEnabled: null,
        });
        return;
      }

      const { data: overrides, error: overridesError } = await supabase
        .from('user_module_access')
        .select('module_key, enabled')
        .eq('user_id', user.id);

      if (overridesError) throw overridesError;

      const overrideMap: Record<keyof ModuleConfig, boolean | null> = {
        nspireEnabled: null,
        dailyGroundsEnabled: null,
        projectsEnabled: null,
        occupancyEnabled: null,
        emailInboxEnabled: null,
        qrScanningEnabled: null,
        credentialWalletEnabled: null,
        trainingHubEnabled: null,
        safetyModuleEnabled: null,
        equipmentTrackerEnabled: null,
        clientPortalEnabled: null,
      };

      (overrides || []).forEach((row) => {
        const key = row.module_key as keyof ModuleConfig;
        if (key in overrideMap) {
          overrideMap[key] = row.enabled;
        }
      });

      setUserModuleOverrides(overrideMap);
    } catch (error) {
      console.error('Failed to load module settings:', error);
      // Fall back to defaults on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadModulesFromProperties();
  }, [isAdmin]);

  // Toggle module tenant-wide (updates all properties)
  const toggleModule = async (module: keyof ModuleConfig) => {
    const columnName = moduleColumnMap[module];
    
    if (!columnName) {
      // For future modules not in DB, just toggle locally
      setTenantModules(prev => ({ ...prev, [module]: !prev[module] }));
      return;
    }

    const newValue = !tenantModules[module];

    try {
      const { error } = await supabase
        .from('properties')
        .update({ [columnName]: newValue })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all properties

      if (error) throw error;

      setTenantModules(prev => ({ ...prev, [module]: newValue }));
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

  const effectiveModules = useMemo(() => {
    if (isAdmin) return tenantModules;

    return (Object.keys(tenantModules) as (keyof ModuleConfig)[]).reduce((acc, key) => {
      const override = userModuleOverrides[key];
      acc[key] = tenantModules[key] && (override ?? true);
      return acc;
    }, {} as ModuleConfig);
  }, [tenantModules, userModuleOverrides, isAdmin]);

  const isModuleEnabled = (module: keyof ModuleConfig) => {
    return effectiveModules[module];
  };

  return (
    <ModuleContext.Provider 
      value={{ 
        modules: effectiveModules, 
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
