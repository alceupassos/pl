const fs=require('node:fs'), ts=require('typescript'), assert=require('node:assert/strict'), Module=require('node:module');
function source(file){const m=new Module(file,module);m.paths=module.paths;m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{esModuleInterop:true,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);return m.exports;}
const {auditResearch,weightedProgress}=source('lib/telao/research-audit.ts');
const p={instituto:'teste',divulgadoEm:'04/10',margem:2,entrevistas:1000,fonte:'teste',cand:[{num:10,nome:'A',partido:'A',pct:100},{num:20,nome:'B',partido:'B',pct:0}]};
assert.deepEqual(auditResearch(p,[{num:10},{num:20}]).missing,[]);
assert.deepEqual(auditResearch(p,[{num:10},{num:20},{num:30}]).missing,[30]);
assert.equal(weightedProgress([{secoesTot:1,secoesTotal:10},{secoesTot:90,secoesTotal:100}]),100*91/110);
assert.equal(weightedProgress([{secoesTot:0,secoesTotal:0}]),null);
assert(auditResearch({...p,cand:[...p.cand,p.cand[0]]},[{num:10}]).issues.some(x=>x.includes('duplicados')));
const {clean}=source('lib/telao/boca-de-urna.ts');
assert.equal(clean(p).cand.length,2); assert.equal(clean(p).cand[1].pct,0);
assert.equal(clean({...p,cand:[{...p.cand[0],pct:null},{...p.cand[0],pct:undefined},{...p.cand[0],pct:-1},{...p.cand[0],pct:NaN}]}).cand.length,0);
const {createOtp,verifyOtp}=source('lib/otp-store.ts');const made=createOtp('5511000000000');assert(made.ok);assert.equal(createOtp('5511000000000').ok,false);assert.equal(verifyOtp('5511000000000',made.code),'ok');assert.equal(verifyOtp('5511000000000',made.code),'not_found');
console.log('PASS: 10 verificações — zero vs ausente, cobertura, duplicidades, ponderação, OTP e reuso.');
