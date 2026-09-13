// Test-only mount. Vite resolves the same router/react instances as the page.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../src/hooks/useAuth';
import ClientMeetingsPage from '../../src/pages/organizations/ClientMeetingsPage';
import '../../src/index.css';
const prefix = new URLSearchParams(window.location.search).get('staff') === 'true' ? '/organizations/' : '/owner-portal/clients/';
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AuthProvider><MemoryRouter initialEntries={[`${prefix}97000000-0000-4000-8000-000000000011/meetings`]}><Routes><Route path={`${prefix}:clientId/meetings`} element={<ClientMeetingsPage />}/></Routes></MemoryRouter></AuthProvider></QueryClientProvider>);
