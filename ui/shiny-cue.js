export const maxCueBytes = 512 * 1024

export function cueType(bytes) {
  const text = (offset, value) => [...value].every((character, index) => bytes[offset + index] === character.charCodeAt(0))
  if (bytes.length >= 44 && text(0, 'RIFF') && text(8, 'WAVE')) return 'audio/wav'
  if (bytes.length >= 10 && (text(0, 'ID3') || bytes[0] === 255 && (bytes[1] & 224) === 224)) return 'audio/mpeg'
  return null
}
