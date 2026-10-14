export const portalDefault = 'https://gisweb.reg.rw/portal';
export function secureUrl(value) { const u=new URL(value); if(u.protocol!=='https:') throw Error('An HTTPS URL is required.'); if(u.username||u.password||u.search||u.hash) throw Error('Use a clean URL without credentials or query parameters.'); return u.href.replace(/\/$/,''); }
export function randomKey(){const b=crypto.getRandomValues(new Uint8Array(32));return base64(b);}
export async function passwordSession(username,password,referer,fetcher=fetch){
 if(!username.trim()||!password)throw Error('Enter your REG username and password.');
 const origin=new URL(referer);if(origin.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(origin.hostname))throw Error('Password sign-in requires HTTPS.');
 const body=new URLSearchParams({f:'json',username:username.trim(),password,client:'referer',referer:origin.origin+'/',expiration:'60'});
 let response;
 try{response=await fetcher(portalDefault+'/sharing/rest/generateToken',{method:'POST',body,credentials:'omit',cache:'no-store',referrerPolicy:'origin',signal:AbortSignal.timeout(30000)});}catch{throw Error('Cannot reach REG sign-in from this app. REG must allow this website origin through CORS. For SSO accounts, use the registered portal sign-in option.');}finally{body.delete('password');password='';}
 let token;try{token=await response.json();}catch{throw Error('REG did not return a token response. Your account may require portal SSO.');}
 if(!response.ok||token.error||!token.token)throw Error('REG rejected sign-in. Check your username and password. Accounts requiring SSO or MFA must use registered portal sign-in.');
 if(!Number.isFinite(Number(token.expires))||Number(token.expires)<=Date.now())throw Error('REG returned an invalid or expired session.');
 return new ArcGIS(portalDefault,token.token,Number(token.expires),fetcher);
}
function base64(b){return btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
export async function challenge(verifier){return base64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));}
export function domainFor(meta,field,attrs){const type=meta.types?.find(t=>t.id===attrs[meta.typeIdField]);return type?.domains?.[field.name] ?? field.domain;}
export function editable(field,meta,user,attrs){
 const privileges=user?.privileges||[];
 const roleOk=privileges.includes('features:user:edit')||privileges.includes('features:user:fullEdit')||user?.role==='org_admin';
 if(!roleOk||!meta.capabilities?.split(',').map(x=>x.trim().toLowerCase()).includes('update')||field.editable!==true) return false;
 if(['esriFieldTypeOID','esriFieldTypeGlobalID','esriFieldTypeGeometry','esriFieldTypeBlob','esriFieldTypeRaster','esriFieldTypeXML'].includes(field.type)||field.name===meta.typeIdField) return false;
 const ownership=meta.ownershipBasedAccessControlForFeatures;
 if(ownership?.allowOthersToUpdate===false){const creator=meta.editFieldsInfo?.creatorField; if(!creator||attrs[creator]!==user.username) return false;}
 if(meta.isDataVersioned||meta.isDataArchived) return false;
 return true;
}
export function parseValue(text,field,domain,isNull=false){
 if(isNull){if(field.nullable===false)throw Error('This field does not allow null.');return null;}
 let value=text;
 if(['esriFieldTypeSmallInteger','esriFieldTypeInteger','esriFieldTypeSingle','esriFieldTypeDouble','esriFieldTypeBigInteger'].includes(field.type)){
  if(text.trim()==='')throw Error('Enter a number or explicitly choose null.');value=Number(text);if(!Number.isFinite(value))throw Error('Enter a finite number.');
  if(['esriFieldTypeSmallInteger','esriFieldTypeInteger','esriFieldTypeBigInteger'].includes(field.type)&&!Number.isSafeInteger(value))throw Error('Enter a safe whole number.');
  if(field.type==='esriFieldTypeSmallInteger'&&(value < -32768||value>32767))throw Error('Number exceeds the small integer range.');
  if(field.type==='esriFieldTypeInteger'&&(value < -2147483648||value>2147483647))throw Error('Number exceeds the integer range.');
 } else if(field.type==='esriFieldTypeDate'){value=Date.parse(text);if(!Number.isFinite(value))throw Error('Enter a valid date with timezone.');}
 else if(field.type==='esriFieldTypeString'){if(field.length&&text.length>field.length)throw Error(`Maximum length is ${field.length}.`);}
 else if(['esriFieldTypeGUID'].includes(field.type)){if(!/^\{?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}?$/i.test(text))throw Error('Enter a valid GUID.');}
 else throw Error('This field type is read-only in this app.');
 if(domain?.type==='codedValue'&&!domain.codedValues.some(c=>c.code===value))throw Error('Select an allowed domain value.');
 if(domain?.type==='range'&&(value<domain.range[0]||value>domain.range[1]))throw Error(`Allowed range: ${domain.range.join(' – ')}.`);
 return value;
}
export function inspect(meta,features){return meta.fields.map(f=>{let nulls=0,invalid=0;for(const feature of features){const v=feature.attributes[f.name],d=domainFor(meta,f,feature.attributes);if(v==null)nulls++;else if(d?.type==='codedValue'&&!d.codedValues.some(c=>c.code===v)||d?.type==='range'&&(v<d.range[0]||v>d.range[1]))invalid++;}return {field:f.name,alias:f.alias||f.name,type:f.type,nullable:f.nullable!==false,nulls,invalid};});}
export class ArcGIS {
 constructor(portal,token,expires,fetcher=fetch){this.portal=secureUrl(portal);this.token=token;this.expires=expires;this.fetcher=fetcher;this.allowed=new Set([new URL(this.portal).origin]);}
 allow(url){const u=secureUrl(url);this.allowed.add(new URL(u).origin);return u;}
 async request(url,params={}){const u=secureUrl(url);if(!this.allowed.has(new URL(u).origin))throw Error('Service origin has not been approved.');if(Date.now()>=this.expires)throw Error('Session expired. Sign in again.');const body=new URLSearchParams({f:'json',...params,token:this.token});const r=await this.fetcher(u,{method:'POST',body,credentials:'omit',cache:'no-store',referrerPolicy:'origin'});if(!r.ok)throw Error(`Service request failed (${r.status}).`);const j=await r.json();if(j.error)throw Error(`ArcGIS ${j.error.code}: ${j.error.message}. ${(j.error.details||[]).join(' ')}`);return j;}
 async discover(term=''){let results=[],start=1;do{const j=await this.request(this.portal+'/sharing/rest/search',{q:`type:"Feature Service" ${term}`,start,num:100,sortField:'title',sortOrder:'asc'});results.push(...(j.results||[]));start=j.nextStart;}while(start>0);return results;}
 async ids(url,where='1=1'){const j=await this.request(url+'/query',{where,returnIdsOnly:true});if(!Array.isArray(j.objectIds))throw Error('Service did not return object IDs.');return [...new Set(j.objectIds)].sort((a,b)=>a-b);}
 async records(url,ids,meta){if(!ids.length)return [];const j=await this.request(url+'/query',{objectIds:ids.join(','),outFields:'*',returnGeometry:false});const features=j.features||[];const key=meta.objectIdField||meta.fields.find(f=>f.type==='esriFieldTypeOID')?.name;const found=new Set(features.map(f=>f.attributes[key]));if(j.exceededTransferLimit||ids.some(id=>!found.has(id))){if(ids.length===1)throw Error(`Record ${ids[0]} is missing or inaccessible; refresh and retry.`);const m=Math.floor(ids.length/2);return [...await this.records(url,ids.slice(0,m),meta),...await this.records(url,ids.slice(m),meta)];}const byId=new Map(features.map(f=>[f.attributes[key],f]));return ids.map(id=>byId.get(id));}
 async all(url,meta,where,progress=()=>{}){const ids=await this.ids(url,where);const size=Math.max(1,Math.min(meta.maxRecordCount||1000,500));let rows=[];for(let i=0;i<ids.length;i+=size){rows.push(...await this.records(url,ids.slice(i,i+size),meta));progress(rows.length,ids.length);}return rows;}
}
