# PitchBook Lender Dashboard

Company lender lookup tool powered by the PitchBook API.

## Setup

**1. Install dependencies**

```bash
npm install
```

**2. Add your API key**

Copy `.env.example` to `.env` and fill in your key:

```bash
cp .env.example .env
```

Then open `.env` and replace `your_pitchbook_api_key_here` with your actual key.

**3. Place the React source file**

Put `pb_lender_dashboard.jsx` in `src/App.jsx` (rename it).

Your `src/` folder should also have an `index.js` that mounts the app:

```js
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
```

And a `public/index.html` with a `<div id="root"></div>` in the body. Running `npx create-react-app .` first gives you these scaffolding files automatically — then replace `src/App.js` with the dashboard file.

## Running

**Development** (hot reload, two processes managed together):

```bash
npm run dev
```

React app runs on `http://localhost:3000`, proxy on `http://localhost:3001`.

**Production** (single server, runs like a website):

```bash
npm run build
npm start
```

Opens at `http://localhost:3001`. One process, one URL, no separate React dev server.

## How it works

- `server.js` runs Express, which does two things:
  - Proxies `/api/*` requests to `https://api.pitchbook.com`, injecting your API key server-side
  - Serves the built React app as static files for all other routes
- Your API key never touches the browser

## Deploying

To host this on a server or cloud platform, set `PB_API_KEY` as an environment variable in your hosting environment (not in a committed `.env` file), run `npm run build`, then `npm start`. Works on Railway, Render, Fly.io, or any Node-capable host.
