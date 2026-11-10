import { readFile } from 'node:fs/promises'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  buildPackZip,
  catalogEntry,
  decideRelease,
  mergeCatalog,
  releaseNames
} from './market-lib.mjs'

const token = process.env.GITHUB_TOKEN ?? ''
const repository = process.env.GITHUB_REPOSITORY ?? 'wangmiaozero/pi-Harness-packages'
const listFile = path.resolve(process.argv[2] ?? 'selected-packs.txt')
const root = process.cwd()
const selected = (await readFile(listFile, 'utf8'))
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)

if (!selected.length) {
  console.log('No packs to publish')
  process.exit(0)
}
if (!token) throw new Error('GITHUB_TOKEN is required to publish releases')

const published = []
const failures = []
for (const directoryName of selected) {
  try {
    published.push(await publishOne(path.join(root, directoryName)))
  } catch (error) {
    failures.push(`${directoryName}: ${error instanceof Error ? error.message : String(error)}`)
    console.error(failures.at(-1))
  }
}
if (published.length) await upsertCatalog(published)
if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}

async function publishOne(directory) {
  const temp = await mkdtemp(path.join(tmpdir(), 'pack-'))
  const built = await buildPackZip(directory, path.join(temp, 'pack.zip'))
  const names = releaseNames(built.pack.directoryName, built.pack.version)
  const entry = catalogEntry(built, repository)
  const existing = await github(`GET`, `/repos/${repository}/releases/tags/${encodeURIComponent(names.tag)}`)
  const decision = decideRelease(releaseSha(existing), built.sha256)
  if (decision === 'conflict') {
    throw new Error(`${names.tag} already exists with different content. Increase the package version.`)
  }
  let release = existing
  if (decision === 'create') {
    release = await github('POST', `/repos/${repository}/releases`, {
      tag_name: names.tag,
      name: names.tag,
      target_commitish: process.env.GITHUB_SHA,
      make_latest: 'false',
      body: JSON.stringify({
        name: built.pack.name,
        version: built.pack.version,
        sha256: built.sha256
      })
    })
  }
  await uploadMissing(release, names.zip, await readFile(path.join(temp, 'pack.zip')), 'application/zip')
  if (built.pack.preview) {
    await uploadMissing(release, names.preview, built.pack.preview.data, 'image/webp')
  }
  console.log(`${decision} ${names.tag}`)
  return entry
}

function releaseSha(release) {
  if (!release || release.message === 'Not Found') return ''
  try {
    const body = JSON.parse(release.body ?? '')
    return typeof body.sha256 === 'string' ? body.sha256 : 'invalid'
  } catch {
    return 'invalid'
  }
}

async function uploadMissing(release, name, data, contentType) {
  const assets = Array.isArray(release.assets) ? release.assets : []
  if (assets.some((asset) => asset.name === name)) return
  const upload = new URL(release.upload_url.replace(/\{.*$/, ''))
  upload.searchParams.set('name', name)
  const response = await fetch(upload, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': contentType,
      'User-Agent': 'pi-harness-packages'
    },
    body: data
  })
  if (!response.ok) throw new Error(`Upload ${name} failed: HTTP ${response.status}`)
}

async function upsertCatalog(entries) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
    'User-Agent': 'pi-harness-packages'
  }
  const refResponse = await fetch(`https://api.github.com/repos/${repository}/git/ref/heads/market-index`, { headers })
  const ref = refResponse.status === 404 ? null : await jsonOrThrow(refResponse, 'Read market-index')
  let current = { schemaVersion: 1, packages: [] }
  let parent = null
  let baseTree = undefined
  if (ref?.object?.sha) {
    parent = ref.object.sha
    const commit = await github('GET', `/repos/${repository}/git/commits/${parent}`)
    baseTree = commit.tree.sha
    const tree = await github('GET', `/repos/${repository}/git/trees/${baseTree}?recursive=1`)
    const item = (tree.tree ?? []).find((entry) => entry.path === 'catalog.json')
    if (item?.sha) {
      const blob = await github('GET', `/repos/${repository}/git/blobs/${item.sha}`)
      current = JSON.parse(Buffer.from(blob.content, 'base64').toString('utf8'))
    }
  }
  const next = mergeCatalog(current, entries)
  const blob = await github('POST', `/repos/${repository}/git/blobs`, {
    content: Buffer.from(`${JSON.stringify(next, null, 2)}\n`).toString('base64'),
    encoding: 'base64'
  })
  const tree = await github('POST', `/repos/${repository}/git/trees`, {
    base_tree: baseTree,
    tree: [{ path: 'catalog.json', mode: '100644', type: 'blob', sha: blob.sha }]
  })
  const commit = await github('POST', `/repos/${repository}/git/commits`, {
    message: 'Update market catalog',
    tree: tree.sha,
    parents: parent ? [parent] : []
  })
  if (!parent) {
    await github('POST', `/repos/${repository}/git/refs`, { ref: 'refs/heads/market-index', sha: commit.sha })
    return
  }
  const updated = await fetch(`https://api.github.com/repos/${repository}/git/refs/heads/market-index`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ sha: commit.sha, force: false })
  })
  if (!updated.ok) throw new Error(`Update market-index failed: HTTP ${updated.status}`)
}

async function github(method, pathname, body) {
  const response = await fetch(`https://api.github.com${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'pi-harness-packages'
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  if (method === 'GET' && response.status === 404) return { message: 'Not Found' }
  return jsonOrThrow(response, `${method} ${pathname}`)
}

async function jsonOrThrow(response, label) {
  if (!response.ok) throw new Error(`${label} failed: HTTP ${response.status}`)
  return response.json()
}
