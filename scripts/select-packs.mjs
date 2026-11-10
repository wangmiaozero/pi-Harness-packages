import { execFile } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { listPacks } from './market-lib.mjs'

const exec = promisify(execFile)
const root = process.cwd()
const event = process.env.GITHUB_EVENT_NAME ?? ''
const input = (process.env.INPUT_PACKAGE ?? '').trim()
const before = process.env.BEFORE_SHA ?? ''
const output = path.resolve(process.env.SELECTED_PACKS ?? 'selected-packs.txt')

const dirs = await select()
await writeFile(output, dirs.length ? `${dirs.join('\n')}\n` : '')
console.log(dirs.join('\n') || '(none)')

async function select() {
  if (event === 'workflow_dispatch' || !event) {
    if (!input) return listPacks(root)
    return [directoryId(input)]
  }
  if (event !== 'push' || !before || /^0+$/.test(before)) return []
  const { stdout } = await exec('git', ['diff', '--name-only', before, 'HEAD'], { cwd: root })
  const found = new Set()
  for (const line of stdout.split('\n')) {
    const top = line.split('/')[0]
    if (/^(theme|pet)-[a-z0-9][a-z0-9-]*$/.test(top)) found.add(top)
  }
  return [...found].sort((a, b) => a.localeCompare(b))
}

function directoryId(value) {
  const dir = value.startsWith('@piharness/') ? value.slice('@piharness/'.length) : value
  if (!/^(theme|pet)-[a-z0-9][a-z0-9-]*$/.test(dir)) throw new Error(`Invalid package id: ${value}`)
  return dir
}
