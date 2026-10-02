const MAX_SIDE = 2000
const JPEG_QUALITY = 0.85
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.readAsDataURL(file)
  })
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo abrir la imagen'))
    }
    img.src = url
  })
}

/** Converts supported images to a compact JPEG; leaves PDFs byte-for-byte unchanged. */
export async function prepareDocument(file: File): Promise<{ dataUrl: string; bytes: number }> {
  if (file.type === 'application/pdf') {
    if (file.size > MAX_UPLOAD_BYTES) throw new Error('El PDF supera los 8 MB')
    return { dataUrl: await readAsDataUrl(file), bytes: file.size }
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Formatos aceptados: JPEG, PNG, WebP y PDF')
  }
  const img = await loadImage(file)
  const ratio = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio))
  canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Este navegador no pudo procesar la imagen')
  // JPEG has no alpha channel, so flatten transparent PNG/WebP against white.
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(img, 0, 0, canvas.width, canvas.height)
  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  if (!dataUrl.startsWith('data:image/jpeg;base64,')) throw new Error('No se pudo achicar la imagen')
  const bytes = Math.floor((dataUrl.length - dataUrl.indexOf(',') - 1) * 3 / 4)
  if (bytes > MAX_UPLOAD_BYTES) throw new Error('La imagen supera los 8 MB')
  return { dataUrl, bytes }
}

const AVATAR_SIDE = 320
const AVATAR_MAX_BYTES = 280 * 1024

/** A square, centre-cropped JPEG (320px) made from any photo: small enough to keep and to show in lists. */
export async function prepareAvatar(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Formatos aceptados: JPEG, PNG o WebP')
  const img = await loadImage(file)
  const side = Math.min(img.naturalWidth, img.naturalHeight)
  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_SIDE
  canvas.height = AVATAR_SIDE
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Este navegador no pudo procesar la imagen')
  context.fillStyle = '#fff'
  context.fillRect(0, 0, AVATAR_SIDE, AVATAR_SIDE)
  context.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, AVATAR_SIDE, AVATAR_SIDE)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
  if (!dataUrl.startsWith('data:image/jpeg;base64,')) throw new Error('No se pudo preparar la imagen')
  if (Math.floor(((dataUrl.length - dataUrl.indexOf(',') - 1) * 3) / 4) > AVATAR_MAX_BYTES) throw new Error('La imagen es demasiado grande; probá con otra')
  return dataUrl
}
