import { test, expect } from '@playwright/test';
test('administrator tailors requests and previews the Notice to Proceed on mobile',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.route('**/*.supabase.co/**',route=>route.fulfill({json:route.request().url().includes('company_branding')?{company_name:'APAS Consulting'}:null}));
  await mount(page,false);
  await page.getByRole('button',{name:'Only outstanding items'}).click();
  await expect(page.getByRole('checkbox',{name:/W-9/})).not.toBeChecked();
  await expect(page.getByRole('checkbox',{name:/Professional liability/})).toBeChecked();
  await page.screenshot({path:test.info().outputPath('tailored-checklist-mobile.png'),fullPage:true});
  await page.getByRole('button',{name:'Prepare Notice to Proceed'}).click();
  await expect(page.getByRole('button',{name:'Issue Notice to Proceed',exact:true})).toBeDisabled();
  await page.getByLabel('Approved contract or proposal reference').fill('Signed proposal 101');
  await page.getByLabel('Authorized scope and deliverables').fill('Inspect backflow devices and deliver the inspection report.');
  await expect(page.frameLocator('iframe').getByText('Inspect backflow devices and deliver the inspection report.')).toBeVisible();
  await page.screenshot({path:test.info().outputPath('ntp-mobile.png'),fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('company can submit a partial batch and keep adding missing evidence during review',async({page})=>{
  let submitted=false;
  await page.route('**/*.supabase.co/**',async route=>{
    const body=route.request().postDataJSON(); if(body?.action==='submit'){submitted=true;return route.fulfill({json:{ok:true}});}
    return route.fulfill({json:{ok:true,qualification:{status:'under_review',request_company_profile:false,request_portfolio:false},access:{role:'contractor'},organization:{name:'Ecotech Consulting'},project:{name:'Glorieta Gardens'},documents:[],comments:[],requirements:[
      {id:'1',title:'W-9',required:true,status:submitted?'under_review':'submitted',response_type:'document'},
      {id:'2',title:'Insurance certificate',required:true,status:'missing',response_type:'document'},
    ]}});
  });
  await mount(page,true);
  await expect(page.getByRole('heading',{name:'Help us get to know your team'})).toHaveCount(0);
  await page.getByRole('button',{name:'Send available items'}).click();
  await expect.poll(()=>submitted).toBe(true);
  await page.getByRole('button',{name:/Insurance certificate/}).click();
  await expect(page.locator('input[type=file]')).toBeVisible();
  await expect(page.getByRole('button',{name:'Send available items'})).toBeDisabled();
});
async function mount(page:import('@playwright/test').Page,portal:boolean){
  await page.route('**/__contractor-test?*',route=>route.fulfill({contentType:'text/html',body:`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script>window.__APP_CONFIG__={supabaseUrl:'https://contractortest.supabase.co',supabasePublishableKey:'test-key'};</script><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/e2e/fixtures/contractor-launch-harness.tsx"></script></body></html>`}));
  await page.goto(`/__contractor-test?portal=${portal}`);
}
