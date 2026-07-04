import { useModules } from '@/contexts/ModuleContext';

// Whether the workspace has the AI module. Fail-open (true) if used outside the
// ModuleProvider (e.g. a public page), so AI surfaces there aren't accidentally
// hidden — those pages don't render AI actions anyway.
export function useAiEnabled(): boolean {
  try {
    return useModules().isModuleEnabled('aiEnabled');
  } catch {
    return true;
  }
}
