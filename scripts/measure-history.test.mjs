import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildReport, measureCycles, runMeasurement, parseArgs, createBrowserDriver, createExistingTabDriver } from './measure-history.mjs';
const metadata={productCount:200,dailySalesCount:400,monthlySalesCount:6000,date:'2026-10-24',month:'2026-10',saleNumber:400,role:'owner',webCommit:'1'.repeat(40),apiCommit:'2'.repeat(40)};
const samples=()=>({dayMs:Array(20).fill(200),monthMs:Array(20).fill(300),saleMs:Array(20).fill(100),warmupsMs:{day:1500,month:1800,sale:400}});
const args=['--date','2026-10-24','--web-commit',metadata.webCommit,'--api-commit',metadata.apiCommit];

test('Historial exige los volúmenes, el rol, fechas y commits de comprobación sin filtrar secretos',()=>{
 const report=buildReport(samples(),{...metadata,password:'privado',cookie:'privado',databaseUrl:'privado'});
 assert.equal(report.complete,true);assert.equal(report.rnf3Passed,true);assert.equal(report.humanCriteria.status,'pending');assert.equal(JSON.stringify(report).includes('privado'),false);
 for(const invalid of [{productCount:199},{dailySalesCount:399},{monthlySalesCount:5999},{role:'cashier'},{webCommit:'otro'},{month:'2026-09'}])assert.throws(()=>buildReport(samples(),{...metadata,...invalid}));
 assert.throws(()=>buildReport({...samples(),dayMs:Array(21).fill(1)},metadata));
 for(const invalid of [NaN,Infinity,-1])assert.throws(()=>buildReport({...samples(),saleMs:[invalid]},metadata));
});
test('Historial conserva las muestras originales, aplica 19/20 y límites estrictos de 2 segundos',()=>{
 const input=samples();input.dayMs[0]=2000;
 let report=buildReport(input,metadata);assert.equal(report.day.underLimit,19);assert.equal(report.rnf3Passed,true);assert.deepEqual(report.day.durationsMs,input.dayMs);
 input.dayMs[1]=2000;report=buildReport(input,metadata);assert.equal(report.rnf3Passed,false);assert.equal(report.day.p95Ms,2000);
 const partial=buildReport({dayMs:[500],monthMs:[],saleMs:[],warmupsMs:{}},metadata);assert.equal(partial.complete,false);assert.equal(partial.rnf3Passed,false);
});
test('Historial excluye un calentamiento por serie y guarda cada muestra parcial sin reintentar',async()=>{
 const calls={day:0,month:0,sale:0},saved=[];
 const driver=Object.fromEntries(Object.keys(calls).map(kind=>[kind,async()=>++calls[kind]===1?60000:123]));
 const result=await measureCycles(driver,s=>saved.push(structuredClone(s)));
 assert.deepEqual(calls,{day:21,month:21,sale:21});assert.deepEqual(result.dayMs,Array(20).fill(123));assert.deepEqual(result.warmupsMs,{day:60000,month:60000,sale:60000});assert.equal(saved.at(-1).saleMs.length,20);
});
test('Historial valida argumentos y no acepta datos de autenticación ni depuración',async()=>{
 assert.deepEqual(parseArgs(args),{date:metadata.date,webCommit:metadata.webCommit,apiCommit:metadata.apiCommit});
 for(const invalid of [[],['--password','privado'],[...args,'--date','2026-09-01'],['--date','2026-02-30',...args.slice(2)]])assert.throws(()=>parseArgs(invalid));
 for(const invalid of [{args:['--password','privado']},{env:{DEBUG:'*'}},{io:{interactive:false,write(){}}}]){
  let opened=false;assert.equal(await runMeasurement({args,env:{},io:{interactive:true,write(){}},createDriver:async()=>{opened=true;},saveReport:async()=>{},...invalid}),1);assert.equal(opened,false);
 }
});
test('Historial conserva el informe parcial ante un fallo y no inventa muestras humanas',async()=>{
 let count=0,closed=false;const saved=[];
 const code=await runMeasurement({args,env:{},io:{interactive:true,write(){}},createDriver:async()=>({login:async()=>{},inspect:async()=>metadata,day:async()=>{if(++count===4)throw new Error('cookie privada');return 100;},month:async()=>100,sale:async()=>100,close:async()=>{closed=true;}}),saveReport:async report=>saved.push(structuredClone(report))});
 assert.equal(code,1);assert.equal(count,4);assert.equal(closed,true);assert.equal(saved.at(-1).day.durationsMs.length,2);assert.equal(saved.at(-1).complete,false);assert.equal(JSON.stringify(saved).includes('cookie privada'),false);assert.equal(saved.at(-1).humanCriteria.status,'pending');
});
test('Chromium observa día completo de 400 ventas, mes de 6000 y detalle sin modificar datos', {timeout:90000},async()=>{
 const {chromium}=await import('@playwright/test');const {createServer}=await import('vite');const {resolve}=await import('node:path');
 const {createTestDatabase}=await import('../apps/api/test/test-database.ts');const {seedMenu}=await import('../apps/api/test/seed-menu.ts');
 const {createAccountsService}=await import('../apps/api/src/modules/auth/index.ts');const {createFakeClock}=await import('../apps/api/src/shared/clock.ts');
 const {seedSales}=await import('../apps/api/src/modules/sales/sales-seed.cli.ts');const {listRegisteredSales}=await import('../apps/api/src/modules/sales/index.ts');const {buildApp}=await import('../apps/api/src/app.ts');
 const db=await createTestDatabase();const browser=await chromium.launch({headless:true});let api,web,driver;
 try{
  await seedMenu(db);const account={username:'dueno-ficticio',displayName:'Dueño ficticio',role:'owner',password:'solo prueba automatica'};await createAccountsService(db).create(account);
  const clock=createFakeClock(new Date('2026-10-26T15:00:00Z'));await seedSales(db,clock,{complete:true,historyDay:'2026-10-24'});const before=await listRegisteredSales(db);
  api=buildApp({db,clock,logger:false});const apiTarget=await api.listen({port:0,host:'127.0.0.1'});
  web=await createServer({root:resolve('apps/web'),configFile:resolve('apps/web/vite.config.ts'),logLevel:'error',define:{'import.meta.env.VITE_HISTORY_MEASUREMENT':JSON.stringify('true')},server:{host:'127.0.0.1',port:0,proxy:{'/api':{target:apiTarget,changeOrigin:true}}}});await web.listen();
  const target='http://127.0.0.1:'+web.httpServer.address().port;driver=await createBrowserDriver({...metadata,target},{chromium:{launch:async()=>browser},headless:true});
  const page=browser.contexts()[0].pages()[0];const login=driver.login();await page.getByLabel('Usuario',{exact:true}).fill(account.username);await page.getByLabel('Contraseña',{exact:true}).fill(account.password);await page.getByRole('button',{name:'Ingresar',exact:true}).click();await login;
  const inspected=await driver.inspect();assert.equal(inspected.dailySalesCount,400);assert.equal(inspected.monthlySalesCount,6000);assert.equal(inspected.role,'owner');
  const monthData=await (await page.request.get(target+'/api/history/month?month=2026-10')).json();
  const dayData=await (await page.request.get(target+'/api/history/day?date=2026-10-24')).json();
  const source={session:await(await page.request.get(target+'/api/auth/session')).json(),menu:await(await page.request.get(target+'/api/menu')).json(),day:dayData,month:monthData,sale:await(await page.request.get(target+'/api/history/sales/'+dayData.sales[0].number)).json()};
  const existing=createExistingTabDriver({goto:url=>page.goto(url),screenshot:()=>page.screenshot(),playwright:new Proxy(page,{get(target,key){if(key==='evaluate')return ()=>{throw new Error('El adaptador Cua no dispone de globals de página');};const value=target[key];return typeof value==='function'?value.bind(target):value;}})},{...metadata,target},source);
  assert.equal((await existing.inspect()).role,'owner');
  for(const kind of ['day','month','sale']){const measured=await existing[kind]();assert.ok(measured>0);assert.equal(measured,Number(await page.locator('main').getAttribute('data-history-duration-ms')));}
  const measured=await measureCycles(driver);assert.equal(measured.dayMs.length,20);assert.equal(measured.monthMs.length,20);assert.equal(measured.saleMs.length,20);assert.ok(Object.values(measured).filter(Array.isArray).flat().every(value=>Number.isFinite(value)&&value>0));
  assert.deepEqual(await listRegisteredSales(db),before);
  await page.route('**/api/history/day**',async route=>{await new Promise(resolve=>setTimeout(resolve,600));await route.continue();});
  const requested=page.waitForRequest(request=>new URL(request.url()).pathname==='/api/history/day');
  const rejected=assert.rejects(driver.day(),/primer plano/);await requested;
  // Chromium sin interfaz recibe un evento ficticio de pérdida de foco para esta regresión.
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await rejected;

 }finally{await driver?.close();await browser.close();await web?.close();await api?.close();await db.close();}
});
