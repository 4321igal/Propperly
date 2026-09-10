# How to Run — Source Discovery UI

## Prerequisites

- Node.js 18+ installed
- Run `npm install` from the repo root (once)

## Start the server

### Windows (PowerShell)
```powershell
.\run-discovery.ps1
```
Optional arguments:
```powershell
.\run-discovery.ps1 -Port 3001 -WorkspaceCwd "C:\my\project"
```

### Mac / Linux (Bash)
```bash
./run-discovery.sh
```
Optional arguments:
```bash
./run-discovery.sh 3001 /path/to/workspace
```

The script starts the Express server and automatically opens the UI in your browser.

## Open the UI manually

If the browser did not open automatically, navigate to:
```
http://localhost:3001
```

## What you can do in the UI

| Step | Action |
|------|--------|
| 1 | View workspace state (existing approved inventory, workspace ID) |
| 2 | Click **Start Discovery Run** — the service scans for source candidates |
| 3 | For each candidate, click ✓ (INCLUDE) or ✗ (EXCLUDE) |
| 4 | Add extra paths manually if needed |
| 5 | Resolve any identity conflicts (same source / different sources) |
| 6 | Click **Review Proposed Inventory** to see what will be approved |
| 7 | Click **Confirm Source Inventory** to finalize |

## API routes (for debugging)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/discovery/workspace` | Workspace state |
| POST | `/api/discovery/runs` | Start a discovery run |
| GET | `/api/discovery/runs/:id` | Get run + candidates |
| POST | `/api/discovery/runs/:id/selections` | Mark candidate INCLUDED/EXCLUDED |
| POST | `/api/discovery/runs/:id/candidates` | Add a candidate by path |
| POST | `/api/discovery/runs/:id/identity` | Resolve identity conflict |
| GET | `/api/discovery/runs/:id/proposed-inventory` | View proposed inventory |
| POST | `/api/discovery/inventory/confirm` | Confirm and approve inventory |

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | HTTP port the server listens on |
| `PROPPERLY_CWD` | current dir | Workspace root path scanned for sources |
