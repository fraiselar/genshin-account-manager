# Genshin Account Manager

A personal Genshin Impact account tracker built with React + TypeScript and Vite.

This project is based on the concept of turning a spreadsheet prototype into a more maintainable and flexible web app. It focuses on:

- pull tracking across banners
- pity tracking and win/loss analysis
- character and weapon progression goals
- local JSON backup and restore
- a simple dashboard for an overview of the account

## Features

- Overview dashboard for primogems, fates, collection progress and pull totals
- Character and weapon goal tracking
- Recent pull history table
- Local browser storage persistence
- JSON import/export for backup and restore
- Domain-level logic tested with Vitest

## Stack

- React 18
- TypeScript
- Vite
- Vitest

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm run dev
```

3. Build the app:

```bash
npm run build
```

4. Run tests:

```bash
npm run test
```

## Roadmap

This is a V1 foundation. The planned next steps are:

- richer banner analytics and charts
- per-character and per-weapon detail pages
- better import support from Excel exports
- improved local persistence and data editing
- PWA and offline support

## Notes

The current app stores data locally in the browser and saves automatically. You can export to JSON and later import it back in.
