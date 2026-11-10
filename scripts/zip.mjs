import { deflateRawSync } from 'node:zlib'

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }
  return (~crc) >>> 0
}

/** Store files at the archive root. Names use forward slashes and no parent segments. */
export function zipFiles(files) {
  const locals = []
  const centrals = []
  let offset = 0
  let unpacked = 0
  for (const file of files) {
    if (typeof file.name !== 'string' || file.name.includes('\\') || file.name.split('/').some((part) => !part || part === '.' || part === '..')) {
      throw new Error(`Unsafe ZIP path: ${file.name}`)
    }
    const name = Buffer.from(file.name)
    const data = file.data
    const compressed = deflateRawSync(data)
    const crc = crc32(data)
    unpacked += data.length
    const local = Buffer.alloc(30 + name.length + compressed.length)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6)
    local.writeUInt16LE(8, 8)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(compressed.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(name.length, 26)
    name.copy(local, 30)
    compressed.copy(local, 30 + name.length)
    locals.push(local)
    const central = Buffer.alloc(46 + name.length)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt16LE(8, 10)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(compressed.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt32LE(offset, 42)
    name.copy(central, 46)
    centrals.push(central)
    offset += local.length
  }
  const directory = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(directory.length, 12)
  end.writeUInt32LE(offset, 16)
  return { zip: Buffer.concat([...locals, directory, end]), unpackedSize: unpacked }
}
