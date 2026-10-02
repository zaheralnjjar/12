export function waDigits(phone: string): string | null {
  let raw = String(phone ?? '').trim()
  if (!raw) return null
  raw = raw.replace(/^\s*00/, '+').replace(/\(0\)/g, '')
  const digits = raw.replace(/\D/g, '')
  return digits.length >= 8 && digits.length <= 15 ? digits : null
}
export function waLink(phone: string, text?: string): string | null {
  const digits = waDigits(phone)
  return digits ? `https://wa.me/${digits}${text === undefined ? '' : `?text=${encodeURIComponent(text)}`}` : null
}
export function waShareLink(text: string): string { return `https://wa.me/?text=${encodeURIComponent(text)}` }
export function whatsappTooLong(text: string): boolean { return encodeURIComponent(text).length > 1800 }

/** Opens WhatsApp with the text ready, after the person saw it in the app. Nothing is sent automatically. */
export function openWhatsApp(phone: string, text: string): boolean {
  const link = waLink(phone, text)
  if (!link) return false
  window.open(link, '_blank', 'noopener')
  return true
}
