import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const code = ts.transpileModule(readFileSync('src/lib/liga.ts','utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText;
const context = { exports:{} };
vm.runInNewContext(code,context);
const { DIVISIONES, calcularDivision } = context.exports;
assert.equal(DIVISIONES.length,8);
for (let i=1;i<DIVISIONES.length;i++) {
  const division=DIVISIONES[i];
  assert.equal(calcularDivision(division.pl,true).id,division.id);
  assert.equal(calcularDivision(division.pl-1,true).id,DIVISIONES[i-1].id);
}
assert.equal(calcularDivision(-100,false).id,'bronce');
assert.equal(calcularDivision(600,false).id,'gran-maestro');
assert.equal(calcularDivision(600,true).id,'challenger');
console.log('PASS: eight divisions, every boundary, Challenger leadership and negative points');
