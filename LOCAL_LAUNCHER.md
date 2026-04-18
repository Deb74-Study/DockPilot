# DockPilot Local One-Click Launcher

This package includes two helper scripts for local operation on macOS:

- `launch_dockpilot_local.command` starts a local static server and opens `DockPilot_landing.html`.
- `stop_dockpilot_local.command` stops the server started by the launcher.

## First-Time Setup

Run once from project root:

```bash
chmod +x launch_dockpilot_local.command stop_dockpilot_local.command
```

## Start DockPilot Locally

From Finder: double-click `launch_dockpilot_local.command`

Or from terminal:

```bash
./launch_dockpilot_local.command
```

Behavior:

- Uses port `5500` if available, otherwise picks the next free port.
- Opens browser to `DockPilot_landing.html`.
- Writes server PID to `.dockpilot-local.pid`.
- Writes server log to `.dockpilot-local.log`.

## Stop Local Server

```bash
./stop_dockpilot_local.command
```

## Quick Recovery

1. If the launcher opens no page, check `.dockpilot-local.log`.
2. If the PID file is stale, run `./stop_dockpilot_local.command` and relaunch.
3. If port 5500 is occupied, launcher will auto-select another port and print it.
4. Ensure Supabase backend is reachable (hosted project) before testing auth flows.
