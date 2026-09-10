// Regenerates llms-agent-cli-full.txt from the pages listed in agent-cli-sidebar.js,
// in sidebar order. Run with `npm run llms` after adding, removing, or renaming a page.
// The curated one-line descriptions in llms-agent-cli.txt are hand written; edit that file
// directly.
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sidebar = createRequire(import.meta.url)(join(root, 'agent-cli-sidebar.js'))

const ids = []
const walk = (nodes) => {
  for (const n of nodes) {
    if (typeof n === 'string') ids.push(n)
    else if (n.type === 'doc') ids.push(n.id)
    else if (n.items) walk(n.items)
  }
}
walk(sidebar.agentCliSidebar)

const RULE = '='.repeat(80)
const header = readFileSync(join(root, 'llms-agent-cli-full.txt'), 'utf8')
  .split(`\n${RULE}\n`)[0]
  .trimEnd()

const body = ids
  .map((id) => {
    const rel = `agent-cli/${id}.md`
    const content = readFileSync(join(root, rel), 'utf8').trimEnd()
    return `${RULE}\nSOURCE: ${rel}\n${RULE}\n\n${content}`
  })
  .join('\n\n')

writeFileSync(join(root, 'llms-agent-cli-full.txt'), `${header}\n\n${body}\n`)
console.log(`wrote llms-agent-cli-full.txt from ${ids.length} pages`)
