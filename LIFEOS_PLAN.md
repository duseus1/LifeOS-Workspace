# LifeOS Product and Implementation Plan

**Status:** Approved for implementation on November 11, 2026. See `docs/IMPLEMENTATION_STATUS.md` for evidence and remaining work; approval is not a claim that every milestone is complete.

## 1. Product vision and principles

LifeOS is a personal information workspace: a place for notes, tasks, reminders, calendars, contacts, passwords, documents, and other information.

Collections of information are called **brains**. Each brain belongs to the user and lives on their device.

The everyday experience follows five principles:

1. **Capture immediately.** Saving something never requires choosing a folder, tag, or project.
2. **Make saved information useful immediately.** Events appear on the calendar; contacts appear in contacts; unorganized notes remain searchable.
3. **Bring relevant information together.** Homebases combine notes, tasks, events, and shortcuts.
4. **Let users organize as much or as little as they want.** An unorganized brain remains fully usable.
5. **Require no closing ritual.** Changes save automatically, and unfinished tasks remain accessible.

The full vision stays in this plan. Development proceeds through working milestones, beginning with a usable personal version before adding more demanding features.

## 2. Technical foundation

### Application architecture

Use **Tauri 2, React, TypeScript, and CSS**, with a **Rust local backend**.

| Part | Responsibility |
|---|---|
| React and CSS | Screens, widgets, themes, and interactions |
| TypeScript | Frontend behavior and shared interface definitions |
| Rust | Reliable file operations, indexing, and native integration |
| Markdown files | User-owned notes and readable structured records |
| SQLite | A local, rebuildable index for fast search and queries |
| Native platform code | System widgets, shortcuts, share actions, and other OS-specific features |

Tauri supports web-based interfaces packaged for desktop and mobile. Native integrations can use Swift and Kotlin and require platform-specific implementation and testing.
Sources: https://v2.tauri.app/start/ and https://v2.tauri.app/develop/plugins/develop-mobile/

**The first working release targets macOS.** Validate the core on iOS and Android early, then deliver broader platform rollout later. Windows and Linux remain supported product targets. No hosted server, account, or internet connection is required for the initial core app.

### Code organization

- `src/`: interface and feature modules including editor, homebases, capture, calendar, search.
- `src-tauri/`: local storage, indexing, commands, native integrations.
- `tests/`: sample brains and end-to-end workflow checks.

UI components do not write files directly. They call a typed local service layer handling validation, persistence, and errors.

### Storage model

A brain is a folder containing `homebase.md`, ordinary Markdown notes and project folders, default Inbox, Templates, Journal, Contacts, Events, Tasks, Reminders, Attachments folders, and `.lifeos` for settings, themes, history, internal metadata.

These are initial destinations, not a mandatory organizational system. Moving a record inside the brain does not change its type.

Notes use Markdown with YAML properties. Contacts, events, tasks, and reminders also use Markdown with a record type and stable identifier; the body remains available for details. SQLite is a rebuildable index, never the only copy. Attachments retain their original formats. Passwords use a separate encrypted store, never ordinary Markdown.

### Core interfaces

Typed operations cover creating/opening/switching brains; reading/saving/moving/recovering documents; typed capture; template instantiation; search/query; widget rendering/updating.

Saves include the revision originally read. External conflicts preserve both versions instead of silently overwriting. Successful captures return identifier and location; errors preserve entered information.

## 3. First usable version

### A. Brains, files, and the editor

Create or open a brain, navigate files, create/edit/rename/move/delete notes. Provide Markdown editing and reading, wiki links/backlinks/tags/properties, images/attachments, desktop tabs/navigation history, automatic save states, trash/version recovery. Start with CodeMirror 6. Preserve unknown properties and unsupported Markdown; opening a file must not rewrite it.

### B. Homebase as the home screen

The user's drawing is `homebase.md`: menu top left, settings top right, To-do and Reminders across the top, calendar with upcoming events, then Quick Notes. Narrow screens stack in that order.

Combine ordinary Markdown with declarative fenced widget blocks specifying type, stable identifier, configuration, responsive layout. Initial types: tasks, reminders, calendar/upcoming, Quick Notes. No executable JavaScript in blocks. Unsupported blocks remain intact and explain the issue. Move/resize/hide/configure widgets through the UI, persisting into the document. Normal launch opens homebase; capture shortcuts open capture directly.

### C. Project homebases

Any Markdown file can contain widgets. Combine project descriptions, links, important files, tasks, events. Optional project identifiers filter widgets. Follow an ordinary link to open the project; no required wizard, folder structure, or assignment.

### D. Quick capture

Always-accessible capture button and desktop keyboard shortcut; native OS entry points later. Immediately open type selector with relevant fields.

| Type | Minimum | Result |
|---|---|---|
| Thought | Nonempty text | Inbox Markdown note |
| Link | Valid HTTP/HTTPS URL | Inbox link note |
| Contact | Any nonempty contact field | Contact record |
| Event | Title, date, time or all-day date | Main calendar event |
| Document | Selected file | Attachment and Inbox reference |
| Task | Task text | Open task |
| Reminder | Reminder text | Visible reminder; schedule optional |

Contact fields begin with name/phone/email, none individually required. Links save without waiting for extraction. Success closes or resets with confirmation. Failure preserves draft.

### E. Quick Notes and templates

Pinned notes open files. Pinned templates create/open according to source, folder, filename pattern, and daily/weekly/monthly/new-per-invocation period. Daily templates create once and subsequently reopen without overwrite. Basic date/title substitutions use local timezone. Double taps and collisions must be safe; missing templates/destinations produce recoverable errors.

### F. Tasks and reminders

Task = action completed. Reminder = information dismissed or snoozed. Tasks optionally have due date, planned date, project, priority None/Low/Medium/High; indicators can be hidden.

**Rollover changes visibility, not deadlines.** Home shows open tasks unplanned or planned today/earlier. Incomplete tasks stay tomorrow, original deadlines stay, passed deadlines become overdue. Future planned tasks have Upcoming view; a due date alone does not hide a task. Dismiss/snooze persist; snoozed reminders resurface at chosen time. Notifications are optional; denied permission must not break in-app reminders. No closing ritual.

### G. Calendar and contacts

Month view, day details, upcoming events, timed/all-day events, optional configurable category colors. Uncategorized events appear immediately. Timed events retain timezone; all-day dates never shift across zones. Contacts can be created, edited, searched, linked to notes/projects; native address book later.

### H. Search

Search active brain filenames, contents, tags, properties, all record types. Visible filters, context snippets, source navigation. Inbox gets equal coverage. Watch desktop external changes and reconcile on resume; update backlinks/search on saves/moves/deletions.

### I. Customization

Light/dark/system, typography/spacing, widget arrangement/visibility, capture destinations/templates, CSS themes/snippets, reset appearance. Publish stable variables/hooks. Safe startup disables themes/extensions. Native system widgets do not promise CSS styling.

## 4. Build sequence and acceptance gates

Each milestone ends in working software, focused checks, a record of passed and untested areas.

### Milestone 1 — Reliable local foundation

Mac shell, brain create/open, editor, file services, autosave, trash, recovery. Early iOS/Android feasibility: text input, save, keyboard, resume. Record unavailable signing/devices honestly.

Acceptance: create/write/restart and recover exact contents; external changes and failed writes do not silently destroy data.

### Milestone 2 — Daily-use homebase

Widgets, tasks, reminders, calendar, contacts, capture. Acceptance: morning overview and capture of each type survives restart.

### Milestone 3 — Connected information

Quick Notes/templates/wiki links/backlinks/project homebases/tags/properties/search. Acceptance: one-action journal without duplicates, project navigation, unorganized search.

### Milestone 4 — Personal alpha

Widget editing/CSS/settings/recovery/keyboard/accessibility. Installable Mac build and development/build commands. Acceptance: complete ordinary day with persistent real data and no required organization.

### Milestone 5 — Phone and cross-platform use

iOS/Android, then Windows/Linux. Share actions, home/lock widgets where supported, iOS Shortcuts/App Intents for Action button, desktop capture shortcuts/native widgets where practical. Mobile initially app-managed storage and import/export; external folders need native handling.

Cross-device continuity is separate: before this milestone is complete, specify and implement opt-in sync with conflicts, deletion recovery, encryption in transit/at rest appropriate to design. Device-only remains available. Sync provider/account design review precedes implementation. Mac alpha does not claim sync.

### Milestone 6 — Rich capture and databases

Independently testable: website extraction with source/date; voice recording/transcription; timestamped video transcription; note-property tables/boards/calendars; CSV import/export/charts; PDF annotations/attachments; recurring tasks/events/reviews/habits/goals; visual maps/whiteboards/section embeds.

Cancellable extraction/transcription jobs preserve originals on failure. Database views edit source records. File formats use explicit adapters, never parse arbitrary binary as Markdown.

### Milestone 7 — Advanced capabilities

**AI:** off by default, retrieve only selected brain, cite sources, abstain when insufficient, initially read-only. Exclude passwords/excluded material. Remote providers need explicit content-sharing choice; provider/model gets separate specification.

**Passwords:** dedicated subsystem using established encrypted-vault implementation, no custom crypto. Lock/authentication/generation/clipboard/encrypted backup/recovery/later autofill. Exclude secrets from indexes/logs/transcripts/AI/extensions. Real use needs security review/recovery tests; encrypted text field alone is not completion.

**Extensions:** versioned API after internal boundaries stabilize, initially commands/widgets. Declared permissions and mediated access, disable/uninstall/compatibility/safe startup.

### Milestone 8 — Public release

Signed packages/updates; migration/rollback; export/import/Obsidian migration report; documentation/support/opt-in diagnostics; compatibility/accessibility; dependencies/licenses/security; privacy and optional-service boundaries. Pricing/branding/hosting/release dates remain business decisions.

## 5. Verification and working agreement

Critical cases: crash retains valid files/recoverable drafts; full disk/access loss preserves input; external edits preserve conflicts; double-tap template reopens one note; midnight recalculates rollover; timezone preserves dates; phone-only contact saves; uncategorized event appears; moved notes retain links/indexes; deleted index rebuilds; malformed themes/blocks remain recoverable; restored backup opens as usable brain.

Use Rust file/index tests, TypeScript template/date/task tests, browser workflow tests, plus actual native filesystem and mobile lifecycle checks. Browser checks alone do not prove native guarantees.

Defaults: Mac first/early mobile feasibility; no account/server for alpha; files authoritative/index rebuildable; declarative homebases; separate password store; advanced systems separately specified; visuals evolve with sketches; changes-of-plan workflow deferred.

Review/save/build agreement: user reviews; approved plan saved as LIFEOS_PLAN.md in /Users/danielcelerin/Projects/LifeOS; implementation begins after save and authorization; maintain explicit decisions/results. This master plan directs the local core; later features receive focused specs before implementation.
