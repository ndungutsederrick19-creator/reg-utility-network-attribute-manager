const supported=new Set(['esriFieldTypeString','esriFieldTypeSmallInteger','esriFieldTypeInteger','esriFieldTypeSingle','esriFieldTypeDouble','esriFieldTypeBigInteger','esriFieldTypeDate','esriFieldTypeGUID']);
export function excelCellEditable(field,meta){return !!field&&field.editable===true&&supported.has(field.type)&&field.name!==meta.typeIdField&&(!Array.isArray(meta.__allowedFields)||meta.__allowedFields.includes(field.name));}
export function renderExcelEditor(container,rows,mapping,meta){
 const title=document.createElement('h3');title.textContent='Edit or fill in uploaded Excel values';
 const help=document.createElement('p');help.textContent='Changes here stay in this app until you apply, review and confirm. Blank cells leave UN values unchanged. Use __NULL__ to clear a nullable value. Global IDs and protected fields are locked. Permissions and domains are checked at review.';
 const table=document.createElement('table'),head=document.createElement('thead'),header=document.createElement('tr');
 mapping.forEach(m=>{const th=document.createElement('th');th.textContent=m?m.header+' → '+m.field.name:'Unused column';header.append(th);});head.append(header);table.append(head);
 const body=document.createElement('tbody');
 rows.slice(1).forEach((row,r)=>{const tr=document.createElement('tr');mapping.forEach((m,c)=>{const td=document.createElement('td');if(excelCellEditable(m?.field,meta)){const input=document.createElement('input');input.type='text';input.value=row[c]??'';input.setAttribute('aria-label','Excel row '+(r+2)+' '+m.field.name);input.placeholder='Leave unchanged';input.addEventListener('input',()=>{row[c]=input.value;});td.append(input);}else{td.textContent=String(row[c]??'');td.title='Locked: identifies the device, is protected, or is excluded by the attribute filter.';}tr.append(td);});body.append(tr);});table.append(body);container.replaceChildren(title,help,table);
}
