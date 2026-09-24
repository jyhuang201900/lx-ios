const r=require('./lint.json');
const want=new Set(['import/no-duplicates','@typescript-eslint/no-unused-vars','react-hooks/rules-of-hooks']);
let bad=0,total=0;
for(const f of r)for(const m of f.messages){if(m.severity===2){total++; if(['import/no-duplicates','@typescript-eslint/no-unused-vars','react-hooks/rules-of-hooks'].includes(m.ruleId)){console.log('ISSUE:',f.filePath.replace(process.cwd(),''),m.line,m.ruleId,m.message.slice(0,80));bad++}}}
console.log('total errors:',total,'| critical:',bad);
