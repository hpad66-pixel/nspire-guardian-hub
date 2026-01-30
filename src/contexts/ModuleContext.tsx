import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ModuleConfig } from '@/types/modules';

interface ModuleContextType {
  modules: ModuleConfig;
  toggleModule: (module: keyof ModuleConfig) => void;
  isModuleEnabled: (module: keyof ModuleConfig) => boolean;
  userRole: 'super_admin' | 'tenant_admin' | 'property_manager' | 'inspector' | 'viewer';
  setUserRole: (role: ModuleContextType['userRole']) => void;
}

const defaultModules: ModuleConfig = {
  nspireEnabled: true, // Default on for demo
  projectsEnabled: true, // Default on for demo
  occupancyEnabled: false,
  emailInboxEnabled: false,
  qrScanningEnabled: false,
};

const ModuleContext = createContext<ModuleContextType | undefined>(undefined);

export function ModuleProvider({ children }: { children: ReactNode }) {
  const [modules, setModules] = useState<ModuleConfig>(defaultModules);
  const [userRole, setUserRole] = useState<ModuleContextType['userRole']>('tenant_admin');

  const toggleModule = (module: keyof ModuleConfig) => {
    setModules((prev) => ({
      ...prev,
      [module]: !prev[module],
    }));
  };

  const isModuleEnabled = (module: keyof ModuleConfig) => {
    return modules[module];
  };

  return (
    <ModuleContext.Provider value={{ modules, toggleModule, isModuleEnabled, userRole, setUserRole }}>
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
