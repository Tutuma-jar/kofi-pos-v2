import {TARGET,MeasurementError,fail,duration,commit,parseArgs,buildReport,measureCycles,requireForeground} from './history-measurement-core.mjs';
export {parseArgs,buildReport,measureCycles,createExistingTabDriver,observeHistoryDocument} from './history-measurement-core.mjs';

import { performance } from 'node:perf_hooks';

import { execFileSync } from 'node:child_process';

import { writeFile } from 'node:fs/promises';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { pathToFileURL } from 'node:url';

import { historyDateSchema, dayHistorySchema, monthHistorySchema, historySaleResponseSchema, sessionResponseSchema, currentMenuResponseSchema, formatDate, formatMonth, formatDateTime, formatTime, formatPrice, formatRole, formatPaymentMethod } from '@kofi/contracts';

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
  const visible=async(text)=>{
   const metric=/^Bs |^\d+ ventas?$/.test(text);
   const pattern=new RegExp('^'+text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$');
   const target=metric?page.getByRole('definition').filter({hasText:pattern}):/^(Efectivo|QR):/.test(text)?page.getByRole('paragraph').filter({hasText:pattern}):page.getByText(text,{exact:true});
   await target.waitFor({state:'visible'});
  };
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
