import { createHash } from 'node:crypto'
import { lstat, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { zipFiles } from './zip.mjs'

export const LIMITS = {
  maxCompressedBytes: 650 * 1024 * 1024,
  maxUnpackedBytes: 750 * 1024 * 1024,
  maxEntries: 40_000,
  maxFileBytes: 32 * 1024 * 1024
}

export const PACKAGE_NAME = /^@piharness\/(theme|pet)-[a-z0-9][a-z0-9-]*$/
const VERSION = /^\d+\.\d+\.\d+$/
const EXTENSIONS = new Set(['.webp', '.png', '.jpg', '.jpeg', '.mp4', '.mp3', '.json', '.md', '.txt'])
const BARE = new Set(['license', 'notice', 'readme.md'])
const SKIP = new Set(['.ds_store', 'thumbs.db'])

export async function listPacks(root) {
  const names = []
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    if (entry.name.startsWith('theme-') || entry.name.startsWith('pet-')) names.push(entry.name)
  }
  return names.sort((a, b) => a.localeCompare(b))
}

export function releaseNames(directoryName, version) {
  const tag = `${directoryName}-v${version}`
  return {
    tag,
    zip: `${tag}.zip`,
    preview: `${tag}-preview.webp`
  }
}

export function decideRelease(existingSha, nextSha) {
  if (!existingSha) return 'create'
  if (existingSha === nextSha) return 'skip'
  return 'conflict'
}

export function mergeCatalog(existing, entries) {
  const packages = new Map((existing?.packages ?? []).map((item) => [item.name, item]))
  for (const entry of entries) packages.set(entry.name, entry)
  return {
    schemaVersion: 1,
    packages: [...packages.values()].sort((a, b) => a.name.localeCompare(b.name))
  }
}

export async function inspectPack(directory) {
  const directoryName = path.basename(directory)
  const pkg = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'))
  const name = pkg.name
  if (name !== `@piharness/${directoryName}` || !PACKAGE_NAME.test(name)) {
    throw new Error(`${directoryName} package name must be @piharness/${directoryName}`)
  }
  if (typeof pkg.version !== 'string' || !VERSION.test(pkg.version)) throw new Error(`${directoryName} version is invalid`)
  if (pkg.scripts && Object.keys(pkg.scripts).length) throw new Error(`${directoryName} cannot contain scripts`)
  if (pkg.dependencies || pkg.devDependencies || pkg.optionalDependencies) {
    throw new Error(`${directoryName} cannot depend on other packages`)
  }
  if (pkg.publishConfig) throw new Error(`${directoryName} still has npm publishConfig`)
  const text = JSON.stringify(pkg)
  if (text.includes('/Users/') || text.includes('C:\\')) throw new Error(`${directoryName} contains a local path`)
  const harness = pkg.piHarness
  if (!harness || typeof harness !== 'object' || Array.isArray(harness)) throw new Error(`${directoryName} is missing piHarness`)
  const kind = directoryName.startsWith('theme-') ? 'theme' : 'pet'
  if (harness.kind !== kind) throw new Error(`${directoryName} piHarness.kind must be ${kind}`)
  if (typeof harness.compatible !== 'string' || !harness.compatible.trim()) {
    throw new Error(`${directoryName} is missing piHarness.compatible`)
  }
  const partOf = harness.partOf ?? null
  const parts = harness.parts ?? []
  if (partOf && parts.length) throw new Error(`${directoryName} cannot set both partOf and parts`)
  if (partOf !== null && (typeof partOf !== 'string' || !PACKAGE_NAME.test(partOf) || partOf === name)) {
    throw new Error(`${directoryName} partOf is invalid`)
  }
  if (!Array.isArray(parts) || parts.length > 8 || parts.some((item) => typeof item !== 'string' || !PACKAGE_NAME.test(item) || item === name)) {
    throw new Error(`${directoryName} parts are invalid`)
  }
  if (new Set(parts).size !== parts.length) throw new Error(`${directoryName} parts are duplicated`)
  const files = await collectFiles(directory)
  if (partOf) {
    const clipPack = files.find((file) => file.name === 'clip-pack.json')
    if (!clipPack) throw new Error(`${directoryName} is missing clip-pack.json`)
    assertClipPack(directoryName, JSON.parse(clipPack.data.toString('utf8')), files)
  } else if (kind === 'theme') {
    if (!files.some((file) => file.name === 'theme-pack.json')) throw new Error(`${directoryName} is missing theme-pack.json`)
  } else if (!files.some((file) => file.name === 'pet-pack.json')) {
    throw new Error(`${directoryName} is missing pet-pack.json`)
  }
  const preview = files.find((file) => file.name === 'preview.webp') ?? null
  const author = typeof pkg.author === 'string' ? pkg.author : (pkg.author?.name ?? '')
  return {
    directoryName,
    name,
    kind,
    version: pkg.version,
    description: typeof pkg.description === 'string' ? pkg.description : '',
    author,
    license: typeof pkg.license === 'string' && pkg.license ? pkg.license : '',
    compatible: harness.compatible,
    partOf,
    parts,
    files,
    preview
  }
}

export async function buildPackZip(directory, destination) {
  const pack = await inspectPack(directory)
  if (!pack.license) throw new Error(`${pack.directoryName} is missing a license`)
  const { zip, unpackedSize } = zipFiles(pack.files.map((file) => ({ name: file.name, data: file.data })))
  if (zip.length > LIMITS.maxCompressedBytes || unpackedSize > LIMITS.maxUnpackedBytes) {
    throw new Error(`${pack.directoryName} exceeds the market size limit`)
  }
  await writeFile(destination, zip)
  return {
    pack,
    sha256: createHash('sha256').update(zip).digest('hex'),
    compressedSize: zip.length,
    unpackedSize
  }
}

export function catalogEntry(built, repository) {
  const names = releaseNames(built.pack.directoryName, built.pack.version)
  const base = `https://github.com/${repository}/releases/download/${names.tag}`
  return {
    name: built.pack.name,
    kind: built.pack.kind,
    version: built.pack.version,
    description: built.pack.description,
    author: built.pack.author,
    license: built.pack.license,
    compatible: built.pack.compatible,
    partOf: built.pack.partOf,
    parts: built.pack.parts,
    downloadUrl: `${base}/${names.zip}`,
    sha256: built.sha256,
    compressedSize: built.compressedSize,
    unpackedSize: built.unpackedSize,
    previewUrl: built.pack.preview ? `${base}/${names.preview}` : null
  }
}

function assertClipPack(directoryName, pack, files) {
  if (pack?.formatVersion !== 1 || !pack.clips || typeof pack.clips !== 'object' || Array.isArray(pack.clips)) {
    throw new Error(`${directoryName} clip-pack.json is invalid`)
  }
  const names = Object.keys(pack.clips)
  const dirs = new Set(
    files
      .map((file) => file.name.match(/^clips\/([^/]+)\//)?.[1])
      .filter(Boolean)
  )
  if (!names.length || names.length !== dirs.size || names.some((clip) => !dirs.has(clip))) {
    throw new Error(`${directoryName} clips do not match clip-pack.json`)
  }
  for (const [name, clip] of Object.entries(pack.clips)) {
    if (!/^[\w][\w.-]*$/.test(name) || clip?.dir !== `clips/${name}` || !Number.isInteger(clip.frames) || clip.frames < 1) {
      throw new Error(`${directoryName} clip ${name} is invalid`)
    }
  }
}

async function collectFiles(directory, prefix = '') {
  const found = []
  for (const entry of await readdir(path.join(directory, prefix), { withFileTypes: true })) {
    if (SKIP.has(entry.name.toLowerCase())) continue
    if (entry.name === 'node_modules' || entry.name === '.git') continue
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    const full = path.join(directory, relative)
    const stat = await lstat(full)
    if (stat.isSymbolicLink()) throw new Error(`Symlink is not allowed: ${relative}`)
    if (stat.isDirectory()) {
      found.push(...(await collectFiles(directory, relative)))
      continue
    }
    if (!stat.isFile()) throw new Error(`Special file is not allowed: ${relative}`)
    const base = path.basename(relative).toLowerCase()
    const extension = path.extname(relative).toLowerCase()
    if (!BARE.has(base) && !EXTENSIONS.has(extension)) throw new Error(`File type is not allowed: ${relative}`)
    if (stat.size > LIMITS.maxFileBytes) throw new Error(`File exceeds the size limit: ${relative}`)
    found.push({ name: relative, data: await readFile(full) })
    if (found.length > LIMITS.maxEntries) throw new Error('Package has too many files')
  }
  const unpacked = found.reduce((total, file) => total + file.data.length, 0)
  if (unpacked > LIMITS.maxUnpackedBytes) throw new Error('Package exceeds the unpacked size limit')
  return found
}
