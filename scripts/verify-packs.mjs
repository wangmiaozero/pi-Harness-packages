import { createHash } from 'node:crypto'
import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const namePattern = /^@piharness\/(theme|pet)-[a-z0-9][a-z0-9-]*$/
const dirs = (await readdir(root, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && (entry.name.startsWith('theme-') || entry.name.startsWith('pet-')))
  .map((entry) => entry.name)

if (dirs.length < 43) throw new Error(`expected the official packs, found ${dirs.length}`)
const failures = []
for (const dir of dirs) {
  const pkg = JSON.parse(await readFile(path.join(root, dir, 'package.json'), 'utf8'))
  if (!namePattern.test(pkg.name)) failures.push(`${dir} name`)
  if (pkg.scripts) failures.push(`${dir} scripts`)
  if (pkg.dependencies || pkg.devDependencies) failures.push(`${dir} dependencies`)
  if (pkg.publishConfig) failures.push(`${dir} publishConfig`)
  const partOf = pkg.piHarness?.partOf
  if (partOf && !namePattern.test(partOf)) failures.push(`${dir} partOf`)
  if (Array.isArray(pkg.piHarness?.parts)) {
    for (const part of pkg.piHarness.parts) {
      if (!namePattern.test(part)) failures.push(`${dir} part ${part}`)
    }
  }
  let manifest = {}
  if (!partOf) {
    const manifestName = dir.startsWith('theme-') ? 'theme-pack.json' : 'pet-pack.json'
    manifest = JSON.parse(await readFile(path.join(root, dir, manifestName), 'utf8'))
    if (!manifest.id || !manifest.version) failures.push(`${dir} manifest`)
  }
  const text = JSON.stringify(pkg) + JSON.stringify(manifest)
  if (text.includes('/Users/')) failures.push(`${dir} absolute path`)
}
const bigfishPkg = JSON.parse(await readFile(path.join(root, 'pet-bigfish/package.json'), 'utf8'))
const baseClips = ['idle','idle_stretch','idle_yawn','thinking','working','working_search','working_command','waiting','success','error','dragging','dragging_release','head_pat','poke','tail','eat_token']
const bigfishDirs = ['pet-bigfish', ...Array.from({ length: 19 }, (_, index) => `pet-bigfish-${index + 2}`)]
if (bigfishPkg.version !== '1.0.3' || bigfishPkg.piHarness?.parts || bigfishPkg.piHarness?.partOf) {
  failures.push('bigfish parts')
}
const clipOwners = new Map()
let labeled = 0
for (const dir of bigfishDirs) {
  const pkg = JSON.parse(await readFile(path.join(root, dir, 'package.json'), 'utf8'))
  if (pkg.version !== '1.0.3') failures.push(`${dir} version`)
  const onDisk = await readdir(path.join(root, dir, 'clips'))
  if (dir === 'pet-bigfish') {
    const manifest = JSON.parse(await readFile(path.join(root, dir, 'pet-pack.json'), 'utf8'))
    const declared = Object.keys(manifest.clips)
    if (declared.length !== baseClips.length || declared.some((name) => !baseClips.includes(name))) {
      failures.push('bigfish base clips')
    }
    if (onDisk.length !== declared.length || onDisk.some((name) => !manifest.clips[name])) failures.push('bigfish base files')
  } else {
    if (pkg.piHarness?.partOf !== '@piharness/pet-bigfish') failures.push(`${dir} partOf`)
    const pack = JSON.parse(await readFile(path.join(root, dir, 'clip-pack.json'), 'utf8'))
    const declared = Object.keys(pack.clips ?? {})
    if (pack.formatVersion !== 1 || declared.length < 5 || declared.length > 11) failures.push(`${dir} clip count`)
    if (onDisk.length !== declared.length || declared.some((name) => pack.clips[name]?.dir !== `clips/${name}` || !onDisk.includes(name) || baseClips.includes(name))) {
      failures.push(`${dir} clip-pack`)
    }
    labeled += declared.filter((name) => pack.clips[name]?.labels?.['zh-CN']).length
  }
  for (const name of onDisk) {
    if (clipOwners.has(name)) failures.push(`duplicate clip ${name}`)
    clipOwners.set(name, dir)
  }
}
if (clipOwners.size !== 209) failures.push(`bigfish clips ${clipOwners.size}`)
if (labeled !== 193) failures.push(`bigfish labeled clips ${labeled}`)
const hashes = {
  'theme-moonlit-maid/assets/moonlit-tea-room.png': '88e2328a6037d29ca6c45bb8e625d1da56f60bc1fc92899b1a6aae8661492fec',
  'theme-noir-scholar/assets/noir-study.png': 'a73d89375cbf80c13cfe37ec0a2557844cc62b9c74cd39c6776d50726e27fe27',
  'theme-noir-scholar/assets/noir-scholar.png': '66fe8da2ea4b2493929b711701cefa0836a5071517fc3c7aedcf64cada8dd08c',
  'theme-moonlit-maid/assets/moonlit-maid.png': '143c088a291b9906eef1086e391d47c12b88df587f38c695d4b2f249d1608f43'
}
for (const [file, expected] of Object.entries(hashes)) {
  const image = await readFile(path.join(root, file))
  const actual = createHash('sha256').update(image).digest('hex')
  if (actual !== expected) failures.push(`${file} hash`)
  if (image.readUInt32BE(16) !== 1672 && !file.endsWith('noir-scholar.png') && !file.endsWith('moonlit-maid.png')) {
    failures.push(`${file} width`)
  }
}
const scenes = [
  'theme-maid-white/assets/azure-patisserie-atelier-v2.png',
  'theme-office/assets/dusk-executive-suite-v2.png',
  'theme-moonlit-maid/assets/moonlit-tea-room.png',
  'theme-noir-scholar/assets/noir-study.png',
  'theme-ming-snow/assets/snow-palace.png',
  'theme-zhang-juzheng/assets/snow-red-palace.png',
  'theme-ming-moon/assets/moon-city.png'
]
const sceneHashes = new Set()
for (const file of scenes) {
  const image = await readFile(path.join(root, file))
  if (file.endsWith('snow-red-palace.png')) {
    if (image.readUInt32BE(16) !== 1586 || image.readUInt32BE(20) !== 992) failures.push(file)
  } else if (image.readUInt32BE(16) !== 1672 || image.readUInt32BE(20) !== 941) failures.push(file)
  sceneHashes.add(createHash('sha256').update(image).digest('hex'))
}
if (sceneHashes.size !== scenes.length) failures.push('scene hashes are not distinct')
if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}
const sizes = []
for (const dir of dirs) sizes.push(`${dir}\t${(await stat(path.join(root, dir))).isDirectory() ? 'ok' : 'missing'}`)
console.log(`verified ${dirs.length} packages`)
