import { useState } from 'react'
import { api } from '../../api.ts'
import { useAction } from '../../lib/hooks.ts'
import type { Catalogo } from '../../types.ts'

export function Nacionalidades({ catalogo, onChanged }: { catalogo: Catalogo; onChanged: () => void }) {
  const [nombre, setNombre] = useState('')
  const [edit, setEdit] = useState<{ id: string; nombre: string } | null>(null)
  const action = useAction()
  return (
    <div className="stack">
      <h1>Nacionalidades</h1>
      <p className="muted small">Una nacionalidad desactivada deja de ofrecerse, pero los registros que la tienen la conservan. Al renombrarla, se actualiza en todos los registros.</p>
      <form className="row" onSubmit={(e) => { e.preventDefault(); action.run(async () => { await api('nacionalidades.save', { nombre, orden: catalogo.nacionalidades.length }); setNombre(''); onChanged() }) }}>
        <input className="grow" style={{ width: 'auto' }} required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nueva nacionalidad (país)" />
        <button className="primary" disabled={action.busy}>Agregar</button>
      </form>
      {action.error && <p className="alert">{action.error}</p>}
      <ul className="list">
        {catalogo.nacionalidades.map((n, i) => (
          <li key={n.id} className={n.active ? 'card row between' : 'card row between inactive'}>
            {edit?.id === n.id ? (
              <form className="row grow" onSubmit={(e) => { e.preventDefault(); action.run(async () => { await api('nacionalidades.save', { id: n.id, nombre: edit.nombre, active: n.active, orden: i }); setEdit(null); onChanged() }) }}>
                <input className="grow" style={{ width: 'auto' }} value={edit.nombre} onChange={(e) => setEdit({ ...edit, nombre: e.target.value })} />
                <button className="small primary">Guardar</button>
                <button type="button" className="small" onClick={() => setEdit(null)}>Cancelar</button>
              </form>
            ) : (
              <>
                <span>{n.nombre}{n.active ? '' : <span className="muted small"> · desactivada</span>}</span>
                <span className="row">
                  <button className="small" onClick={() => setEdit({ id: n.id, nombre: n.nombre })}>Renombrar</button>
                  <button className="small" onClick={() => action.run(async () => { await api('nacionalidades.save', { id: n.id, nombre: n.nombre, active: !n.active, orden: i }); onChanged() })}>{n.active ? 'Desactivar' : 'Activar'}</button>
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

type EtapaEdit = { id?: string; nombre: string; descripcion: string; active: boolean; orden: number }

export function Etapas({ catalogo, onChanged }: { catalogo: Catalogo; onChanged: () => void }) {
  const [edit, setEdit] = useState<EtapaEdit | null>(null)
  const action = useAction()
  return (
    <div className="stack">
      <div className="section-title"><h1>Etapas de aprendizaje</h1>{!edit && <button className="primary" onClick={() => setEdit({ nombre: '', descripcion: '', active: true, orden: catalogo.etapas.length })}>+ Agregar</button>}</div>
      <p className="muted small">Lo que el sheij marca en cada persona a medida que avanza. La explicación aparece debajo de cada etapa (por ejemplo, qué incluye o qué fuente usar).</p>
      {edit && (
        <form className="card stack" onSubmit={(e) => { e.preventDefault(); action.run(async () => { await api('etapas.save', edit); setEdit(null); onChanged() }) }}>
          <label className="stack"><span>Nombre <span className="req">*</span></span><input required value={edit.nombre} onChange={(e) => setEdit({ ...edit, nombre: e.target.value })} /></label>
          <label className="stack"><span>Explicación</span><textarea value={edit.descripcion} onChange={(e) => setEdit({ ...edit, descripcion: e.target.value })} /></label>
          <label className="stack"><span>Orden</span><input type="number" value={edit.orden} onChange={(e) => setEdit({ ...edit, orden: Number(e.target.value) })} /></label>
          <label className="check"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /><span>En uso</span></label>
          {action.error && <p className="alert">{action.error}</p>}
          <div className="row"><button className="primary" disabled={action.busy}>Guardar</button><button type="button" onClick={() => setEdit(null)}>Cancelar</button></div>
        </form>
      )}
      <ul className="list">
        {catalogo.etapas.map((e, i) => (
          <li key={e.id} className={e.active ? 'card row between' : 'card row between inactive'}>
            <span className="stack tight"><strong>{e.nombre}</strong>{e.descripcion && <span className="muted small pre">{e.descripcion}</span>}</span>
            <button className="small" onClick={() => setEdit({ id: e.id, nombre: e.nombre, descripcion: e.descripcion, active: e.active, orden: i })}>Editar</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
