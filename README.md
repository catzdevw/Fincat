# Caturza Financing Statement

A fully functioning, dependency-free personal finance web app for tracking monthly income and expenses, reviewing an annual dashboard, and downloading monthly PDF financial statements.

## Launch it

**Option A (simplest):** double-click `index.html` to open it in a modern browser. For the most reliable data persistence across browsers, use Option B.

**Option B (recommended):** from the project folder run:

```bash
python -m http.server 5500
```

Then visit **http://localhost:5500**. If Python is not installed, use **VS Code → Live Server** to serve the folder.

No npm install, database, internet connection, paid service, or external library is required.

## Features

- Dashboard for any year: yearly income, expenses, balance, savings rate.
- Interactive SVG charts: income vs expenses by month, monthly net chart, and category doughnut. Click a chart month to open it.
- Twelve independent month pages with precise monthly income / expenses / remaining balance.
- Add, edit, delete, filter, and search transactions. Bills include Water, BOHECO electricity, Wi-Fi, LPG, rent, etc.
- **Download PDF Statement** on every monthly page (automatically generated, even with zero transactions): monthly totals, categories, individual transactions, and multi-page reports for larger ledgers.
- Download a CSV transaction spreadsheet for any month.
- Switch years to retain separate financial histories.
- Export/import JSON backups for all years; optional demo data and reset actions.
- Mobile responsive sidebar, accessible buttons, offline functionality, no dependencies.

## How calculations work

- Monthly income = sum of entries marked Income within the selected month and year.
- Monthly expenses = sum of entries marked Expense within the selected month and year.
- Monthly remaining balance = monthly income − monthly expenses.
- Annual values are based on all 12 months in the currently selected year.
- Savings rate = (annual income − annual expenses) / annual income × 100 (0% when there is no income).
- Each month is calculated **independently**; prior month net balances are not carried forward.
- Money uses the Philippine peso (PHP); exported PDFs use `PHP` text for reliable font support.

## Privacy and backup

Data is stored in the browser's `localStorage` on **that device and browser only**. There is **no server, cloud sync, automatic encrypted backup, account login, or bank integration**. Do not rely on browser storage as your only copy of important financial data: use **Backup & settings → Download JSON** regularly. Clearing browser data or switching devices/browsers may remove your entries. Restoring a JSON backup replaces all current entries (with confirmation).

## Project structure

- `index.html` — navigation, app container, controls, dialogs.
- `styles.css` — responsive blue/navy theme and layouts.
- `app.js` — entries, validation, storage, calculations, interactive charts, CSV, JSON, PDF generation.

## Future full-stack upgrade

The next stage can use React + TypeScript + Vite, Java + Spring Boot (Controller–Service–Repository), Spring Security, PostgreSQL and deployment. Add accounts, encrypted backups, multi-device sync, and automated monthly exports when the backend is introduced. The current version deliberately needs no backend so you can use and test it immediately.
