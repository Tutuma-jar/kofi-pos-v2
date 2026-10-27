import { historyDateSchema, dayHistorySchema, monthHistorySchema, historySaleResponseSchema, sessionResponseSchema, currentMenuResponseSchema, formatDate, formatMonth, formatDateTime, formatTime, formatPrice, formatRole, formatPaymentMethod } from '@kofi/contracts';

export const TARGET='https://kofi-web.onrender.com';

export class MeasurementError extends Error {}

export const fail=()=>{throw new MeasurementError('La medición no tiene datos válidos de comprobación.');};

export const duration=value=>Number.isFinite(value)&&value>=0?value:fail();

export const commit=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);

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
 return {target:TARGET,focusValidation:metadata.timingMethod==='browser_render_probe'?'browser_probe':metadata.timingMethod==='existing_tab_ui'?'not_exposed_by_cua':'continuous',timingMethod:metadata.timingMethod==='browser_render_probe'?'browser_render_probe':metadata.timingMethod==='existing_tab_ui'?'existing_tab_ui':'playwright_navigation',measuredAt:new Date().toISOString(),timeZone:'America/La_Paz',platform:typeof process==='undefined'?'browser-runtime':process.platform,nodeVersion:typeof process==='undefined'?null:process.versions.node,localCommit:commit(metadata.localCommit)?metadata.localCommit:null,browserVersion:metadata.browserVersion??null,webCommit:metadata.webCommit,apiCommit:metadata.apiCommit,date:metadata.date,month:metadata.month,saleNumber:metadata.saleNumber,role:metadata.role,productCount:metadata.productCount,dailySalesCount:400,monthlySalesCount:6000,warmupsMs,excludedWarmupPerOperation:1,...series,complete,rnf3Passed:complete&&Object.values(series).every(series=>series.underLimit>=19),humanCriteria:{task:'T028-H',status:'pending'}};
}

export async function measureCycles(driver,onSample=async()=>{}){
 const input={dayMs:[],monthMs:[],saleMs:[],warmupsMs:{}};
 for(const kind of ['day','month','sale']){
  input.warmupsMs[kind]=duration(await driver[kind]());await onSample(input);
  for(let index=0;index<20;index++){input[kind+'Ms'].push(duration(await driver[kind]()));await onSample(input);}
 }
 return input;
}

export function createExistingTabDriver(tab,config,source){
 const session=sessionResponseSchema.parse(source.session);const menu=currentMenuResponseSchema.parse(source.menu);const day=dayHistorySchema.parse(source.day);const month=monthHistorySchema.parse(source.month);const sale=historySaleResponseSchema.parse(source.sale).sale;
 const metadata={...config,timingMethod:'browser_render_probe',role:session.user.role,productCount:menu.categories.reduce((sum,category)=>sum+category.products.length,0),dailySalesCount:day.salesCount,monthlySalesCount:month.salesCount,month:month.month,saleNumber:sale.number};
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
  if(kind==='day'){
   const row=month.days.find(row=>row.date===day.date);if(!row)fail();
   await tab.playwright.getByRole('link',{name:formatDate(row.date)+' · '+formatPrice(row.totalCents)+' · '+countText(row.salesCount),exact:true}).click();
  }else if(kind==='month')await tab.playwright.getByLabel('Mes',{exact:true}).fill(month.month);
  else await tab.playwright.getByRole('link',{name:listed(day.sales[0]),exact:true}).click();
  await observeHistoryDocument(views[kind],tab);
  const main=tab.playwright.locator('main');
  const raw=await main.getAttribute('data-history-duration-ms');
  if(raw===null||raw==='')throw new MeasurementError('El despliegue no tiene un intervalo de renderizado válido. Comprueba la instrumentación de comprobación.');
  const expected=kind==='day'?'/ventas?fecha='+day.date:kind==='month'?'/ventas/mes?mes='+month.month:'/ventas/'+sale.number;
  if(await main.getAttribute('data-history-target')!==expected)throw new MeasurementError('El intervalo pertenece a otra consulta.');
  if(await main.getAttribute('data-history-focus-ok')!=='true')throw new MeasurementError('Chromium perdió el primer plano durante la medición.');
  return duration(Number(raw));
 };
 return {login:async()=>{await tab.playwright.getByRole('button',{name:'Cerrar sesión',exact:true}).waitFor({state:'visible'});},inspect:async()=>metadata,day:()=>measure('day'),month:()=>measure('month'),sale:()=>measure('sale'),close:async()=>{}};
}

export async function observeHistoryDocument(view,tab){
 await tab.playwright.getByRole('heading',{name:view.title,exact:true}).waitFor({state:'visible'});
 await Promise.all(view.texts.map(text=>tab.playwright.getByText(text,{exact:true}).waitFor({state:'visible'})));
 const rows=view.selector==='main tbody tr'?tab.playwright.getByRole('row').filter({has:tab.playwright.getByRole('link')}):tab.playwright.getByRole('listitem');
 const actual=await rows.allTextContents();
 if(JSON.stringify(actual)!==JSON.stringify(view.rows))throw new MeasurementError('La interfaz no muestra todas las filas recibidas.');
 await tab.playwright.getByText('Cargando…',{exact:true}).waitFor({state:'hidden'});
 if(view.asOf)await tab.playwright.getByText(/^Datos al \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/).waitFor({state:'visible'});
 if(!await tab.playwright.getByRole('button',{name:'Actualizar',exact:true}).isEnabled())throw new MeasurementError('La consulta todavía está cargando.');
 // Dos capturas reales confirman que el resultado ya está renderizado, sin APIs JS de la página.
 await tab.screenshot({fullPage:false});await tab.screenshot({fullPage:false});
 if(!await tab.playwright.getByRole('heading',{name:view.title,exact:true}).isVisible())throw new MeasurementError('La interfaz cambió durante la observación.');
}

export function requireForeground(state) {
  if (state?.visibilityState !== 'visible' || state?.hasFocus !== true || state?.lostFocus === true)
    throw new MeasurementError('Chromium perdió el primer plano durante la serie. Conserva la ventana visible y sin usar otras aplicaciones antes de repetir la serie completa.');
}
