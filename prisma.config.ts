import { defineConfig } from 'prisma/config'

export default defineConfig({
  earlyAccess: true,
  seed: {
    run: 'node scripts/post-migration-seed.js',
  },
})
