import { performance } from 'node:perf_hooks';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { historyDateSchema, dayHistorySchema, monthHistorySchema, historySaleResponseSchema, sessionResponseSchema, currentMenuResponseSchema, formatDate, formatMonth, formatDateTime, formatTime, formatPrice, formatRole, formatPaymentMethod } from '@kofi/contracts';
import { requireForeground } from './measure-dashboard.mjs';
const TARGET='https://kofi-web.onrender.com';
class MeasurementError extends Error {}
const fail=()=>{throw new MeasurementError('La medición no tiene datos válidos de comprobación.');};
const duration=value=>Number.isFinite(value)&&value>=0?value:fail();
const commit=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);
export function parseArgs(args){
 const result={};const fields={'--date':'date','--web-commit':'webCommit','--api-commit':'apiCommit'};
 for(let index=0;index<args.length;index+=2){const field=fields[args[index]];if(!field||field in result||!args[index+1])fail();result[field]=args[index+1];}
 if(!historyDateSchema.safeParse(result.date).success||!commit(result.webCommit)||!commit(result.apiCommit))fail();
 return result;
}
export function buildReport(input,metadata){
 if(metadata.productCount<200||!Number.isInteger(metadata.productCount)||metadata.dailySalesCount!==400||metadata.monthlySalesCount!==6000||metadata.role!=='owner'||!historyDateSchema.safeParse(metadata.date).success||metadata.month!==metadata.date.slice(0,7)||!commit(metadata.webCommit)||!commit(metadata.apiCommit)||!Number.isSafeInteger(metadata.saleNumber)||metadata.saleNumber<1)fail();
 const summarize=values=>{if(!Array.isArray(values)||values.length>20)fail();const durationsMs=values.map(duration);return {durationsMs,limitMs:2000,underLimit:durationsMs.filter(ms=>ms<2000).length,p95Ms:durationsMs.length===20?[...durationsMs].sort((a,b)=>a-b)[18]:null};};
 const series=Object.fromEntries(['day','month','sale'].map(kind=>[kind,summarize(input[kind+'Ms'])]));
 const warmupsMs=Object.fromEntries(Object.entries(input.warmupsMs??{}).filter(([kind])=>['day','month','sale'].includes(kind)).map(([kind,value])=>[kind,duration(value)]));
 const complete=Object.values(series).every(series=>series.durationsMs.length===20)&&Object.keys(warmupsMs).length===3;
 return {target:TARGET,timingMethod:metadata.timingMethod==='existing_tab_ui'?'existing_tab_ui':'playwright_navigation',measuredAt:new Date().toISOString(),timeZone:'America/La_Paz',platform:process.platform,nodeVersion:process.versions.node,localCommit:commit(metadata.localCommit)?metadata.localCommit:null,browserVersion:metadata.browserVersion??null,webCommit:metadata.webCommit,apiCommit:metadata.apiCommit,date:metadata.date,month:metadata.month,saleNumber:metadata.saleNumber,role:metadata.role,productCount:metadata.productCount,dailySalesCount:400,monthlySalesCount:6000,warmupsMs,excludedWarmupPerOperation:1,...series,complete,rnf3Passed:complete&&Object.values(series).every(series=>series.underLimit>=19),humanCriteria:{task:'T028-H',status:'pending'}};
}
export async function measureCycles(driver,onSample=async()=>{}){
 const input={dayMs:[],monthMs:[],saleMs:[],warmupsMs:{}};
 for(const kind of ['day','month','sale']){
  input.warmupsMs[kind]=duration(await driver[kind]());await onSample(input);
  for(let index=0;index<20;index++){input[kind+'Ms'].push(duration(await driver[kind]()));await onSample(input);}
 }
 return input;
}
export async function createBrowserDriver(config,options={}){
 const target=config.target??TARGET;
 const chromium=options.chromium??(await import('@playwright/test')).chromium;
 const browser=options.page?null:await chromium.launch({headless:options.headless??false});
 try{
  const page=options.page??await(await browser.newContext({baseURL:target})).newPage();page.setDefaultTimeout(55000);
  let measuring=false,focusLost=false;
  const binding='kofiHistoryFocusLost'+Date.now();
  await page.exposeBinding(binding,()=>{if(measuring)focusLost=true;});
  await page.addInitScript(({binding})=>{const check=()=>{if(document.visibilityState!=='visible'||!document.hasFocus())void window[binding]();};window.addEventListener('blur',()=>void window[binding]());document.addEventListener('visibilitychange',check);},{binding});
  await page.goto(new URL('/',target).href);
  const json=async(response,schema)=>{if(response.status()!==200)throw new MeasurementError('La API rechazó la consulta; se detuvo sin reintentar.');return schema.parse(await response.json());};
  const request=async(path,schema)=>json(await page.request.get(new URL(path,target).href),schema);
  let inspected;
  const visible=async(text)=>{await page.getByText(text,{exact:true}).waitFor({state:'visible'});};
  const countText=count=>count===1?'1 venta':count+' ventas';
  const showTotals=async(data)=>{
   await visible(formatPrice(data.totalCents));await visible(countText(data.salesCount));
   for(const payment of data.byPaymentMethod)await visible(formatPaymentMethod(payment.paymentMethod)+': '+formatPrice(payment.totalCents)+' · '+countText(payment.salesCount));
   await visible('Datos al '+formatDateTime(data.asOf));
  };
  const same=async(locator,expected)=>{const actual=await locator.allTextContents();if(JSON.stringify(actual)!==JSON.stringify(expected))throw new MeasurementError('La interfaz no muestra todos los datos recibidos.');};
  const measure=async(kind)=>{
   if(!inspected)fail();
   const path=kind==='day'?'/ventas?fecha='+config.date:kind==='month'?'/ventas/mes?mes='+inspected.month:'/ventas/'+inspected.saleNumber;
   const endpoint=kind==='day'?'/api/history/day':kind==='month'?'/api/history/month':'/api/history/sales/'+inspected.saleNumber;
   await page.bringToFront();
   measuring=true;focusLost=false;
   try{
    const response=page.waitForResponse(response=>new URL(response.url()).pathname===endpoint&&response.request().method()==='GET');
    const start=performance.now();await page.goto(new URL(path,target).href);
    const data=await json(await response,kind==='day'?dayHistorySchema:kind==='month'?monthHistorySchema:historySaleResponseSchema);
    if(kind==='day'){
     if(data.date!==config.date||data.salesCount!==400)fail();
     await page.getByRole('heading',{name:'Ventas del '+formatDate(data.date),exact:true}).waitFor({state:'visible'});await showTotals(data);
     await same(page.getByRole('listitem'),data.sales.map(sale=>'N.º '+sale.number+' · '+formatTime(sale.registeredAt)+' · '+sale.registeredBy.displayName+' · '+formatRole(sale.registeredBy.role)+' · '+formatPaymentMethod(sale.paymentMethod)+' · '+formatPrice(sale.totalCents)));
    }else if(kind==='month'){
     if(data.month!==inspected.month||data.salesCount!==6000)fail();
     await page.getByRole('heading',{name:formatMonth(data.month),exact:true}).waitFor({state:'visible'});await showTotals(data);
     await same(page.getByRole('row').filter({has:page.getByRole('link')}),data.days.map(day=>formatDate(day.date)+' · '+formatPrice(day.totalCents)+' · '+countText(day.salesCount)));
    }else{
     const sale=data.sale;if(sale.number!==inspected.saleNumber)fail();
     await page.getByRole('heading',{name:'Venta N.º '+sale.number,exact:true}).waitFor({state:'visible'});
     for(const text of [formatDateTime(sale.registeredAt),'Registrada por '+sale.registeredBy.displayName+' · '+formatRole(sale.registeredBy.role),'Medio de pago: '+formatPaymentMethod(sale.paymentMethod),formatPrice(sale.totalCents)])await visible(text);
     await same(page.locator('main li'),sale.lines.map(line=>line.productName+' · '+line.categoryName+' · '+formatPrice(line.unitPriceCents)+' × '+line.quantity+' · '+formatPrice(line.subtotalCents)));
    }
    await page.getByRole('button',{name:'Actualizar',exact:true}).waitFor({state:'visible'});
    await page.getByText('Cargando…',{exact:true}).waitFor({state:'hidden'});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const state=await page.evaluate(()=>({visibilityState:document.visibilityState,hasFocus:document.hasFocus()}));requireForeground({...state,lostFocus:focusLost});
    if(new URL(page.url()).origin!==new URL(target).origin)fail();return duration(performance.now()-start);
   }finally{measuring=false;}
  };
  return {
   async login(){await page.getByRole('button',{name:'Cerrar sesión',exact:true}).waitFor({state:'visible',timeout:90000});},
   async inspect(){
    const {user}=await request('/api/auth/session',sessionResponseSchema);if(user.role!=='owner')throw new MeasurementError('La medición de Historial requiere una sesión real de dueño.');
    const menu=await request('/api/menu',currentMenuResponseSchema);const day=await request('/api/history/day?date='+config.date,dayHistorySchema);const month=await request('/api/history/month?month='+config.date.slice(0,7),monthHistorySchema);
    inspected={...config,role:user.role,productCount:menu.categories.reduce((sum,category)=>sum+category.products.length,0),dailySalesCount:day.salesCount,monthlySalesCount:month.salesCount,month:month.month,saleNumber:day.sales[0]?.number,browserVersion:browser?await browser.version():null};buildReport({dayMs:[],monthMs:[],saleMs:[],warmupsMs:{}},inspected);return inspected;
   },day:()=>measure('day'),month:()=>measure('month'),sale:()=>measure('sale'),async close(){if(browser)await browser.close();},
  };
 }catch(error){if(browser)await browser.close();throw error;}
}
export async function runMeasurement({args=process.argv.slice(2),env=process.env,io={interactive:process.stdin.isTTY&&process.stdout.isTTY,write:text=>console.log(text)},createDriver=createBrowserDriver,saveReport}={}){
 let driver;
 try{
  if(!io.interactive||env.DEBUG||env.PWDEBUG||env.NODE_DEBUG)throw new MeasurementError('Usa una terminal interactiva sin depuración; no se reciben credenciales.');
  const config=parseArgs(args);io.write('Si no hay sesión activa, ingresa como dueño únicamente en Chromium. Los recorridos humanos no se ejecutan.');
  driver=await createDriver(config);await driver.login();const metadata=await driver.inspect();
  let last=buildReport({dayMs:[],monthMs:[],saleMs:[],warmupsMs:{}},metadata);await saveReport(last);
  await measureCycles(driver,async input=>{last=buildReport(input,metadata);await saveReport(last);});
  io.write(last.rnf3Passed?'RNF-3 automatizado cumple; T028-H permanece pendiente.':'RNF-3 automatizado no cumple; conserva las muestras originales.');return last.rnf3Passed?0:1;
 }catch(error){io.write(error instanceof MeasurementError?error.message:'No se completó la medición. Se conservaron las muestras obtenidas; revisa sesión, despliegue y conexión sin compartir credenciales.');return 1;}
 finally{await driver?.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const path=join(tmpdir(),'kofi-history-measurement-'+Date.now()+'.json');
 const localCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 process.exitCode=await runMeasurement({createDriver:config=>createBrowserDriver({...config,localCommit}),saveReport:report=>writeFile(path,JSON.stringify(report,null,2)+'\n')});console.log('Informe de comprobación: '+path);
}

// Adaptador para una pestaña existente controlada mediante las APIs de navegador de Cua.
// No accede a cookies, almacenamiento de sesiones ni credenciales.
export function createExistingTabDriver(tab,config,source){
 const session=sessionResponseSchema.parse(source.session);const menu=currentMenuResponseSchema.parse(source.menu);const day=dayHistorySchema.parse(source.day);const month=monthHistorySchema.parse(source.month);const sale=historySaleResponseSchema.parse(source.sale).sale;
 const metadata={...config,role:session.user.role,productCount:menu.categories.reduce((sum,category)=>sum+category.products.length,0),dailySalesCount:day.salesCount,monthlySalesCount:month.salesCount,month:month.month,saleNumber:sale.number};
 buildReport({dayMs:[],monthMs:[],saleMs:[],warmupsMs:{}},metadata);
 if(day.date!==config.date||sale.number!==day.sales[0]?.number)fail();
 const countText=count=>count===1?'1 venta':count+' ventas';
 const listed=sale=>'N.º '+sale.number+' · '+formatTime(sale.registeredAt)+' · '+sale.registeredBy.displayName+' · '+formatRole(sale.registeredBy.role)+' · '+formatPaymentMethod(sale.paymentMethod)+' · '+formatPrice(sale.totalCents);
 const totals=data=>[formatPrice(data.totalCents),countText(data.salesCount),...data.byPaymentMethod.map(payment=>formatPaymentMethod(payment.paymentMethod)+': '+formatPrice(payment.totalCents)+' · '+countText(payment.salesCount))];
 const views={
  day:{title:'Ventas del '+formatDate(day.date),texts:totals(day),rows:day.sales.map(listed),selector:'main li',asOf:true},
  month:{title:formatMonth(month.month),texts:totals(month),rows:month.days.map(day=>formatDate(day.date)+' · '+formatPrice(day.totalCents)+' · '+countText(day.salesCount)),selector:'main tbody tr',asOf:true},
  sale:{title:'Venta N.º '+sale.number,texts:[formatDateTime(sale.registeredAt),'Registrada por '+sale.registeredBy.displayName+' · '+formatRole(sale.registeredBy.role),'Medio de pago: '+formatPaymentMethod(sale.paymentMethod),formatPrice(sale.totalCents)],rows:sale.lines.map(line=>line.productName+' · '+line.categoryName+' · '+formatPrice(line.unitPriceCents)+' × '+line.quantity+' · '+formatPrice(line.subtotalCents)),selector:'main li',asOf:false},
 };
 const target=config.target??TARGET;
 const measure=async(kind)=>{
  if(kind==='day')await tab.goto(new URL('/ventas/mes?mes='+month.month,target).href);
  else if(kind==='month')await tab.goto(new URL('/ventas/mes?mes='+(month.nextMonth??month.previousMonth),target).href);
  else await tab.goto(new URL('/ventas?fecha='+day.date,target).href);
  const preparedTitle=kind==='day'?formatMonth(month.month):kind==='month'?formatMonth(month.nextMonth??month.previousMonth):'Ventas del '+formatDate(day.date);
  await tab.playwright.getByRole('heading',{name:preparedTitle,exact:true}).waitFor({state:'visible'});
  const start=await tab.playwright.evaluate(()=>({time:performance.now(),origin:performance.timeOrigin,visible:document.visibilityState,focus:document.hasFocus()}));
  requireForeground({visibilityState:start.visible,hasFocus:start.focus,lostFocus:false});
  const observe=tab.playwright.evaluate(observeHistoryDocument,{...views[kind],startTime:start.time,timeOrigin:start.origin},{timeoutMs:55000});
  // Manejar el rechazo desde el inicio aunque ocurra antes de que termine la acción.
  void observe.catch(()=>{});
  if(kind==='day'){
   const row=month.days.find(row=>row.date===day.date);if(!row)fail();
   await tab.playwright.getByRole('link',{name:formatDate(row.date)+' · '+formatPrice(row.totalCents)+' · '+countText(row.salesCount),exact:true}).click();
  }else if(kind==='month')await tab.playwright.getByLabel('Mes',{exact:true}).fill(month.month);
  else await tab.playwright.getByRole('link',{name:listed(day.sales[0]),exact:true}).click();
  return duration(await observe);
 };
 return {login:async()=>{await tab.playwright.getByRole('button',{name:'Cerrar sesión',exact:true}).waitFor({state:'visible'});},inspect:async()=>metadata,day:()=>measure('day'),month:()=>measure('month'),sale:()=>measure('sale'),close:async()=>{}};
}
// Función autocontenida de observación: no escribe en la página ni hace peticiones ocultas.
export async function observeHistoryDocument(view){
 const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
 const visible=element=>element.getClientRects().length>0&&getComputedStyle(element).visibility!=='hidden';
 let painted=0;
 while(performance.now()-view.startTime<55000){
  if(performance.timeOrigin!==view.timeOrigin)throw new Error('La navegación reemplazó el documento durante la medición.');
  if(document.visibilityState!=='visible'||!document.hasFocus())throw new Error('Chromium perdió el primer plano durante la medición.');
  const main=document.querySelector('main');
  const title=main?.querySelector('h1')?.textContent;
  const texts=main?Array.from(main.querySelectorAll('p,dd')).filter(visible).map(element=>element.textContent):[];
  const rows=Array.from(document.querySelectorAll(view.selector)).filter(visible).map(element=>element.textContent);
  const loading=Array.from(document.querySelectorAll('[role="status"]')).some(element=>visible(element)&&element.textContent?.includes('Cargando'));
  const refresh=Array.from(document.querySelectorAll('main button')).find(button=>button.textContent==='Actualizar');
  const ready=title===view.title&&view.texts.every(text=>texts.includes(text))&&JSON.stringify(rows)===JSON.stringify(view.rows)&&Boolean(refresh&&!refresh.disabled)&&!loading&&(!view.asOf||texts.some(text=>/^Datos al \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(text)));
  painted=ready?painted+1:0;
  if(painted===3)return performance.now()-view.startTime;
  await frame();
 }
 throw new Error('La interfaz no mostró todos los datos dentro del plazo de observación.');
}
