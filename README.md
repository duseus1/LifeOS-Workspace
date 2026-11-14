# LifeOS

LifeOS is a local personal workspace for Markdown notes, tasks, reminders, events, contacts, and project homebases. The approved product roadmap is in [LIFEOS_PLAN.md](LIFEOS_PLAN.md). The current build is a Mac development alpha; [implementation status](docs/IMPLEMENTATION_STATUS.md) records what is working and what remains.

## Run on Mac

```bash
./script/build_and_run.sh
```

This builds and launches the current Mac app. `./script/build_and_run.sh --verify` also checks that the process started. Open the app, choose **Create a brain**, and use the suggested folder path or enter another absolute folder path. LifeOS creates `homebase.md`, a daily journal template, and the default folders there. Existing files in that folder are kept.

For a browser preview while working on the UI:

```bash
npm install
npm run dev
```

The preview is at `http://127.0.0.1:1420`. It stores data in that browser's local storage for interface testing. The Mac app stores real Markdown files in the chosen brain folder. Do not use browser preview for important data.

## Run in the iPhone simulator

Boot an iOS simulator in Xcode, then run:

```bash
./script/run_ios_sim.sh
```

This builds an iOS app with its interface bundled, installs it on the booted simulator, and launches it. The `tauri ios dev` version needs a continuously running development server; if that server stops, the simulator displays a `localhost:1420` connection error. iPhone startup has been checked, but interactive capture and storage still need device testing.

## Everyday use

- Open LifeOS to the homebase. Its widgets show tasks, reminders, calendar events, and Quick Notes.
- Use **Quick capture** or `⌘⇧N` to save a thought, link, contact, event, task, reminder, or document without sorting it first.
- Tap **Daily journal** in Quick Notes to create or reopen today's file.
- Open **Edit Markdown** to change the homebase's text and declarative widget blocks. Use **Arrange** to change widget position, width, and visibility.
- Open any note, choose **Edit**, and write Markdown. Autosave status appears in the toolbar. Version history and Trash allow recovery.
- Search across the brain, including the Inbox and record properties. `⌘K` opens search.
- Use **Settings** for appearance, custom CSS, and capture destinations. Add `?safe=1` to the app URL in a development browser session, or use `⌘⇧⌫` while the app is focused to disable custom appearance for that session.

A brain is simply a folder. Back it up by copying the whole folder, including its hidden `.lifeos` directory. Notes and structured records are Markdown files. SQLite under `.lifeos` is a disposable search index that can be rebuilt from the files. Passwords are not stored by this alpha.

## Checks

```bash
npm test
npm run build
npx playwright test
$HOME/.cargo/bin/cargo test --manifest-path src-tauri/Cargo.toml
npm run package
```

`npm run package` produces `src-tauri/target/release/bundle/macos/LifeOS.app`. This is a local build, not a signed or notarized public release.
