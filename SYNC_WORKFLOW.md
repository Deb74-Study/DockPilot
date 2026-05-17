# DockPilot Sync Workflow

DockPilot already has separate pieces for local launch, GitHub Pages, and Supabase. This workflow adds one command that coordinates those deployment surfaces from the declared source-of-truth workspace.

## Default sync

From the project root:

```bash
chmod +x sync_dockpilot.command scripts/sync_everywhere.sh
./sync_dockpilot.command
```

Default behavior:

- Builds `dist/client` and `dist/dev` from the existing manifests.
- Pushes linked Supabase migrations and deploys every function in `supabase/functions/` except `_shared`.
- Pushes `main` to `origin` only when the git working tree is clean, which triggers the existing GitHub Pages workflow.

## Common options

```bash
./sync_dockpilot.command --skip-github
./sync_dockpilot.command --skip-supabase
./sync_dockpilot.command --skip-build
```

- `--skip-github` is useful while the tree is still dirty.
- `--skip-supabase` is useful when you only want to refresh local artifacts.

## Notes

- GitHub Pages already deploys from `.github/workflows/deploy-pages.yml` after pushes to `main`.
- Supabase remote deploys rely on the linked project ref stored in `supabase/.temp/project-ref`.
- If `supabase db push --linked` asks for credentials, authenticate with the Supabase CLI before rerunning the sync.