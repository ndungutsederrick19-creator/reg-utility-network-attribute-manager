import {excelCellEditable} from './excel-editor.js?v=structured-save-20261015';
import {globalIdField} from './core.js?v=20261015-template';
export function mappedExcelRows(rows,mapping){
 const selected=[],seen=new Map();
 mapping.forEach((m,index)=>{if(m.ignore)return;if(!m.field)throw Error('Choose a UN field or Ignore for Excel column '+(index+1)+' ('+m.header+').');const prior=seen.get(m.field.name);if(prior!==undefined)throw Error('Excel columns '+(prior+1)+' ('+mapping[prior].header+') and '+(index+1)+' ('+m.header+') both map to '+m.field.name+'. In Column matching, keep one and choose Ignore for the other, or map it to its correct field.');seen.set(m.field.name,index);selected.push(index);});
 return rows.map((row,r)=>selected.map(index=>r===0?mapping[index].field.name:row[index]));
}
export function mergeIdenticalColumns(rows,mapping){
 const seen=new Map(),notices=[];mapping.forEach((m,index)=>{if(!m?.field||m.ignore)return;const previous=seen.get(m.field.name);if(previous===undefined){seen.set(m.field.name,index);return;}if(rows.slice(1).every(row=>String(row[index]??'')===String(row[previous]??''))){m.ignore=true;notices.push('Column '+(index+1)+' ('+m.header+') repeats column '+(previous+1)+' with identical values; included once as '+m.field.name+'.');}});return notices;
}
export function renderColumnMapping(container,mapping,meta,onChange){
 const title=document.createElement('h3');title.textContent='1. Match Excel columns to UN fields';
 const help=document.createElement('p');help.textContent='Each Excel column must map to one actual UN field or be explicitly ignored. If two columns target the same field, keep the intended one and ignore the other. Keep the Global ID column mapped to the Global ID field.';
 const summary=document.createElement('p');summary.setAttribute('role','status');
 function validate(){try{mappedExcelRows([[]],mapping);summary.textContent='Column matching ready. Edit values below, then Apply and submit to Utility Network.';summary.className='';}catch(e){summary.textContent=e.message;summary.className='error';}}
 const table=document.createElement('table');
 mapping.forEach((m,index)=>{const row=document.createElement('tr'),label=document.createElement('td'),cell=document.createElement('td'),select=document.createElement('select');label.textContent='Column '+(index+1)+': '+m.header;select.setAttribute('aria-label','Map Excel column '+(index+1)+' '+m.header);select.add(new Option('Choose a UN field…',''));select.add(new Option('Ignore this Excel column','__ignore__'));for(const f of meta.fields)select.add(new Option(f.name+' — '+(f.alias||f.name),f.name));select.value=m.ignore?'__ignore__':m.field?.name||'';select.onchange=()=>{m.ignore=select.value==='__ignore__';m.field=meta.fields.find(f=>f.name===select.value)||null;validate();onChange();};cell.append(select);row.append(label,cell);table.append(row);});container.replaceChildren(title,help,table,summary);validate();
}

export function writableExcelRows(rows,mapping,meta){const gid=globalIdField(meta);if(!gid)throw Error('This layer has no Global ID field.');return mappedExcelRows(rows,mapping.map(m=>({...m,ignore:!!m.ignore||!!m.field&&(m.field.name!==gid.name&&!excelCellEditable(m.field,meta))})));}
