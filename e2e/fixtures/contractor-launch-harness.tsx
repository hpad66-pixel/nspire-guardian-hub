import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RequestChecklist } from '../../src/components/contractors/RequestChecklist';
import { NoticeToProceed } from '../../src/components/contractors/NoticeToProceed';
import ContractorOnboardingPage from '../../src/pages/contractors/ContractorOnboardingPage';
import type { ContractorCase } from '../../src/hooks/useContractorReadiness';
import '../../src/index.css';
const company={id:'case1',tenant_id:'workspace1',organization_id:'org1',project_id:'project1',status:'qualified',work_ready:true,contract_ready:true,organization:{name:'Ecotech Consulting',email:'team@example.com'},project:{name:'Glorieta Gardens'},client:{name:'R4 Capital'}} as ContractorCase;
function Staff(){const [selection,setSelection]=useState({codes:['insurance','w9'],companyProfile:false,portfolio:false}); return <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8"><h1 className="text-2xl font-semibold">Welcome your project team</h1><RequestChecklist items={[{requirement_code:'insurance',title:'Professional liability insurance',required:true},{requirement_code:'w9',title:'W-9',required:true,status:'verified'}]} value={selection} onChange={setSelection}/><NoticeToProceed item={company}/></main>;}
const portal=new URLSearchParams(location.search).get('portal')==='true';
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter initialEntries={['/contractor/onboard/test-token']}><Routes><Route path="/contractor/onboard/:token" element={portal?<ContractorOnboardingPage/>:<Staff/>}/></Routes></MemoryRouter></QueryClientProvider>);
