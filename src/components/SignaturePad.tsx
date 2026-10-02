import { useCallback, useEffect, useRef, useState } from 'react'
import { useAction } from '../lib/hooks.ts'
import { canvasToSignature, fileToSignature } from '../lib/signatureCanvas.ts'
import { T } from '../lib/i18n.tsx'
import { useLocale } from '../lib/i18n.tsx'

const INK = '#16245f'

/**
 * Draw with a finger (or upload a photo of a signature); the result is a PNG
 * with a transparent background. `current` is the saved signature, if any.
 */
export function SignaturePad({
  current,
  onSave,
  allowUpload = true,
}: {
  current: string | null
  onSave: (pngDataUrl: string) => Promise<void>
  allowUpload?: boolean
}) {
  const { t } = useLocale()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const inked = useRef(false) // something is drawn on the surface
  const last = useRef<{ x: number; y: number } | null>(null)
  const [dirty, setDirty] = useState(false)
  const [preview, setPreview] = useState<string | null>(null) // processed upload awaiting confirmation
  const action = useAction()

  /**
   * Gives the drawing surface its real size. A pad inside a closed section is 0 pixels wide when it is created,
   * and a surface of 0 pixels draws nothing, so this runs again whenever the pad gets a size (and never wipes a drawing).
   */
  const fit = useCallback(() => {
    const c = canvasRef.current
    if (!c || !c.clientWidth || !c.clientHeight) return
    const ratio = Math.min(3, window.devicePixelRatio || 1)
    const w = Math.round(c.clientWidth * ratio)
    const h = Math.round(c.clientHeight * ratio)
    if (c.width === w && c.height === h) return
    if (drawing.current || inked.current) return // resizing would erase what was drawn
    c.width = w
    c.height = h
  }, [])

  useEffect(() => {
    const c = canvasRef.current!
    fit()
    const watcher = new ResizeObserver(() => fit())
    watcher.observe(c)
    return () => watcher.disconnect()
  }, [fit])

  /** The pen: settings are applied on every stroke because resizing the surface resets them. */
  const pen = () => {
    const c = canvasRef.current!
    const ctx = c.getContext('2d')!
    const ratio = c.width / Math.max(1, c.clientWidth)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = INK
    ctx.fillStyle = INK
    ctx.lineWidth = 2.6 * ratio
    return ctx
  }

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!
    const r = c.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height }
  }

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    fit()
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    last.current = point(e)
    const ctx = pen()
    ctx.beginPath()
    ctx.arc(last.current.x, last.current.y, ctx.lineWidth / 2, 0, Math.PI * 2)
    ctx.fill()
    inked.current = true
    setDirty(true)
    setPreview(null)
  }

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return
    const p = point(e)
    const ctx = pen()
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    last.current = p
  }

  const up = () => {
    drawing.current = false
    last.current = null
  }

  const clear = () => {
    const c = canvasRef.current!
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
    inked.current = false
    setDirty(false)
    setPreview(null)
  }

  const save = () =>
    action.run(async () => {
      const png = preview ?? canvasToSignature(canvasRef.current!)
      if (!png) throw new Error('Primero dibujá la firma')
      await onSave(png)
      clear()
      return 'Firma guardada'
    })

  const pick = (file: File | undefined) =>
    action.run(async () => {
      if (!file) return
      const png = await fileToSignature(file)
      if (!png) throw new Error('No encontré una firma clara en la imagen. Probá con una foto más nítida sobre papel blanco.')
      clear()
      setPreview(png)
    })

  return (
    <div className="sigpad">
      {current && !preview && (
        <figure>
          <figcaption className="muted"><T>Firma guardada</T></figcaption>
          <div className="sig-preview">
            <img src={current} alt={t('Firma guardada')} />
          </div>
        </figure>
      )}
      {preview && (
        <figure>
          <figcaption className="muted"><T>Así quedará la firma sin el fondo. Si está bien, tocá «Guardar».</T></figcaption>
          <div className="sig-preview">
            <img src={preview} alt={t('Vista previa de la firma')} />
          </div>
        </figure>
      )}
      <p className="muted"><T>{current ? 'Para cambiarla, dibujá una nueva aquí:' : 'Dibujá tu firma con el dedo dentro del recuadro:'}</T></p>
      <canvas
        ref={canvasRef}
        className="sig-canvas"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        aria-label={t('Espacio para dibujar la firma')}
      />
      <div className="row">
        <button className="primary" onClick={save} disabled={action.busy || (!dirty && !preview)}>
          <T>{action.busy ? 'Guardando…' : 'Guardar'}</T>
        </button>
        <button onClick={clear} disabled={action.busy || (!dirty && !preview)}>
          <T>
          <T>
          Borrar
        </T></T></button>
        {allowUpload && (
          <label className="button">
            <T>
            <T>
            Subir foto de la firma
            </T></T><input type="file" accept="image/*" hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = '' }} />
          </label>
        )}
      </div>
      {action.error && <p className="alert"><T>{action.error}</T></p>}
      {action.done && <p className="ok"><T>{action.done}</T></p>}
    </div>
  )
}
