use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{fs::{self, OpenOptions}, io::Write, path::{Component, Path, PathBuf}, time::{SystemTime, UNIX_EPOCH}};
use uuid::Uuid;
use walkdir::WalkDir;
type Result<T> = std::result::Result<T, String>;
fn err(e:impl std::fmt::Display)->String {e.to_string()}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Document {pub path:String,pub content:String,pub revision:String}
#[derive(Serialize, Deserialize, Debug)]
pub struct SaveResult {pub document:Document,pub conflict:bool}
#[derive(Serialize, Deserialize, Debug)]
pub struct Recovery {pub id:String,pub path:String,pub content:String,pub timestamp:u64}
#[derive(Clone)]
pub struct Brain {pub root:PathBuf}
fn hash(bytes:&[u8])->String {format!("{:x}",Sha256::digest(bytes))}
fn now()->u64 {SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as u64}
fn atomic(path:&Path,bytes:&[u8])->Result<()> {
 let parent=path.parent().ok_or("Missing parent directory")?;
 let tmp=parent.join(format!(".lifeos-write-{}",Uuid::new_v4()));
 let result=(|| {let mut file=OpenOptions::new().write(true).create_new(true).open(&tmp).map_err(err)?;file.write_all(bytes).map_err(err)?;file.sync_all().map_err(err)?;fs::rename(&tmp,path).map_err(err)?;Ok(())})();
 if result.is_err(){let _=fs::remove_file(&tmp);} result
}
impl Brain {
 pub fn create(root:&Path)->Result<Self>{
  if !root.is_absolute(){return Err("Enter the full path to your brain folder.".into())}
  fs::create_dir_all(root).map_err(err)?;let b=Self::open(root)?;
  for folder in ["Inbox","Templates","Journal","Contacts","Events","Tasks","Reminders","Attachments"] {b.ensure_dir(folder)?;}
  if !b.root.join("homebase.md").exists(){b.save("homebase.md",include_str!("../../docs/default-homebase.md"),None)?;}
  if !b.root.join("Templates/Daily journal.md").exists(){b.save("Templates/Daily journal.md","# {{date}}\n\n## On my mind\n\n\n## Today\n\n",None)?;}
  Ok(b)
 }
 pub fn open(root:&Path)->Result<Self>{
  if !root.is_absolute(){return Err("Enter the full path to your brain folder.".into())}
  if !root.is_dir(){return Err("Choose an existing folder for your brain.".into())}
  let b=Self{root:root.canonicalize().map_err(err)?};
  for folder in [".lifeos",".lifeos/history",".lifeos/trash"]{b.ensure_dir(folder)?;}
  Ok(b)
 }
 fn checked(&self,relative:&str,internal:bool)->Result<PathBuf>{
  let p=Path::new(relative);
  if relative.is_empty()||p.components().any(|c|!matches!(c,Component::Normal(_)))||relative.contains('\\'){return Err("Use a path inside this brain.".into())}
  if !internal&&p.components().next().map(|c|c.as_os_str()==".lifeos").unwrap_or(false){return Err("Internal files cannot be edited as notes.".into())}
  let mut target=self.root.clone();
  for part in p.components(){target.push(part);if let Ok(meta)=fs::symlink_metadata(&target){if meta.file_type().is_symlink(){return Err("Symbolic links are not supported inside a brain.".into())}}}
  Ok(target)
 }
 fn ensure_dir(&self,relative:&str)->Result<()> {let p=self.checked(relative,true)?;fs::create_dir_all(p).map_err(err)}
 fn note_path(&self,path:&str)->Result<PathBuf>{if !path.ends_with(".md"){return Err("Notes must use the .md extension.".into())}self.checked(path,false)}
 pub fn read(&self,path:&str)->Result<Document>{let p=self.note_path(path)?;let content=fs::read_to_string(p).map_err(err)?;let revision=hash(content.as_bytes());Ok(Document{path:path.into(),content,revision})}
 fn archive(&self,area:&str,path:&str,content:&str)->Result<()> {
  let item=Recovery{id:Uuid::new_v4().to_string(),path:path.into(),content:content.into(),timestamp:now()};
  atomic(&self.checked(&format!(".lifeos/{area}/{}.json",item.id),true)?,&serde_json::to_vec(&item).map_err(err)?)
 }
 pub fn save(&self,path:&str,content:&str,revision:Option<&str>)->Result<SaveResult>{
  let target=self.note_path(path)?;
  let current=if target.exists(){Some(self.read(path)?)}else{None};
  let conflict=match &current{Some(d)=>revision!=Some(d.revision.as_str()),None=>revision.is_some()};
  if conflict {
   let alternate=format!("{} (conflict {}).md",path.trim_end_matches(".md"),Uuid::new_v4().simple());
   let mut saved=self.save(&alternate,content,None)?;saved.conflict=true;return Ok(saved)
  }
  if let Some(d)=&current{if d.content==content{return Ok(SaveResult{document:d.clone(),conflict:false})}self.archive("history",path,&d.content)?;}
  let parent=target.parent().ok_or("Missing parent")?;fs::create_dir_all(parent).map_err(err)?;
  // Recheck just before replacement; commands are serialized by the application mutex.
  if let Some(d)=&current{if fs::read(&target).map(|b|hash(&b)).ok().as_deref()!=Some(&d.revision){return self.save(path,content,revision)}}
  atomic(&target,content.as_bytes())?;
  Ok(SaveResult{document:self.read(path)?,conflict:false})
 }
 pub fn list(&self)->Result<Vec<Document>>{
  let mut result=Vec::new();
  for entry in WalkDir::new(&self.root).follow_links(false).into_iter().filter_entry(|e|e.depth()==0||e.file_name()!=".lifeos"){
   let entry=entry.map_err(err)?;
   if entry.file_type().is_file()&&entry.path().extension().is_some_and(|e|e=="md"){
    let relative=entry.path().strip_prefix(&self.root).map_err(err)?.to_string_lossy().replace('\\',"/");
    result.push(self.read(&relative)?);
   }
  }
  result.sort_by(|a,b|a.path.cmp(&b.path));Ok(result)
 }
 pub fn trash(&self,path:&str,revision:&str)->Result<()> {
  let doc=self.read(path)?;if doc.revision!=revision{return Err("This note changed. Reopen it before deleting.".into())}
  self.archive("trash",path,&doc.content)?;fs::remove_file(self.note_path(path)?).map_err(err)
 }
 fn recovery(&self,area:&str)->Result<Vec<Recovery>> {
  let mut items=Vec::new();for entry in fs::read_dir(self.checked(&format!(".lifeos/{area}"),true)?).map_err(err)?{let path=entry.map_err(err)?.path();if path.extension().is_some_and(|e|e=="json"){let relative=path.strip_prefix(&self.root).map_err(err)?.to_string_lossy();let checked=self.checked(&relative,true)?;items.push(serde_json::from_slice::<Recovery>(&fs::read(checked).map_err(err)?).map_err(err)?);}}
  items.sort_by(|a,b|b.timestamp.cmp(&a.timestamp));Ok(items)
 }
 pub fn history(&self,path:&str)->Result<Vec<Recovery>>{Ok(self.recovery("history")?.into_iter().filter(|i|i.path==path).collect())}
 pub fn trash_items(&self)->Result<Vec<Recovery>>{self.recovery("trash")}
 pub fn restore(&self,id:&str)->Result<SaveResult>{
  let item=self.trash_items()?.into_iter().find(|i|i.id==id).ok_or("Trash item not found")?;
  let result=self.save(&item.path,&item.content,None)?;
  fs::remove_file(self.checked(&format!(".lifeos/trash/{}.json",item.id),true)?).map_err(err)?;Ok(result)
 }
 pub fn move_document(&self,from:&str,to:&str,revision:&str)->Result<Document>{
  let doc=self.read(from)?;if doc.revision!=revision{return Err("This note changed. Reopen it before moving.".into())}
  let target=self.note_path(to)?;if target.exists(){return Err("A note already exists at that location.".into())}
  fs::create_dir_all(target.parent().unwrap()).map_err(err)?;
  let mut settings=self.settings()?;
  if !settings.is_object(){return Err("Brain settings must be a JSON object.".into())}
  if !settings["aliases"].is_object(){settings["aliases"]=serde_json::json!({});}
  if let Some(aliases)=settings["aliases"].as_object_mut(){for value in aliases.values_mut(){if value.as_str()==Some(from){*value=serde_json::Value::String(to.into());}}aliases.insert(from.into(),serde_json::Value::String(to.into()));}
  fs::rename(self.note_path(from)?,&target).map_err(err)?;
  if let Err(e)=self.save_settings(settings){let _=fs::rename(&target,self.note_path(from)?);return Err(e)}
  self.read(to)
 }
 pub fn rebuild_index(&self)->Result<()>{
  let mut db=rusqlite::Connection::open(self.checked(".lifeos/index.sqlite",true)?).map_err(err)?;
  db.execute_batch("CREATE TABLE IF NOT EXISTS notes(path TEXT PRIMARY KEY, content TEXT NOT NULL, revision TEXT NOT NULL);").map_err(err)?;
  let tx=db.transaction().map_err(err)?;tx.execute("DELETE FROM notes",[]).map_err(err)?;
  for d in self.list()?{tx.execute("INSERT INTO notes(path,content,revision) VALUES(?1,?2,?3)",rusqlite::params![d.path,d.content,d.revision]).map_err(err)?;}
  tx.commit().map_err(err)
 }
 pub fn search(&self,query:&str)->Result<Vec<Document>>{
  self.rebuild_index()?;
  let db=rusqlite::Connection::open(self.checked(".lifeos/index.sqlite",true)?).map_err(err)?;
  let mut stmt=db.prepare("SELECT path,content,revision FROM notes WHERE instr(lower(path || char(10) || content),lower(?1)) > 0 ORDER BY path").map_err(err)?;
  let rows=stmt.query_map([query],|r|Ok(Document{path:r.get(0)?,content:r.get(1)?,revision:r.get(2)?})).map_err(err)?;
  rows.collect::<std::result::Result<Vec<_>,_>>().map_err(err)
 }
 pub fn settings(&self)->Result<serde_json::Value>{let p=self.checked(".lifeos/settings.json",true)?;if !p.exists(){return Ok(serde_json::json!({}))}serde_json::from_slice(&fs::read(p).map_err(err)?).map_err(err)}
 pub fn save_settings(&self,value:serde_json::Value)->Result<()>{atomic(&self.checked(".lifeos/settings.json",true)?,&serde_json::to_vec_pretty(&value).map_err(err)?)}
 pub fn attachment_path(&self,path:&str)->Result<PathBuf>{let p=self.checked(path,false)?;if !p.is_file(){return Err("Attachment not found.".into())}Ok(p)}
 pub fn import_theme(&self,source:&Path)->Result<String>{
  if source.extension().and_then(|s|s.to_str()).map(|s|s.to_ascii_lowercase())!=Some("css".into()){return Err("Choose a .css file.".into())}
  let bytes=fs::read(source).map_err(err)?;
  if bytes.len()>256*1024{return Err("CSS file must be smaller than 256 KB.".into())}
  std::str::from_utf8(&bytes).map_err(err)?;
  self.ensure_dir(".lifeos/themes")?;
  let relative=format!(".lifeos/themes/{}.css",Uuid::new_v4());
  atomic(&self.checked(&relative,true)?,&bytes)?;Ok(relative)
 }
 pub fn read_theme(&self,path:&str)->Result<String>{
  if !path.starts_with(".lifeos/themes/")||!path.ends_with(".css"){return Err("Invalid theme path.".into())}
  fs::read_to_string(self.checked(path,true)?).map_err(err)
 }
 pub fn import_attachment(&self,source:&Path)->Result<String>{
  if !source.is_file(){return Err("Select a file to attach.".into())}self.ensure_dir("Attachments")?;
  let name=source.file_name().ok_or("Missing filename")?.to_string_lossy();let relative=format!("Attachments/{}-{}",Uuid::new_v4().simple(),name);
  let target=self.checked(&relative,false)?;fs::copy(source,target).map_err(err)?;Ok(relative)
 }
}
