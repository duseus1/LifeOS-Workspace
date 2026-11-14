pub mod storage;
use std::{path::PathBuf,sync::Mutex};
use tauri::Manager;
use tauri_plugin_opener::OpenerExt;
use storage::{Brain,Document,SaveResult,Recovery};
struct AppState(Mutex<Option<Brain>>);
type Result<T> = std::result::Result<T,String>;
fn with_brain<T>(state:&tauri::State<AppState>,f:impl FnOnce(&Brain)->Result<T>)->Result<T>{let guard=state.0.lock().map_err(|e|e.to_string())?;f(guard.as_ref().ok_or("Open a brain first.")?)}
#[tauri::command]
fn open_brain(app:tauri::AppHandle,state:tauri::State<AppState>,path:String,create:bool)->Result<String>{
 let brain=if create {Brain::create(PathBuf::from(&path).as_path())?}else{Brain::open(PathBuf::from(&path).as_path())?};
 app.asset_protocol_scope().allow_directory(&brain.root,true).map_err(|e|e.to_string())?;
 let root=brain.root.to_string_lossy().to_string();
 let config=app.path().app_config_dir().map_err(|e|e.to_string())?;std::fs::create_dir_all(&config).map_err(|e|e.to_string())?;
 std::fs::write(config.join("last-brain.txt"),&root).map_err(|e|e.to_string())?;
 *state.0.lock().map_err(|e|e.to_string())?=Some(brain);Ok(root)
}
#[tauri::command]
fn default_brain_path(app:tauri::AppHandle)->Result<String>{Ok(app.path().document_dir().map_err(|e|e.to_string())?.join("LifeOS Brains/My Brain").to_string_lossy().to_string())}
#[tauri::command]
fn current_brain(app:tauri::AppHandle,state:tauri::State<AppState>)->Result<Option<String>>{
 let config=app.path().app_config_dir().map_err(|e|e.to_string())?.join("last-brain.txt");
 if !config.exists(){return Ok(None)}
 let path=std::fs::read_to_string(config).map_err(|e|e.to_string())?;
 let brain=Brain::open(PathBuf::from(&path).as_path())?;
 app.asset_protocol_scope().allow_directory(&brain.root,true).map_err(|e|e.to_string())?;
 *state.0.lock().map_err(|e|e.to_string())?=Some(brain);Ok(Some(path))
}
#[tauri::command]
fn list_documents(state:tauri::State<AppState>)->Result<Vec<Document>>{with_brain(&state,|b|b.list())}
#[tauri::command]
fn read_document(state:tauri::State<AppState>,path:String)->Result<Document>{with_brain(&state,|b|b.read(&path))}
#[tauri::command]
fn save_document(state:tauri::State<AppState>,path:String,content:String,revision:Option<String>)->Result<SaveResult>{with_brain(&state,|b|b.save(&path,&content,revision.as_deref()))}
#[tauri::command]
fn move_document(state:tauri::State<AppState>,from:String,to:String,revision:String)->Result<Document>{with_brain(&state,|b|b.move_document(&from,&to,&revision))}
#[tauri::command]
fn trash_document(state:tauri::State<AppState>,path:String,revision:String)->Result<()>{with_brain(&state,|b|b.trash(&path,&revision))}
#[tauri::command]
fn trash_items(state:tauri::State<AppState>)->Result<Vec<Recovery>>{with_brain(&state,|b|b.trash_items())}
#[tauri::command]
fn history(state:tauri::State<AppState>,path:String)->Result<Vec<Recovery>>{with_brain(&state,|b|b.history(&path))}
#[tauri::command]
fn restore(state:tauri::State<AppState>,id:String)->Result<SaveResult>{with_brain(&state,|b|b.restore(&id))}
#[tauri::command]
fn search(state:tauri::State<AppState>,query:String)->Result<Vec<Document>>{with_brain(&state,|b|b.search(&query))}
#[tauri::command]
fn settings(state:tauri::State<AppState>)->Result<serde_json::Value>{with_brain(&state,|b|b.settings())}
#[tauri::command]
fn save_settings(state:tauri::State<AppState>,value:serde_json::Value)->Result<()>{with_brain(&state,|b|b.save_settings(value))}
#[tauri::command]
fn import_attachment(state:tauri::State<AppState>,source:String)->Result<String>{with_brain(&state,|b|b.import_attachment(PathBuf::from(source).as_path()))}
#[tauri::command]
fn import_theme(state:tauri::State<AppState>,source:String)->Result<String>{with_brain(&state,|b|b.import_theme(PathBuf::from(source).as_path()))}
#[tauri::command]
fn read_theme(state:tauri::State<AppState>,path:String)->Result<String>{with_brain(&state,|b|b.read_theme(&path))}
#[tauri::command]
fn attachment_url_path(state:tauri::State<AppState>,path:String)->Result<String>{with_brain(&state,|b|Ok(b.attachment_path(&path)?.to_string_lossy().to_string()))}
#[tauri::command]
fn open_resource(app:tauri::AppHandle,state:tauri::State<AppState>,path:String)->Result<()> {
 if path.starts_with("https://")||path.starts_with("http://")||path.starts_with("mailto:"){return app.opener().open_url(path,None::<&str>).map_err(|e|e.to_string())}
 let full=with_brain(&state,|b|b.attachment_path(&path))?;
 let extension=full.extension().and_then(|s|s.to_str()).unwrap_or("").to_ascii_lowercase();
 if !["pdf","png","jpg","jpeg","gif","webp","txt","csv","mp3","mp4","m4a","wav","mov","docx","xlsx"].contains(&extension.as_str()){return Err("This file type is stored safely, but cannot be opened from LifeOS yet.".into())}
 app.opener().open_path(full.to_string_lossy().to_string(),None::<&str>).map_err(|e|e.to_string())
}
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run(){tauri::Builder::default().plugin(tauri_plugin_dialog::init()).plugin(tauri_plugin_opener::init()).manage(AppState(Mutex::new(None))).invoke_handler(tauri::generate_handler![open_brain,default_brain_path,current_brain,list_documents,read_document,save_document,move_document,trash_document,trash_items,history,restore,search,settings,save_settings,import_attachment,import_theme,read_theme,attachment_url_path,open_resource]).run(tauri::generate_context!()).expect("LifeOS could not start");}
