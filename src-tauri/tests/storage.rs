use lifeos_lib::storage::Brain;
use std::fs;

#[test]
fn saves_exact_markdown_and_reopens_after_restart() {
    let dir = tempfile::tempdir().unwrap();
    let brain = Brain::create(dir.path()).unwrap();
    let text = "---\ncustom: [preserve, me]\n---\n# Hello\n\n- [ ] A task\n";
    brain.save("Inbox/test.md", text, None).unwrap();
    let reopened = Brain::open(dir.path()).unwrap();
    assert_eq!(reopened.read("Inbox/test.md").unwrap().content, text);
}
#[test]
fn external_change_preserves_disk_and_incoming_draft() {
    let dir = tempfile::tempdir().unwrap(); let b = Brain::create(dir.path()).unwrap();
    let first = b.save("Inbox/test.md", "original", None).unwrap();
    fs::write(dir.path().join("Inbox/test.md"), "external").unwrap();
    let result = b.save("Inbox/test.md", "my draft", Some(&first.document.revision)).unwrap();
    assert!(result.conflict);
    assert_eq!(b.read("Inbox/test.md").unwrap().content, "external");
    assert_eq!(b.read(&result.document.path).unwrap().content, "my draft");
}
#[test]
fn trash_and_history_restore_without_overwriting() {
    let dir = tempfile::tempdir().unwrap(); let b = Brain::create(dir.path()).unwrap();
    let first = b.save("Inbox/a.md", "version one", None).unwrap();
    let second = b.save("Inbox/a.md", "version two", Some(&first.document.revision)).unwrap();
    let history = b.history("Inbox/a.md").unwrap();
    assert_eq!(history.len(), 1);
    assert_eq!(history[0].content, "version one");
    b.trash("Inbox/a.md", &second.document.revision).unwrap();
    assert!(b.read("Inbox/a.md").is_err());
    let item = b.trash_items().unwrap().remove(0);
    b.restore(&item.id).unwrap();
    assert_eq!(b.read("Inbox/a.md").unwrap().content, "version two");
}
#[test]
fn rejects_traversal_and_symlink_escape() {
    let dir = tempfile::tempdir().unwrap(); let b = Brain::create(dir.path()).unwrap();
    assert!(b.save("../escape.md", "bad", None).is_err());
    assert!(b.save("/tmp/escape.md", "bad", None).is_err());
    assert!(b.save(".lifeos/index.sqlite", "bad", None).is_err());
    #[cfg(unix)] {
        let outside = tempfile::tempdir().unwrap();
        std::os::unix::fs::symlink(outside.path(), dir.path().join("escape")).unwrap();
        assert!(b.save("escape/note.md", "bad", None).is_err());
    }
}
#[test]
fn index_rebuild_and_move_follow_source_files() {
    let dir = tempfile::tempdir().unwrap(); let b = Brain::create(dir.path()).unwrap();
    let note = b.save("Inbox/a.md", "needle in an unorganized note", None).unwrap();
    b.rebuild_index().unwrap();
    assert_eq!(b.search("needle").unwrap().len(), 1);
    fs::remove_file(dir.path().join(".lifeos/index.sqlite")).unwrap();
    b.rebuild_index().unwrap();
    assert_eq!(b.search("needle").unwrap()[0].path, "Inbox/a.md");
    b.move_document("Inbox/a.md", "Projects/a.md", &note.document.revision).unwrap();
    assert!(b.read("Inbox/a.md").is_err());
    assert_eq!(b.search("needle").unwrap()[0].path, "Projects/a.md");
}
#[test]
fn create_never_replaces_existing_homebase() {
    let dir = tempfile::tempdir().unwrap(); fs::write(dir.path().join("homebase.md"), "mine").unwrap();
    Brain::create(dir.path()).unwrap();
    assert_eq!(fs::read_to_string(dir.path().join("homebase.md")).unwrap(), "mine");
}
#[test]
fn missing_original_and_stale_delete_preserve_user_content() {
 let dir=tempfile::tempdir().unwrap();let b=Brain::create(dir.path()).unwrap();
 let original=b.save("Inbox/n.md","original",None).unwrap();
 fs::write(dir.path().join("Inbox/n.md"),"external").unwrap();
 assert!(b.trash("Inbox/n.md",&original.document.revision).is_err());
 fs::remove_file(dir.path().join("Inbox/n.md")).unwrap();
 let result=b.save("Inbox/n.md","unsaved draft",Some(&original.document.revision)).unwrap();
 assert!(result.conflict);assert_eq!(result.document.content,"unsaved draft");
}
#[test]
fn attachments_remain_binary_and_cannot_escape_brain() {
 let dir=tempfile::tempdir().unwrap();let b=Brain::create(dir.path()).unwrap();
 let source=tempfile::NamedTempFile::new().unwrap();fs::write(source.path(),[0,255,1,128]).unwrap();
 let path=b.import_attachment(source.path()).unwrap();
 assert_eq!(fs::read(b.attachment_path(&path).unwrap()).unwrap(),vec![0,255,1,128]);
 assert!(b.attachment_path("../outside.pdf").is_err());
}
#[test]
fn moving_a_note_records_a_portable_alias_without_losing_preferences() {
 let dir=tempfile::tempdir().unwrap();let b=Brain::create(dir.path()).unwrap();
 b.save_settings(serde_json::json!({"theme":"dark"})).unwrap();
 let doc=b.save("Inbox/original.md","# Original",None).unwrap();
 b.move_document("Inbox/original.md","Projects/renamed.md",&doc.document.revision).unwrap();
 let settings=b.settings().unwrap();assert_eq!(settings["theme"],"dark");assert_eq!(settings["aliases"]["Inbox/original.md"],"Projects/renamed.md");
}
#[test]
fn brain_paths_must_be_absolute_to_avoid_writing_beside_the_app() {
 assert!(Brain::create(std::path::Path::new("My Brain")).is_err());
 assert!(Brain::open(std::path::Path::new("My Brain")).is_err());
}
#[test]
fn theme_import_keeps_a_local_css_copy_and_rejects_other_files() {
 let dir=tempfile::tempdir().unwrap();let brain=Brain::create(dir.path()).unwrap();
 let css=tempfile::Builder::new().suffix(".css").tempfile().unwrap();
 fs::write(css.path(),":root { --accent: #223344; }").unwrap();
 let stored=brain.import_theme(css.path()).unwrap();
 assert_eq!(fs::read_to_string(dir.path().join(stored)).unwrap(),":root { --accent: #223344; }");
 let txt=tempfile::Builder::new().suffix(".txt").tempfile().unwrap();
 assert!(brain.import_theme(txt.path()).is_err());
}
