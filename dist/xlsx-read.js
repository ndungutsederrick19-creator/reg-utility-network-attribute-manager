const decode=new TextDecoder();
const LIMIT=32*1024*1024;
function crc(bytes){let value=0xffffffff;for(const b of bytes){value^=b;for(let n=0;n<8;n++)value=(value>>>1)^((value&1)?0xedb88320:0);}return (value^0xffffffff)>>>0;}
export async function unzipXlsx(buffer){
 const bytes=new Uint8Array(buffer),v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);if(bytes.length>25*1024*1024)throw Error('Excel upload limit is 25 MB.');let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(v.getUint32(i,true)===0x06054b50){end=i;break;}
 if(end<0)throw Error('This is not a supported XLSX file. Use Excel Workbook (.xlsx).');
 const count=v.getUint16(end+10,true);let pos=v.getUint32(end+16,true),total=0;const files=new Map();if(count>2000)throw Error('The workbook contains too many ZIP entries.');
 for(let n=0;n<count;n++){
  if(pos+46>bytes.length||v.getUint32(pos,true)!==0x02014b50)throw Error('Invalid XLSX ZIP directory.');
  const flags=v.getUint16(pos+8,true),method=v.getUint16(pos+10,true),packed=v.getUint32(pos+20,true),size=v.getUint32(pos+24,true),len=v.getUint16(pos+28,true),extra=v.getUint16(pos+30,true),comment=v.getUint16(pos+32,true),offset=v.getUint32(pos+42,true);const name=decode.decode(bytes.slice(pos+46,pos+46+len));pos+=46+len+extra+comment;
  if(flags&1)throw Error('Password-protected workbooks are not supported.');if(size>LIMIT||(total+=size)>64*1024*1024)throw Error('The uncompressed workbook is too large.');if(offset+30>bytes.length||v.getUint32(offset,true)!==0x04034b50)throw Error('Invalid XLSX entry.');
  const start=offset+30+v.getUint16(offset+26,true)+v.getUint16(offset+28,true);if(start+packed>bytes.length)throw Error('Truncated XLSX entry.');if(!/\.xml$|\.rels$/.test(name))continue;
  let data=bytes.slice(start,start+packed);
  if(method===8){const reader=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();const chunks=[];let length=0;try{for(;;){const r=await reader.read();if(r.done)break;length+=r.value.length;if(length>LIMIT||length>size)throw Error('Workbook decompression limit exceeded.');chunks.push(r.value);}}finally{reader.releaseLock();}data=new Uint8Array(length);let at=0;for(const chunk of chunks){data.set(chunk,at);at+=chunk.length;}}
  else if(method!==0)throw Error('Unsupported workbook compression.');
  if(data.length!==size||crc(data)!==v.getUint32(pos-46-len-extra-comment+16,true))throw Error('Damaged XLSX entry.');if(files.has(name))throw Error('Duplicate workbook ZIP entry.');files.set(name,decode.decode(data));
 }return files;
}
function parse(xml){if(!xml)throw Error('Required workbook data is missing.');if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('Unsupported workbook XML declarations.');const doc=new DOMParser().parseFromString(xml,'application/xml');if(doc.querySelector('parsererror'))throw Error('The workbook contains invalid XML.');return doc;}
const items=(node,name)=>[...node.getElementsByTagNameNS('*',name)];
export async function readXlsx(buffer){
 const files=await unzipXlsx(buffer),book=parse(files.get('xl/workbook.xml')),rels=parse(files.get('xl/_rels/workbook.xml.rels'));const sheets=items(book,'sheet');const sheet=sheets.find(s=>s.getAttribute('name')==='Edits')||sheets.find(s=>s.getAttribute('state')!=='hidden');if(!sheet)throw Error('No visible worksheet was found.');
 const relation=items(rels,'Relationship').find(r=>r.getAttribute('Id')===sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id'));if(!relation||relation.getAttribute('TargetMode')==='External')throw Error('Invalid worksheet relationship.');
 const target=relation.getAttribute('Target');const path=target.startsWith('/')?target.slice(1):new URL(target,'https://xlsx.invalid/xl/').pathname.slice(1);if(!path.startsWith('xl/'))throw Error('Invalid worksheet path.');const doc=parse(files.get(path));
 const strings=files.has('xl/sharedStrings.xml')?items(parse(files.get('xl/sharedStrings.xml')),'si').map(si=>items(si,'t').map(t=>t.textContent).join('')):[];
 const dateStyles=new Set();if(files.has('xl/styles.xml')){const styles=parse(files.get('xl/styles.xml')),formats=new Map(items(styles,'numFmt').map(f=>[Number(f.getAttribute('numFmtId')),f.getAttribute('formatCode')]));const xfs=items(styles,'cellXfs')[0];if(xfs)[...xfs.children].forEach((xf,i)=>{const id=Number(xf.getAttribute('numFmtId')),fmt=(formats.get(id)||'').replace(/"[^"]*"|\[[^\]]*\]|\\./g,'');if(id>=14&&id<=22||id>=45&&id<=47||/[ymdhs]/i.test(fmt))dateStyles.add(i);});}
 const date1904=items(book,'workbookPr')[0]?.getAttribute('date1904');const epoch=date1904==='1'||date1904==='true'?Date.UTC(1904,0,1):Date.UTC(1899,11,30);
 const rows=[];for(const row of items(doc,'row')){const values=[];for(const c of items(row,'c')){const ref=c.getAttribute('r')||'',letters=ref.match(/^[A-Z]+/i)?.[0];if(!letters)throw Error('Workbook cell reference is missing.');let col=0;for(const ch of letters.toUpperCase())col=col*26+ch.charCodeAt(0)-64;if(col>1500)throw Error('Import at most 1500 columns.');if(items(c,'f').length)throw Error(`Formula cell ${ref} is not allowed. Paste values before uploading.`);const type=c.getAttribute('t'),raw=items(c,'v')[0]?.textContent;let value='';if(type==='inlineStr')value=items(c,'t').map(t=>t.textContent).join('');else if(type==='s'){value=strings[Number(raw)];if(value===undefined)throw Error('Invalid shared string reference.');}else if(type==='b')value=raw==='1';else if(type==='e')throw Error(`Excel error in cell ${ref}.`);else if(type==='str'||type==='d')value=raw||'';else if(raw!==undefined&&raw!==''){value=Number(raw);if(!Number.isFinite(value))throw Error(`Invalid number at ${ref}.`);if(dateStyles.has(Number(c.getAttribute('s')||0))){const ms=epoch+value*86400000;if(!Number.isFinite(ms))throw Error('Invalid Excel date.');value=new Date(ms).toISOString();}}
 values[col-1]=value;}if(values.some(value=>value!==''&&value!=null)){rows.push(values);if(rows.length>501)throw Error('Import at most 500 device rows plus a header.');}}
 return {name:sheet.getAttribute('name'),rows};
}

