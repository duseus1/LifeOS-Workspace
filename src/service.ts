import { invoke, isTauri, convertFileSrc } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { defaultHomebase } from './domain';
export type Document={path:string;content:string;revision:string};
export type SaveResult={document:Document;conflict:boolean};
export type Recovery={id:string;path:string;content:string;timestamp:number};
export type Settings={aliases?:Record<string,string>;theme?:string;fontSize?:number;spacing?:string;css?:string;cssFile?:string;showPriority?:boolean;destinations?:Record<string,string>};
export const native=isTauri();
type Preview={documents:Record<string,Document>;trash:Recovery[];history:Recovery[];settings:Settings};
function load():Preview{return JSON.parse(localStorage.getItem('lifeos-preview')||'{"documents":{},"trash":[],"history":[],"settings":{}}');}
function persist(value:Preview){localStorage.setItem('lifeos-preview',JSON.stringify(value));}
function validate(path:string){if(!path.endsWith('.md')||path.startsWith('/')||path.split('/').some(p=>p==='..'||p==='.'||p==='')||path.startsWith('.lifeos/'))throw Error('Use a Markdown path inside this brain.');}
function rev(){return crypto.randomUUID();}
async function command<T>(name:string,args:Record<string,unknown>={}):Promise<T>{
 if(native)return invoke<T>(name,args);
 const db=load();let result:any;
 switch(name){
  case 'current_brain':result=localStorage.getItem('lifeos-preview-open')?'Browser preview':null;break;
  case 'open_brain':localStorage.setItem('lifeos-preview-open','true');if(!db.documents['homebase.md']){db.documents['homebase.md']={path:'homebase.md',content:defaultHomebase,revision:rev()};db.documents['Templates/Daily journal.md']={path:'Templates/Daily journal.md',content:'# {{date}}\n\n## On my mind\n\n## Today\n',revision:rev()};}result='Browser preview';break;
  case 'list_documents':result=Object.values(db.documents).sort((a,b)=>a.path.localeCompare(b.path));break;
  case 'read_document':result=db.documents[String(args.path)];if(!result)throw Error('Note not found.');break;
  case 'save_document':{
   let path=String(args.path);validate(path);const existing=db.documents[path];const conflict=!!existing&&existing.revision!==args.revision||!existing&&!!args.revision;
   if(conflict)path=path.replace(/\.md$/,` (conflict ${rev().slice(0,8)}).md`);
   else if(existing)db.history.unshift({id:rev(),path,content:existing.content,timestamp:Date.now()});
   const document={path,content:String(args.content),revision:rev()};db.documents[path]=document;result={document,conflict};break;
  }
  case 'trash_document':{const path=String(args.path),d=db.documents[path];if(!d||d.revision!==args.revision)throw Error('Note changed. Reopen before deleting.');db.trash.unshift({id:rev(),path,content:d.content,timestamp:Date.now()});delete db.documents[path];break;}
  case 'trash_items':result=db.trash;break;
  case 'history':result=db.history.filter(i=>i.path===args.path);break;
  case 'restore':{const item=db.trash.find(i=>i.id===args.id);if(!item)throw Error('Item not found.');result=await command('save_document',{path:item.path,content:item.content});const fresh=load();fresh.trash=fresh.trash.filter(i=>i.id!==item.id);persist(fresh);return result;}
  case 'move_document':{const from=String(args.from),to=String(args.to);validate(to);const item=db.documents[from];if(!item||item.revision!==args.revision)throw Error('Note changed.');if(db.documents[to])throw Error('A note already exists there.');result={...item,path:to};db.documents[to]=result;delete db.documents[from];db.settings.aliases={...db.settings.aliases,[from]:to};for(const key in db.settings.aliases){if(db.settings.aliases[key]===from)db.settings.aliases[key]=to;}break;}
  case 'search':result=Object.values(db.documents).filter(d=>(d.path+'\n'+d.content).toLowerCase().includes(String(args.query).toLowerCase()));break;
  case 'settings':result=db.settings;break;
  case 'save_settings':db.settings=args.value as Settings;break;
  default:throw Error('This action requires the desktop app.');
 }
 persist(db);return result as T;
}
export const api={
 current:()=>command<string|null>('current_brain'),
 defaultPath:()=>command<string>('default_brain_path'),
 openPath:(path:string,create:boolean)=>command<string>('open_brain',{path,create}),
 browse:async()=>{const selected=await open({directory:true,multiple:false,canCreateDirectories:true,recursive:true});return typeof selected==='string'?selected:null;},
 choose:async(create:boolean)=>{let path:string|null='preview';if(native){const choice=await open({directory:true,multiple:false,title:create?'Choose a folder for your brain':'Open a brain'});path=typeof choice==='string'?choice:null;}return path?command<string>('open_brain',{path,create}):null;},
 list:()=>command<Document[]>('list_documents'),read:(path:string)=>command<Document>('read_document',{path}),
 save:(path:string,content:string,revision?:string)=>command<SaveResult>('save_document',{path,content,revision:revision??null}),
 move:(from:string,to:string,revision:string)=>command<Document>('move_document',{from,to,revision}),
 trash:(path:string,revision:string)=>command<void>('trash_document',{path,revision}),
 trashItems:()=>command<Recovery[]>('trash_items'),history:(path:string)=>command<Recovery[]>('history',{path}),restore:(id:string)=>command<SaveResult>('restore',{id}),
 search:(query:string)=>command<Document[]>('search',{query}),settings:()=>command<Settings>('settings'),saveSettings:(value:Settings)=>command<void>('save_settings',{value}),
 attachment:async()=>{if(!native)throw Error('Open the desktop app to attach local files.');const source=await open({multiple:false});if(typeof source!=='string')return null;return command<string>('import_attachment',{source});}
 ,importCSS:async()=>{if(!native)throw Error('Open the desktop app to import a CSS file.');const source=await open({multiple:false,filters:[{name:'CSS',extensions:['css']}]});if(typeof source!=='string')return null;const path=await command<string>('import_theme',{source});return {path,css:await command<string>('read_theme',{path})};}
};
export function relativeResource(from:string,href:string):string {
 const pieces=from.split('/').slice(0,-1);for(const part of decodeURIComponent(href).split('/')){if(part==='..'){if(!pieces.length)throw Error('Link points outside this brain.');pieces.pop();}else if(part&&part!=='.')pieces.push(part);}return pieces.join('/');
}
export async function resourceURL(path:string){return convertFileSrc(await command<string>('attachment_url_path',{path}));}
export async function openResource(path:string){if(native)await command<void>('open_resource',{path});else if(/^https?:\/\//.test(path))window.open(path,'_blank','noopener,noreferrer');else throw Error('Open local attachments in the Mac app.');}
