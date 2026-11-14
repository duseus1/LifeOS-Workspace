# LifeOS versions

LifeOS uses `MAJOR.MINOR.PATCH` version numbers. In conversation, “v1” means the 1.x line, “1.1” means `1.1.0`, and “v2” means `2.0.0`.

| Change | Example | When to use it |
|---|---|---|
| Patch | `1.0.0` → `1.0.1` | Small bug fixes, polish, and maintenance without a new user-facing capability. |
| Minor | `1.0.1` → `1.1.0` | A new feature or modest content addition, or a substantial fix that materially improves an existing workflow. Reset patch to zero. |
| Major | `1.1.0` → `2.0.0` | A large release with major new capabilities or a significant change to how LifeOS is used. Reset minor and patch to zero. |

The first published source snapshot is tagged `v1`. That initial commit still contains `0.1.0` in its build metadata; the following `v1.0.0` tag aligns the app to `1.0.0`. The `v1` tag stays on the initial commit as a permanent historical marker. Future release tags use the complete number, such as `v1.0.1`, `v1.1.0`, and `v2.0.0`.

For each release:

1. Record the user-visible changes and any migration or compatibility notes.
2. Update `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, and `src-tauri/tauri.conf.json` to the same version.
3. Run the relevant tests and build the affected platforms.
4. Commit and push to `main`, then create and push an immutable release tag. Do not move an existing tag.

The version number describes the size of the update, not a claim that every item in the long-term product plan is finished. The implementation status file tracks what is actually built and verified.
