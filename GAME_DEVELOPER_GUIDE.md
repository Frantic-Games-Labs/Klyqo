# Klyqo Game Developer Guide

Welcome to the Frantic-Games-Labs organization! 
To keep the main Klyqo website fast and avoid bandwidth limits, we host all new games in their own separate repositories and deploy them via GitHub Pages. The main Klyqo website then embeds them.

## How to add a new game

1. Create a new repository in the `Frantic-Games-Labs` organization.
2. Build your game using Vite.
3. In your `vite.config.ts`, you MUST add the `base` property matching your repo name:
   ```typescript
   export default defineConfig({
     base: '/Your-Repo-Name/',
   })
   ```
4. Create the file `.github/workflows/deploy.yml` and paste the following:
   ```yaml
   name: Deploy Game to GitHub Pages
   on:
     push:
       branches: ['main']
   permissions:
     contents: read
     pages: write
     id-token: write
   jobs:
     deploy:
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: 20
         - run: npm install
         - run: npm run build
         - uses: actions/configure-pages@v4
         - uses: actions/upload-pages-artifact@v3
           with:
             path: './dist'
         - id: deployment
           uses: actions/deploy-pages@v4
   ```
5. In your game repo settings, go to **Pages**, and set the Source to **GitHub Actions**.
6. Once deployed, go to the Klyqo `/admin` portal and add your game using the **External iframe** delivery option, pasting your `https://frantic-games-labs.github.io/Your-Repo-Name/` URL!
