#!/usr/bin/env node

/**
 * Install Git Hooks Script
 *
 * Configures git to use the custom hooks directory and makes hooks executable
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const ROOT_DIR = path.join(__dirname, '..')
const HOOKS_DIR = path.join(ROOT_DIR, '.githooks')
const GIT_DIR = path.join(ROOT_DIR, '.git')

function main() {
  console.log('\n' + '='.repeat(60))
  console.log('🪝 INSTALLING GIT HOOKS')
  console.log('='.repeat(60) + '\n')

  // Check if .git directory exists
  if (!fs.existsSync(GIT_DIR)) {
    console.error('❌ Error: Not a git repository')
    console.error('   Initialize git first: git init')
    process.exit(1)
  }

  // Check if hooks directory exists
  if (!fs.existsSync(HOOKS_DIR)) {
    console.error('❌ Error: Hooks directory not found at .githooks/')
    process.exit(1)
  }

  try {
    // Configure git to use the custom hooks directory
    console.log('📁 Configuring git hooks directory...')
    execSync('git config core.hooksPath .githooks', {
      cwd: ROOT_DIR,
      stdio: 'inherit'
    })

    console.log('✅ Git configured to use .githooks/ directory')

    // Make hooks executable (Unix-like systems)
    if (process.platform !== 'win32') {
      console.log('\n🔧 Making hooks executable...')
      const hookFiles = fs.readdirSync(HOOKS_DIR)
        .filter(file => !file.endsWith('.ps1') && !file.endsWith('.md'))

      for (const hookFile of hookFiles) {
        const hookPath = path.join(HOOKS_DIR, hookFile)
        try {
          fs.chmodSync(hookPath, '755')
          console.log(`   ✓ ${hookFile}`)
        } catch (err) {
          console.warn(`   ⚠️  Could not make ${hookFile} executable: ${err.message}`)
        }
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ GIT HOOKS INSTALLED SUCCESSFULLY!')
    console.log('='.repeat(60))
    console.log('\n📖 Installed hooks:')
    console.log('   • post-merge: Automatically rebuilds service after git pull')
    console.log('\n💡 The hooks will run automatically on relevant git operations.')
    console.log('   To disable: git config core.hooksPath .git/hooks\n')

  } catch (error) {
    console.error('\n❌ FAILED TO INSTALL HOOKS')
    console.error(`Error: ${error.message}\n`)
    process.exit(1)
  }
}

main()
