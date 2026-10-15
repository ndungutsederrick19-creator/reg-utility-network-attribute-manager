import {domainFor,globalIdField} from './core.js?v=20261015-template';
import {valueControl} from './domain-controls.js?v=domain-options-20261015';
const supported=new Set(['esriFieldTypeString','esriFieldTypeSmallInteger','esriFieldTypeInteger','esriFieldTypeSingle','esriFieldTypeDouble','esriFieldTypeBigInteger','esriFieldTypeDate','esriFieldTypeGUID']);
export function excelCellEditable(field,meta){return !!field&&field.editable===true&&supported.has(field.type)&&field.name!==meta.typeIdField&&(!Array.isArray(meta.__allowedFields)||meta.__allowedFields.includes(field.name));}
export function renderExcelEditor(container,rows,mapping,meta,features=[]){
 const title=document.createElement('h3');title.textContent='2. Edit the values to save';
 const help=document.createElement('p');help.textContent='Changes here stay in this app until you click Apply and submit. That button writes directly to the selected UN service. Blank cells leave UN values unchanged. Use __NULL__ to clear a nullable value. Global IDs and protected fields are locked. Permissions and domains are checked before saving.';
 const table=document.createElement('table'),head=document.createElement('thead'),header=document.createElement('tr');
 mapping.forEach(m=>{const th=document.createElement('th');th.textContent=m?.field?m.header+' → '+m.field.name:(m?.header||'Unused column')+' (ignored / unmapped)';header.append(th);});head.append(header);table.append(head);
 const body=document.createElement('tbody');
 rows.slice(1).forEach((row,r)=>{const gid=globalIdField(meta),ix=mapping.findIndex(m=>m?.field?.name===gid?.name&&!m.ignore),key=v=>String(v??'').replace(/[{}]/g,'').toUpperCase(),attrs=features.find(f=>key(f.attributes[gid?.name])===key(row[ix]))?.attributes||{};const tr=document.createElement('tr');mapping.forEach((m,c)=>{const td=document.createElement('td');if(!m?.ignore&&excelCellEditable(m?.field,meta)){const input=valueControl(m.field,domainFor(meta,m.field,attrs),row[c],value=>{row[c]=value;});input.setAttribute('aria-label','Excel row '+(r+2)+' '+m.field.name);if(input.tagName==='INPUT'&&!input.placeholder)input.placeholder='Leave unchanged';td.append(input);}else{td.textContent=String(row[c]??'');td.title='Reference only: identifies the device, is protected, or is excluded by the attribute filter.';const hint=document.createElement('small');hint.className='reference-only';hint.textContent='Reference only — not submitted';td.append(hint);}tr.append(td);});body.append(tr);});table.append(body);container.replaceChildren(title,help,table);
}

