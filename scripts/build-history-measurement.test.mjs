import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';
import { buildHistoryMeasurement } from '../apps/web/scripts/build-history-measurement.mjs';

test('genera e importa el medidor de Historial sin paquetes externos ni borrar archivos',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'kofi-history-bundle-test-'));
 await writeFile(join(directory,'conservar.txt'),'datos ficticios');
 const path=await buildHistoryMeasurement(directory);
 const runtime=await import(pathToFileURL(path).href);
 assert.equal(await readFile(join(directory,'conservar.txt'),'utf8'),'datos ficticios');
 for(const name of ['buildReport','measureCycles','createExistingTabDriver','observeHistoryDocument'])assert.equal(typeof runtime[name],'function');
 const metadata={productCount:202,dailySalesCount:400,monthlySalesCount:6000,date:'2026-09-15',month:'2026-09',saleNumber:400,role:'owner',webCommit:'1'.repeat(40),apiCommit:'2'.repeat(40)};
 const samples={dayMs:Array(20).fill(100),monthMs:Array(20).fill(100),saleMs:Array(20).fill(100),warmupsMs:{day:300,month:300,sale:300}};
 assert.equal(runtime.buildReport(samples,metadata).rnf3Passed,true);
 const code=await readFile(path,'utf8');const exportsAt=code.lastIndexOf('export {');assert.ok(exportsAt>0);
 const isolated=runInNewContext(code.slice(0,exportsAt)+'\n({buildReport})',{console,Date,URL,setTimeout,clearTimeout});
 assert.equal(isolated.buildReport(samples,metadata).rnf3Passed,true);
 assert.equal(isolated.buildReport(samples,metadata).nodeVersion,null);
 samples.dayMs[0]=2000;samples.dayMs[1]=2000;
 assert.equal(runtime.buildReport(samples,metadata).rnf3Passed,false);
 assert.equal(runtime.buildReport(samples,metadata).humanCriteria.status,'pending');
 assert.throws(()=>runtime.requireForeground({visibilityState:'hidden',hasFocus:false,lostFocus:true}),/primer plano/);
});


test('el build web normal excluye los atributos y el observador de medición',async()=>{
 const {checkProductionBuild}=await import('../apps/web/scripts/check-production-build.mjs');
 const result=await checkProductionBuild({write:false});
 const outputs=(Array.isArray(result)?result:[result]).flatMap(output=>output.output);
 for(const output of outputs)if(output.type==='chunk')assert.equal(output.code.includes('data-history-duration-ms'),false);
});
