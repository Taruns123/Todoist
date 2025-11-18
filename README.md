# Todoist

Futuristic, single-user dual-mode todo cockpit built with Next.js, Tailwind,
and MongoDB. Create nested lists with tasks/subtasks or log timer-based
“chrono” todos that surface in the notification rail with live countdowns.

## Getting Started

1. Copy the sample environment file and fill in your Mongo connection string:

```bash
cp env.sample .env.local
```

Set `MONGODB_URI` to any MongoDB instance (Atlas or local). Optionally set
`MONGODB_DB` (defaults to `todoist`).

2. Install dependencies & run the dev server:

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to use the app.

## Features

- Simple Lists: add/delete lists, tasks, subtasks, and track completion
- Modal task management: each list opens in a glassy modal with full control
- Timer Todos: schedule tasks with date/time, mark done or delete
- Notification Rail: upcoming chronos with live countdown/overdue status
- Cyan/teal dark UI with Tailwind-powered glassmorphism aesthetics

## Scripts

- `npm run dev` – start local dev server
- `npm run build` – production build
- `npm run start` – run built app
- `npm run lint` – lint with ESLint
