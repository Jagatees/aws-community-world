import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Send only counts to the homepage, keeping full profiles and news lazy-loaded.
function homeCommunityCounts() {
  const moduleId = 'virtual:home-community-counts'
  const resolvedId = `\0${moduleId}`
  const categories = ['heroes', 'user-groups', 'cloud-clubs', 'kiro-ambassadors', 'aws-ambassadors', 'golden-jackets']
  return {
    name: 'home-community-counts',
    resolveId(id) { if (id === moduleId) return resolvedId },
    load(id) {
      if (id !== resolvedId) return
      const readData = (name) => {
        const path = new URL(`./src/data/${name}.json`, import.meta.url)
        this.addWatchFile(fileURLToPath(path))
        return JSON.parse(readFileSync(path, 'utf8'))
      }
      const counts = Object.fromEntries(categories.map(category => [category, readData(category).length]))
      counts['community-builders'] = readData('community-builders-meta').total
      counts['builder-lofts'] = readData('builder-lofts').length
      const news = readData('news')
      counts.news = new Set([...news.latest.slice(0, 10), ...news.trending.slice(0, 10)]
        .map(article => article.id || article.url)).size
      return `export default ${JSON.stringify(counts)}`
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        communityDaySingapore: 'community-day-singapore/index.html',
      },
    },
  },
  plugins: [
    homeCommunityCounts(),
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
})
