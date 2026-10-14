# D'Vision Motion Pictures

Website for D'Vision Motion Pictures, an independent film collective based in Kennesaw, Georgia (started in Miami).

- `index.html` is the whole site (styles and scripts are inline).
- `api/channel.js` is a Vercel function that returns the channel's latest videos, logo and banner. The site uses it when it is hosted on Vercel, and otherwise reads the video list straight from the YouTube player.
- Logo files: `logo.jpg` (full), `logo-wordmark.jpg` (hero), `logo-nav.jpg` (menu bar).

Deploys automatically on Vercel from the `main` branch.
