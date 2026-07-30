export function getFileExtension(filename: string) {
  if (filename.indexOf('.') === -1) return ''
  return filename.split('.').pop()
}
