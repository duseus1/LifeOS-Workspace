import { parse, stringify, parseDocument } from 'yaml';
export type Properties = Record<string, any>;
export type CaptureType = 'thought'|'link'|'contact'|'event'|'document'|'task'|'reminder';
export type Widget = {id:string; type:string; width?:'half'|'full'; hidden?:boolean; project?:string; pins?:Pin[]};
export type Pin = {label:string; path?:string; template?:string; folder?:string; pattern?:string; period?:string};
export type Section = {raw:string; text?:string; widget?:Widget; error?:string};
export function localDate(date=new Date()):string { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
export function formatPhone(value:string):string {
 const raw=value.trim();
 if(!raw||/[a-zA-Z#;]/.test(raw))return raw;
 const digits=raw.replace(/\D/g,'');
 if(digits.length===10&&!raw.startsWith('+'))return `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`;
 if(digits.length===11&&digits.startsWith('1'))return `+1 ${digits.slice(1,4)}-${digits.slice(4,7)}-${digits.slice(7)}`;
 return raw;
}
export function parseNote(content:string):{properties:Properties; body:string} {
 const match=content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
 if(!match)return {properties:{},body:content};
 try {const p=parse(match[1]);return {properties:p && typeof p==='object'&&!Array.isArray(p)?p:{},body:content.slice(match[0].length)};} catch {return {properties:{},body:content};}
}
export function patchProperties(content:string, patch:Properties):string {
 const match=content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
 if(match){const doc=parseDocument(match[1]);if(doc.errors.length)throw Error('Fix the YAML properties before editing this record.');for(const [key,value] of Object.entries(patch))doc.set(key,value);return `---\n${doc.toString()}---\n${content.slice(match[0].length)}`;}
 return `---\n${stringify(patch)}---\n${content}`;
}
export function captureNote(type:CaptureType, fields:Properties):string {
 const f=Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,typeof v==='string'?v.trim():v]).filter(([,v])=>v!==''&&v!==undefined));
 if(type==='contact'&&!['name','phone','email'].some(k=>f[k]))throw Error('Enter a name, phone number, or email.');
 if(type==='contact'&&f.phone)f.phone=formatPhone(String(f.phone));
 if(type==='link'){let url:URL;try{url=new URL(f.url);}catch{throw Error('Enter a valid website URL.');}if(!['http:','https:'].includes(url.protocol))throw Error('Use an HTTP or HTTPS URL.');}
 if(type==='event'&&(!f.title||!f.date||(!f.allDay&&!f.time)))throw Error('Add a title, date, and time, or choose all-day.');
 if(['thought','task','reminder'].includes(type)&&!f.title&&!f.text)throw Error('Write something before saving.');
 if(type==='event'&&(!/^\d{4}-\d{2}-\d{2}$/.test(f.date)||localDate(new Date(f.date+'T12:00:00'))!==f.date))throw Error('Enter a real calendar date.');
 const title=f.title||f.name||f.phone||f.email||f.url||String(f.text||'').split('\n')[0].slice(0,80)||'Document';
 const properties:Properties={id:crypto.randomUUID(),type,title,created:new Date().toISOString(),...f};
 if(type==='task'){properties.completed=false;properties.priority=f.priority||'None';}
 if(type==='reminder')properties.dismissed=false;
 if(type==='event'&&!f.allDay){properties.timezone=Intl.DateTimeFormat().resolvedOptions().timeZone;const start=new Date(f.date+'T'+f.time);if(isNaN(start.getTime()))throw Error('Enter a valid event time.');properties.startsAt=start.toISOString();}
 delete properties.text;
 return `---\n${stringify(properties)}---\n# ${title}\n\n${f.text|| (type==='link'?f.url:'')}\n`;
}
export function taskState(p:Properties,today=localDate()) {return {visible:!p.completed&&(!p.planned||p.planned<=today),overdue:!p.completed&&!!p.due&&p.due<today};}
export function reminderVisible(p:Properties,now=new Date()) {return !p.dismissed&&(!p.snoozedUntil||new Date(p.snoozedUntil)<=now);}
export function templateTarget(folder:string,pattern:string,period:string,date=new Date(),title='Note'):string {
 let stamp=localDate(date);
 if(period==='monthly')stamp=stamp.slice(0,7);
 if(period==='weekly'){const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7)); const year=d.getUTCFullYear();const week=Math.ceil((((d.getTime()-Date.UTC(year,0,1))/86400000)+1)/7);stamp=`${year}-W${String(week).padStart(2,'0')}`;}
 if(period==='new')stamp+=`-${crypto.randomUUID().slice(0,8)}`;
 const name=(pattern||'{{date}}').replaceAll('{{date}}',stamp).replaceAll('{{title}}',title.replace(/[/\\:*?"<>|]/g,'-'));
 return `${folder}/${name.replace(/\.md$/i,'')}.md`;
}
export function parseHomebase(content:string):Section[] {
 const sections:Section[]=[];const re=/```lifeos[^\S\n]*\n([\s\S]*?)\n```/g;let start=0;let match;
 while((match=re.exec(content))){if(match.index>start)sections.push({raw:content.slice(start,match.index),text:content.slice(start,match.index)});try{const widget=JSON.parse(match[1]);if(!widget.id||!widget.type)throw Error('Missing widget id or type');sections.push({raw:match[0],widget});}catch{sections.push({raw:match[0],error:'This widget could not be read. Edit its Markdown to repair it.'});}start=re.lastIndex;}
 if(start<content.length)sections.push({raw:content.slice(start),text:content.slice(start)});return sections;
}
export function updateWidget(content:string,id:string,patch:Partial<Widget>) {return parseHomebase(content).map(s=>s.widget?.id===id?`\`\`\`lifeos\n${JSON.stringify({...s.widget,...patch},null,2)}\n\`\`\``:s.raw).join('');}
export function moveWidget(content:string,id:string,direction:-1|1) {const sections=parseHomebase(content);const positions=sections.map((s,i)=>s.widget?i:-1).filter(i=>i>=0);const at=positions.findIndex(i=>sections[i].widget?.id===id);const other=at+direction;if(other>=0&&other<positions.length){const a=positions[at],b=positions[other];[sections[a],sections[b]]=[sections[b],sections[a]];}return sections.map(s=>s.raw).join('');}
export const defaultHomebase=`# Homebase\n\nA little space for everything on your mind.\n\n\`\`\`lifeos\n{"id":"tasks","type":"tasks","width":"half"}\n\`\`\`\n\n\`\`\`lifeos\n{"id":"reminders","type":"reminders","width":"half"}\n\`\`\`\n\n\`\`\`lifeos\n{"id":"calendar","type":"calendar","width":"full"}\n\`\`\`\n\n\`\`\`lifeos\n{"id":"quick-notes","type":"quick-notes","width":"full","pins":[{"label":"Daily journal","template":"Templates/Daily journal.md","folder":"Journal","pattern":"{{date}}","period":"daily"}]}\n\`\`\`\n`;
export function titleOf(path:string,content:string){const note=parseNote(content);const title=String(note.properties.title||note.body.match(/^#\s+(.+)$/m)?.[1]||path.split('/').pop()?.replace(/\.md$/,''));return note.properties.type==='contact'&&note.properties.phone===title?formatPhone(title):title;}

export function eventWhen(p:Properties,timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone):{date:string;time:string}{
 if(p.allDay||!p.startsAt)return {date:p.date||'',time:p.allDay?'':p.time||''};
 const date=new Date(p.startsAt);if(isNaN(date.getTime()))return {date:p.date||'',time:p.time||''};
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]));
 return {date:`${parts.year}-${parts.month}-${parts.day}`,time:`${parts.hour}:${parts.minute}`};
}
