# VyapaarAI — SME Business OS Prototype

A clickable, no-backend prototype created for the UnifyApps SME assignment.

## How to run

The page JavaScript modules fetch their datasets from JSON, so serve the folder locally:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Editing displayed data

- Each screen has its own data file: `home.json`, `records.json`, `inventory.json`, `leads.json`, `copilot.json`, and `integrations.json`.
- Add new list entries by copying an existing object in the relevant JSON array and changing its values.
- Page headings, layouts, buttons, and rendering remain in the corresponding files under `pages/`.

## Included flows
- Unified business overview
- Record keeping
- Inventory intelligence
- Lead generation and pipeline
- AI Copilot
- Integrations onboarding
- Simulated actions, filtering and conversational responses

## Suggested assignment positioning
VyapaarAI is an AI-powered operating system for Indian SMEs. It reduces manual entry by connecting existing business tools, unifying fragmented data and turning it into actionable workflows across records, inventory and leads.
