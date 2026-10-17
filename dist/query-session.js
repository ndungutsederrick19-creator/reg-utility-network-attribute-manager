import {cleanBoundary} from './boundary-filter.js?v=boundary-20261017';
export function queryKey(portal,user){if(!portal||!user)throw Error('Sign in first.');return 'reg.query.v1:'+JSON.stringify([portal,user]);}
export function cleanQuery(input){
 const https=value=>{const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw Error('Invalid saved service URL.');return url.href.replace(/\/$/,'');};
 const service=https(input.service),layer=https(input.layer),m=input.monitor;
 if(input.version!==1||! /\/FeatureServer$/i.test(service)||!layer.startsWith(service+'/')||!/^\d+$/.test(layer.slice(service.length+1))||!m||!Array.isArray(m.layers)||!Array.isArray(m.users)||!['creator','editor'].includes(m.role)||![60000,300000,900000].includes(m.interval))throw Error('Invalid saved query.');
 const strings=items=>{if(!Array.isArray(items)||items.length>10000||!items.every(x=>typeof x==='string'&&x.length<10000))throw Error('Invalid saved selections.');return [...new Set(items)];};
 const monitor={boundary:cleanBoundary(m.boundary),allUsers:m.allUsers===true,version:1,name:String(m.name||'My survey monitoring').slice(0,120),role:m.role,interval:m.interval,users:strings(m.users),layers:m.layers.map(item=>{const url=https(item.url);if(!url.startsWith(service+'/')||!/^\d+$/.test(url.slice(service.length+1))||typeof item.source!=='string')throw Error('Invalid saved monitor layer.');return {url,source:item.source,collectedField:typeof item.collectedField==='string'?item.collectedField:undefined,required:strings(item.required),space:['Electric Device','Structure Junction','Electric Line','Other layers'].includes(item.space)?item.space:undefined};})};
 return {version:1,service,layer,profile:String(input.profile||''),where:String(input.where||'1=1'),globalIds:String(input.globalIds||''),page:Number.isSafeInteger(input.page)&&input.page>=0?input.page:0,workspace:input.workspace==='survey'?'survey':'manager',monitor};
}
export function saveQuery(storage,key,input){const data={...cleanQuery(input),savedAt:new Date().toISOString()};storage.setItem(key,JSON.stringify(data));return data;}
export function readQuery(storage,key){if(!key)return null;const raw=storage.getItem(key);if(!raw)return null;const input=JSON.parse(raw);return {...cleanQuery(input),savedAt:input.savedAt};}
