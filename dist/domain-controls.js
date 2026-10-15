import {domainFor} from './core.js?v=20261015-template';
export function commonDomain(meta,field,features){
 const domains=(features.length?features:[{attributes:{}}]).map(f=>domainFor(meta,field,f.attributes));
 if(!domains.every(d=>d?.type==='codedValue'))return null;
 return {type:'codedValue',codedValues:domains[0].codedValues.filter(v=>domains.every(d=>d.codedValues.some(c=>String(c.code)===String(v.code))))};
}
export function valueControl(field,domain,raw='',onChange=()=>{}){
 const input=document.createElement(domain?.type==='codedValue'?'select':'input');
 if(input.tagName==='SELECT'){
  input.add(new Option('Choose / leave unchanged',''));if(field.nullable!==false)input.add(new Option('Set NULL','__NULL__'));
  for(const item of domain.codedValues)input.add(new Option(item.name+' ['+item.code+']',String(item.code)));
  const text=String(raw??''),code=domain.codedValues.find(c=>String(c.code)===text),labels=domain.codedValues.filter(c=>c.name===text);let selected=code?String(code.code):labels.length===1?String(labels[0].code):text;
  if(selected&&!Array.from(input.options).some(o=>o.value===selected))input.add(new Option('Excel value — check: '+text,text));input.value=selected;
 }else{input.type='text';input.value=raw??'';input.placeholder=domain?.type==='range'?'Allowed range: '+domain.range.join(' to '):'Enter a value';}
 input.addEventListener('input',()=>onChange(input.value));input.addEventListener('change',()=>onChange(input.value));return input;
}
