// One person's record: data, follow-up, learning progress, documents, certificates and WhatsApp contact.
import { useState } from 'react'
import { api } from '../api.ts'
import { ConversoForm } from '../components/ConversoForm.tsx'
import type { FormValues } from '../lib/formValues.ts'
import { useAction, useLoad } from '../lib/hooks.ts'
import { prepareDocument } from '../lib/imageResize.ts'
import { DOC_LABEL, ESTADO_LABEL, conSheij, ORIGEN_LABEL, SECCIONES, SECCION_LABEL, SEGUIMIENTO_LABEL, SEXO_LABEL, diasTexto, fecha, hoy } from '../lib/labels.ts'
import { openWhatsApp, whatsappTooLong } from '../lib/whatsapp.ts'
import type { Campo, Catalogo, CertificadoCompleto, Converso, ConversoDetalle, ExtraValue, Role } from '../types.ts'

/** pdf-lib is loaded only when a certificate is downloaded. */
const downloadCertificado = async (c: CertificadoCompleto) => (await import('../export/certificado.ts')).downloadCertificado(c)
const verificationUrl = (token: string) => {
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  url.searchParams.set('verify', token)
  return url.toString()
}
const downloadFicha = async (detalle: ConversoDetalle, campos: Campo[]) => (await import('../export/ficha.ts')).downloadFicha(detalle, campos)

function valueText(c: Campo, conv: Converso): string {
  const raw: ExtraValue | undefined = c.custom ? conv.extra[c.key] : conv[c.key]
  // a withdrawn or never given consent must stay visible, not vanish from the record
  if (c.key === 'consentimientoContacto' && !raw) return 'No'
  if (raw === undefined || raw === null || raw === '') return ''
  if (Array.isArray(raw)) return raw.join(', ')
  switch (c.tipo) {
    case 'sexo': return SEXO_LABEL[raw] || raw
    case 'date': return fecha(raw)
    case 'yesno': return raw === '1' ? 'Sí' + (c.key === 'consentimientoContacto' && conv.fechaConsentimiento ? ` (desde ${fecha(conv.fechaConsentimiento)})` : '') : 'No'
    case 'dias': return diasTexto(raw)
    case 'maestro': return conv.maestroNombre || '—'
    default: return raw
  }
}

function toValues(conv: Converso): FormValues {
  const data: Record<string, string> = {}
  Object.keys(conv).forEach((k) => { if (typeof conv[k] === 'string') data[k] = conv[k] })
  return { data, extra: { ...conv.extra } }
}

/** Only what changed is sent, so an old record with empty required fields can still be corrected bit by bit. */
function changes(before: FormValues, after: FormValues): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  Object.keys(after.data).forEach((k) => { if ((before.data[k] ?? '') !== after.data[k]) data[k] = after.data[k] })
  if ('codigoPais' in data && !('whatsapp' in data)) data.whatsapp = after.data.whatsapp
  const extra: Record<string, ExtraValue> = {}
  Object.keys(after.extra).forEach((k) => { if (JSON.stringify(before.extra[k] ?? '') !== JSON.stringify(after.extra[k])) extra[k] = after.extra[k] })
  return Object.keys(extra).length ? { ...data, extra } : data
}

export function ConversoScreen({ id, role, catalogo, readOnly, onDeleted }: {
  id: string
  role: Role
  catalogo: Catalogo
  readOnly: boolean
  onDeleted: () => void
}) {
  const d = useLoad(() => api<ConversoDetalle>('conversos.get', { id }), `conv-${id}`)
  const [editing, setEditing] = useState<FormValues | null>(null)
  const action = useAction()
  if (d.error) return <p className="alert">{d.error}</p>
  if (!d.data) return <p className="muted">Cargando…</p>
  const { converso: c } = d.data
  const sup = role === 'supervisor'
  const campos = catalogo.campos.filter((f) => f.active)
  const lists = { nacionalidades: catalogo.nacionalidades.filter((n) => n.active).map((n) => n.nombre), maestros: catalogo.maestros }

  if (editing) {
    return (
      <form className="stack" onSubmit={(e) => {
        e.preventDefault()
        action.run(async () => {
          const data = changes(toValues(c), editing)
          if (Object.keys(data).length) await api('conversos.update', { id, data })
          setEditing(null)
          d.reload()
        })
      }}>
        <h1>Editar · {c.nombre}</h1>
        <ConversoForm campos={campos} values={editing} onChange={setEditing} lists={lists} hide={role === 'maestro' ? ['maestroId'] : []} />
        {action.error && <p className="alert">{action.error}</p>}
        <div className="row">
          <button className="primary grow" disabled={action.busy}>{action.busy ? 'Guardando…' : 'Guardar cambios'}</button>
          <button type="button" onClick={() => setEditing(null)}>Cancelar</button>
        </div>
      </form>
    )
  }

  return (
    <div className="stack">
      <header className="stack tight">
        <div className="row between">
          <h1>{c.nombre}</h1>
          <span className="badge">{c.id}</span>
        </div>
        {c.nombreIslamico && <p className="muted">Nombre islámico: {c.nombreIslamico}</p>}
        <div className="row">
          <span className={c.estado === 'activo' ? 'badge good' : 'badge dim'}>{ESTADO_LABEL[c.estado]}</span>
          <span className="badge">{c.maestroNombre ? conSheij(c.maestroNombre) : 'Sin sheij asignado'}</span>
          <span className="badge dim">{ORIGEN_LABEL[c.origen] || c.origen} · {fecha(c.createdAt)}</span>
        </div>
      </header>

      {c.revisar && (
        <div className="card note stack tight">
          <strong>A revisar</strong>
          <span className="pre">{c.revisar.split(' · ').join('\n')}</span>
          {sup && !readOnly && <button className="small" style={{ alignSelf: 'flex-start' }} onClick={() => action.run(async () => { await api('conversos.revisado', { id }); d.reload() })}>Marcar como revisado</button>}
        </div>
      )}

      {!readOnly && (
        <div className="row">
          <button disabled={action.busy} onClick={() => action.run(async () => {
            const detalle = await api<ConversoDetalle>('conversos.ficha', { id })
            await downloadFicha(detalle, campos)
          })}>{action.busy ? 'Preparando PDF…' : 'Descargar ficha'}</button>
          <button onClick={() => setEditing(toValues(c))}>Editar datos</button>
          <select aria-label="Estado" value={c.estado} style={{ width: 'auto' }} onChange={(e) => {
            const estado = e.target.value
            action.run(async () => { await api('conversos.setEstado', { id, estado }); d.reload() })
          }}>
            {Object.entries(ESTADO_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          {sup && (
            <button className="danger" onClick={() => {
              if (!window.confirm(`¿Eliminar definitivamente el registro de ${c.nombre}? Se borran sus datos, seguimientos y documentos. Esta acción no se puede deshacer.`)) return
              action.run(async () => { await api('conversos.delete', { id, confirm: true }); onDeleted() })
            }}>Eliminar</button>
          )}
        </div>
      )}
      {action.error && <p className="alert">{action.error}</p>}

      <WhatsAppBox conv={c} />

      <section className="stack">
        {SECCIONES.map((sec) => {
          const here = campos.filter((f) => (f.seccion || 'otros') === sec && f.key !== 'maestroId')
          const rows = here.map((f) => [f, valueText(f, c)] as const).filter(([, v]) => v)
          if (!rows.length) return null
          return (
            <div className="card stack tight" key={sec}>
              <h2>{SECCION_LABEL[sec]}</h2>
              <dl className="dl">
                {rows.map(([f, v]) => (
                  <div key={f.key} style={{ display: 'contents' }}>
                    <dt>{f.etiqueta}</dt>
                    <dd className={f.tipo === 'textarea' ? 'pre' : ''}>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )
        })}
        {c.fotoFormulario && (
          <p className="small"><a href={c.fotoFormulario} target="_blank" rel="noopener noreferrer">Ver la foto enviada por el formulario de Google</a> <span className="muted">(se abre en Drive con la cuenta dueña del formulario)</span></p>
        )}
      </section>

      <SeguimientoBox id={id} detalle={d.data} readOnly={readOnly} onChange={d.reload} />
      <ProgresoBox id={id} detalle={d.data} catalogo={catalogo} readOnly={readOnly} onChange={d.reload} />
      <DocumentosBox id={id} detalle={d.data} readOnly={readOnly} onChange={d.reload} />
      <CertificadosBox id={id} detalle={d.data} readOnly={readOnly} onChange={d.reload} />
    </div>
  )
}

function WhatsAppBox({ conv }: { conv: Converso }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(`Assalamu alaikum ${conv.nombres || ''}, `)
  if (!conv.whatsapp) return <p className="muted small">Sin número de WhatsApp.</p>
  if (!open) return <button className="wa" style={{ alignSelf: 'flex-start' }} onClick={() => setOpen(true)}>Escribir por WhatsApp</button>
  return (
    <div className="card stack">
      <h2>Mensaje por WhatsApp</h2>
      {conv.consentimientoContacto !== '1' && <p className="note small">Esta persona no marcó que acepta ser contactada por WhatsApp. Asegurate de que esté de acuerdo.</p>}
      <p className="muted small">Para: <span dir="ltr">{conv.whatsapp}</span>. Revisá el texto: se abre WhatsApp y vos lo enviás. No escribas datos sensibles.</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} />
      {whatsappTooLong(text) && <p className="alert small">El mensaje es demasiado largo para un enlace de WhatsApp.</p>}
      <div className="row">
        <button className="wa" disabled={whatsappTooLong(text)} onClick={() => openWhatsApp(conv.whatsapp, text)}>Abrir WhatsApp</button>
        <button onClick={() => setOpen(false)}>Cerrar</button>
      </div>
    </div>
  )
}

function SeguimientoBox({ id, detalle, readOnly, onChange }: { id: string; detalle: ConversoDetalle; readOnly: boolean; onChange: () => void }) {
  const empty = { fecha: hoy(), tipo: 'llamada', resumen: '', proximaAccion: '', proximaFecha: '' }
  const [f, setF] = useState(empty)
  const [open, setOpen] = useState(false)
  const action = useAction()
  return (
    <section className="card stack">
      <div className="section-title">
        <h2>Seguimiento</h2>
        {!readOnly && !open && <button className="small primary" onClick={() => setOpen(true)}>+ Agregar</button>}
      </div>
      {open && (
        <form className="stack" onSubmit={(e) => {
          e.preventDefault()
          action.run(async () => { await api('seguimiento.add', { conversoId: id, ...f }); setF(empty); setOpen(false); onChange() })
        }}>
          <div className="two">
            <label className="stack"><span>Fecha</span><input type="date" value={f.fecha} max={hoy()} onChange={(e) => setF({ ...f, fecha: e.target.value })} /></label>
            <label className="stack"><span>Tipo</span>
              <select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
                {Object.entries(SEGUIMIENTO_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
          </div>
          <label className="stack"><span>Resumen <span className="req">*</span></span><textarea required value={f.resumen} onChange={(e) => setF({ ...f, resumen: e.target.value })} maxLength={3000} /></label>
          <div className="two">
            <label className="stack"><span>Próximo paso</span><input value={f.proximaAccion} onChange={(e) => setF({ ...f, proximaAccion: e.target.value })} maxLength={300} /></label>
            <label className="stack"><span>Fecha del próximo paso</span><input type="date" value={f.proximaFecha} onChange={(e) => setF({ ...f, proximaFecha: e.target.value })} /></label>
          </div>
          <p className="help">Las notas de seguimiento son internas: la persona no las ve.</p>
          {action.error && <p className="alert">{action.error}</p>}
          <div className="row"><button className="primary" disabled={action.busy}>Guardar</button><button type="button" onClick={() => setOpen(false)}>Cancelar</button></div>
        </form>
      )}
      {detalle.seguimiento.length === 0 ? <p className="muted">Todavía no hay seguimientos.</p> : (
        <ul className="timeline">
          {detalle.seguimiento.map((s) => (
            <li key={s.id} className="stack tight">
              <div className="row between">
                <strong>{fecha(s.fecha)} · {SEGUIMIENTO_LABEL[s.tipo] || s.tipo}</strong>
                {!readOnly && <button className="ghost small" onClick={() => { if (window.confirm('¿Borrar esta nota?')) action.run(async () => { await api('seguimiento.delete', { id: s.id }); onChange() }) }}>Borrar</button>}
              </div>
              <span className="pre">{s.resumen}</span>
              {(s.proximaAccion || s.proximaFecha) && <span className="small">Próximo paso: {s.proximaAccion} {s.proximaFecha && `(${fecha(s.proximaFecha)})`}</span>}
              <span className="muted small" dir="ltr" style={{ textAlign: 'start' }}>{s.autor}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ProgresoBox({ id, detalle, catalogo, readOnly, onChange }: { id: string; detalle: ConversoDetalle; catalogo: Catalogo; readOnly: boolean; onChange: () => void }) {
  const action = useAction()
  const done = new Map(detalle.progreso.map((p) => [p.etapaId, p.fecha]))
  const etapas = catalogo.etapas.filter((e) => e.active || done.has(e.id))
  if (!etapas.length) return null
  return (
    <section className="card stack">
      <h2>Aprendizaje · {done.size} de {etapas.length}</h2>
      {etapas.map((e) => (
        <div key={e.id} className="stack tight">
          <label className="check">
            <input type="checkbox" disabled={readOnly || action.busy} checked={done.has(e.id)} onChange={(ev) => {
              const hecho = ev.target.checked
              action.run(async () => { await api('progreso.set', { conversoId: id, etapaId: e.id, hecho }); onChange() })
            }} />
            <span>{e.nombre}{done.get(e.id) ? <span className="muted small"> · {fecha(done.get(e.id) || '')}</span> : null}</span>
          </label>
          {e.descripcion && <span className="help pre" style={{ paddingInlineStart: 30 }}>{e.descripcion}</span>}
        </div>
      ))}
      {action.error && <p className="alert">{action.error}</p>}
    </section>
  )
}

function DocumentosBox({ id, detalle, readOnly, onChange }: { id: string; detalle: ConversoDetalle; readOnly: boolean; onChange: () => void }) {
  const [tipo, setTipo] = useState('dni_frente')
  const [shown, setShown] = useState<{ id: string; dataUrl: string; mime: string } | null>(null)
  const action = useAction()
  const view = (docId: string) => action.run(async () => {
    const r = await api<{ dataUrl: string; mime: string }>('documentos.get', { id: docId })
    if (r.mime === 'application/pdf') {
      const bytes = Uint8Array.from(atob(r.dataUrl.split(',')[1]), (ch) => ch.charCodeAt(0))
      window.open(URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })), '_blank', 'noopener')
    } else setShown({ id: docId, ...r })
  })
  return (
    <section className="card stack">
      <h2>Documentos</h2>
      <p className="help">Privados. Cada vez que alguien abre un documento queda registrado.</p>
      {detalle.documentos.length === 0 ? <p className="muted">No hay documentos.</p> : (
        <ul className="list">
          {detalle.documentos.map((doc) => (
            <li key={doc.id} className="row between">
              <span>{DOC_LABEL[doc.tipo] || doc.tipo} <span className="muted small">· {fecha(doc.uploadedAt)}</span></span>
              <span className="row">
                <button className="small" onClick={() => view(doc.id)}>Ver</button>
                {!readOnly && <button className="small danger" onClick={() => { if (window.confirm('¿Quitar este documento?')) action.run(async () => { await api('documentos.remove', { id: doc.id }); setShown(null); onChange() }) }}>Quitar</button>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {shown && (
        <figure className="stack tight" style={{ margin: 0 }}>
          <img className="docthumb" src={shown.dataUrl} alt="Documento" />
          <button className="small" style={{ alignSelf: 'flex-start' }} onClick={() => setShown(null)}>Cerrar</button>
        </figure>
      )}
      {!readOnly && (
        <div className="row">
          <select aria-label="Tipo de documento" value={tipo} onChange={(e) => setTipo(e.target.value)} style={{ width: 'auto' }}>
            {Object.entries(DOC_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <label className="button">
            {action.busy ? 'Subiendo…' : 'Subir documento'}
            <input type="file" hidden accept="image/jpeg,image/png,image/webp,application/pdf" disabled={action.busy} onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              action.run(async () => {
                const { dataUrl } = await prepareDocument(file)
                await api('documentos.upload', { conversoId: id, tipo, dataUrl })
                onChange()
              })
            }} />
          </label>
        </div>
      )}
      {action.error && <p className="alert">{action.error}</p>}
    </section>
  )
}

function CertificadosBox({ id, detalle, readOnly, onChange }: { id: string; detalle: ConversoDetalle; readOnly: boolean; onChange: () => void }) {
  const [emisor, setEmisor] = useState<'maestro' | 'centro'>(detalle.converso.maestroId ? 'maestro' : 'centro')
  const [idioma, setIdioma] = useState<'es' | 'es_ar'>('es')
  const action = useAction()
  const download = (certId: string, token?: string) => action.run(async () => {
    const full = await api<CertificadoCompleto>('certificados.get', { id: certId })
    const verifyToken = token || (await api<{ token: string }>('certificados.verifyToken', { id: certId })).token
    await downloadCertificado({ ...full, verificationUrl: verificationUrl(verifyToken) })
  })
  return (
    <section className="card stack">
      <h2>Certificado de conversión al Islam</h2>
      {!detalle.converso.fechaShahada && <p className="note small">Para emitir el certificado, primero cargá la fecha de la shahada en los datos.</p>}
      {detalle.certificados.length > 0 && (
        <ul className="list">
          {detalle.certificados.map((x) => (
            <li key={x.id} className="row between">
              <span className="stack tight">
                <strong>{x.numero} <span className={x.estado === 'valido' ? 'badge good' : 'badge bad'}>{x.estado === 'valido' ? 'Válido' : 'Anulado'}</span></strong>
                <span className="muted small">{fecha(x.fecha)} · {x.emisor === 'maestro' ? conSheij(x.maestroNombre) : 'Centro'} · {x.idioma === 'es' ? 'Español' : 'Español y árabe'}</span>
                {x.anuladoMotivo && <span className="small">Motivo: {x.anuladoMotivo}</span>}
              </span>
              <span className="row">
                <button className="small" disabled={readOnly} onClick={() => download(x.id)}>Descargar PDF</button>
                {!readOnly && x.estado === 'valido' && (
                  <button className="small danger" onClick={() => {
                    const motivo = window.prompt('Motivo de la anulación')
                    if (motivo) action.run(async () => { await api('certificados.annul', { id: x.id, motivo }); onChange() })
                  }}>Anular</button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {!readOnly && detalle.converso.fechaShahada && (
        <div className="row">
          <select aria-label="Emitido por" value={emisor} onChange={(e) => setEmisor(e.target.value as 'maestro' | 'centro')} style={{ width: 'auto' }}>
            <option value="maestro" disabled={!detalle.converso.maestroId}>A nombre del sheij</option>
            <option value="centro">A nombre del centro islámico</option>
          </select>
          <select aria-label="Idioma" value={idioma} onChange={(e) => setIdioma(e.target.value as 'es' | 'es_ar')} style={{ width: 'auto' }}>
            <option value="es">Español</option>
            <option value="es_ar">Español y árabe</option>
          </select>
          <button className="primary" disabled={action.busy} onClick={() => action.run(async () => {
            const cert = await api<{ id: string; verificationToken: string }>('certificados.issue', { conversoId: id, emisor, idioma })
            onChange()
            const full = await api<CertificadoCompleto>('certificados.get', { id: cert.id })
            await downloadCertificado({ ...full, verificationUrl: verificationUrl(cert.verificationToken) })
          })}>Emitir certificado</button>
        </div>
      )}
      {action.error && <p className="alert">{action.error}</p>}
    </section>
  )
}
