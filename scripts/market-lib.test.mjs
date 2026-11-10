import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { inflateRawSync } from 'node:zlib'
import { buildPackZip, decideRelease, listPacks, mergeCatalog } from './market-lib.mjs'
import { zipFiles } from './zip.mjs'

test('scans every official pack directory', async () => {
  const dirs = await listPacks(path.resolve(import.meta.dirname, '..'))
  assert.ok(dirs.includes('theme-phoebe'))
  assert.ok(dirs.includes('pet-bigfish'))
  assert.ok(dirs.includes('pet-bigfish-20'))
  assert.equal(dirs.length >= 43, true)
})

test('packs pet-jelly into a zip and catalog entry', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'pack-'))
  const built = await buildPackZip(path.resolve(import.meta.dirname, '../pet-jelly'), path.join(dir, 'pet.zip'))
  assert.equal(built.pack.name, '@piharness/pet-jelly')
  assert.equal(built.sha256.length, 64)
  assert.equal(built.compressedSize, (await readFile(path.join(dir, 'pet.zip'))).length)
  const entry = (await import('./market-lib.mjs')).catalogEntry(built, 'wangmiaozero/pi-Harness-packages')
  assert.equal(entry.downloadUrl, `https://github.com/wangmiaozero/pi-Harness-packages/releases/download/pet-jelly-v${built.pack.version}/pet-jelly-v${built.pack.version}.zip`)
  assert.equal(entry.partOf, null)
  await rm(dir, { recursive: true, force: true })
})

test('does not replace a release that already has different content', () => {
  assert.equal(decideRelease('', 'abc'), 'create')
  assert.equal(decideRelease('abc', 'abc'), 'skip')
  assert.equal(decideRelease('abc', 'def'), 'conflict')
})

test('catalog merge keeps unrelated packs', () => {
  const next = mergeCatalog(
    { schemaVersion: 1, packages: [{ name: '@piharness/theme-phoebe', version: '1.0.1' }] },
    [{ name: '@piharness/pet-jelly', version: '1.0.1' }]
  )
  assert.deepEqual(next.packages.map((item) => item.name), ['@piharness/pet-jelly', '@piharness/theme-phoebe'])
})

test('zip roundtrip inflates the original bytes', () => {
  const source = Buffer.from('market-pack')
  const { zip, unpackedSize } = zipFiles([{ name: 'package.json', data: source }])
  assert.equal(unpackedSize, source.length)
  const nameLength = zip.readUInt16LE(26)
  const compressedSize = zip.readUInt32LE(18)
  const inflated = inflateRawSync(zip.subarray(30 + nameLength, 30 + nameLength + compressedSize))
  assert.equal(inflated.toString(), 'market-pack')
  assert.equal(zip.includes(Buffer.from('../')), false)
})

test('a changed action pack is the only selected directory', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'select-'))
  await writeFile(path.join(dir, 'diff.txt'), 'pet-bigfish-3/clip-pack.json\nREADME.md\n')
  const selected = new Set()
  for (const line of (await readFile(path.join(dir, 'diff.txt'), 'utf8')).split('\n')) {
    const top = line.split('/')[0]
    if (/^(theme|pet)-[a-z0-9][a-z0-9-]*$/.test(top)) selected.add(top)
  }
  assert.deepEqual([...selected], ['pet-bigfish-3'])
  await rm(dir, { recursive: true, force: true })
})
