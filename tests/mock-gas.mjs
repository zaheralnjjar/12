// In-memory stand-ins for the Google Apps Script services, so the real server
// code (server/*.js) can run under Node for tests and local development.
// The only login shortcut lives HERE (tokens "dev.<email>"); the server code has none.
import vm from 'node:vm'
import { readFileSync, readdirSync } from 'node:fs'
import { createHash, randomUUID } from 'node:crypto'
import { join } from 'node:path'

export const DEV_CLIENT_ID = 'dev-client-id'

export function loadServer({ ownerEmail = 'owner@example.com', serverDir = 'server' } = {}) {
  const props = new Map()
  const cache = new Map()
  const spreadsheets = new Map()
  const files = new Map()
  const folders = new Map()
  const forms = new Map()
  const shared = [] // any sharing call is recorded so tests can assert there are none

  const makeSheet = (name) => {
    const data = [] // rows of cells
    return {
      getName: () => name,
      getMaxRows: () => 1000,
      getDataRange: () => ({ getValues: () => data.map((r) => r.slice()) }),
      appendRow: (arr) => { data.push(arr.slice()) },
      deleteRow: (row) => { data.splice(row - 1, 1) },
      getRange: (row, col, nRows = 1, nCols = 1) => ({
        setNumberFormat: () => {},
        getValues: () => Array.from({ length: nRows }, (_, r) => Array.from({ length: nCols }, (__, c) => data[row - 1 + r]?.[col - 1 + c] ?? '')),
        setValues: (vals) => {
          for (let r = 0; r < nRows; r++) {
            while (data.length < row + r) data.push([])
            for (let c = 0; c < nCols; c++) data[row - 1 + r][col - 1 + c] = vals[r][c]
          }
        },
      }),
      _data: data,
    }
  }
  const makeSpreadsheet = (name) => {
    const id = 'ss_' + randomUUID()
    const formUrl = 'https://docs.google.com/forms/d/form_' + randomUUID() + '/edit'
    const formItems = []
    const form = {
      getItems: (type) => formItems.filter((item) => !type || item._type === type),
      addListItem: (title, choices = []) => {
        const item = {
          _type: 'LIST', _choices: choices.slice(), getTitle: () => title,
          asListItem: () => item,
          setChoiceValues: (values) => { item._choices = values.slice(); return item },
          getChoiceValues: () => item._choices.slice(),
        }
        formItems.push(item)
        return item
      },
      _items: formItems,
    }
    forms.set(formUrl, form)
    const sheets = new Map()
    const ss = {
      getId: () => id,
      getName: () => name,
      getFormUrl: () => ss._formUrl,
      setFormUrl: (url) => { ss._formUrl = url },
      _formUrl: formUrl,
      _form: form,
      getSpreadsheetTimeZone: () => 'America/Argentina/Buenos_Aires',
      getSheetByName: (n) => sheets.get(n) ?? null,
      insertSheet: (n) => { const s = makeSheet(n); sheets.set(n, s); return s },
      copy: (newName) => makeSpreadsheet(newName),
      _sheets: sheets,
    }
    spreadsheets.set(id, ss)
    return ss
  }
  const iterator = (arr) => { let i = 0; return { hasNext: () => i < arr.length, next: () => arr[i++] } }
  const makeFolder = (name) => {
    const id = 'fo_' + randomUUID()
    const children = []
    const f = {
      getId: () => id,
      getName: () => name,
      createFolder: (n) => { const c = makeFolder(n); children.push(c); return c },
      getFoldersByName: (n) => iterator(children.filter((c) => c.getName() === n)),
      createFile: (blob) => {
        const fid = 'fi_' + randomUUID()
        const file = {
          getId: () => fid,
          getName: () => blob.getName(),
          getBlob: () => blob,
          setTrashed: (t) => { file._trashed = t },
          setSharing: (...a) => { shared.push([fid, ...a]) },
          addViewer: (...a) => { shared.push([fid, ...a]) },
          _trashed: false,
          _folder: name,
        }
        files.set(fid, file)
        return file
      },
      setSharing: (...a) => { shared.push([id, ...a]) },
    }
    folders.set(id, f)
    return f
  }

  const ctx = {
    console,
    SpreadsheetApp: { create: makeSpreadsheet, openById: (id) => { const s = spreadsheets.get(id); if (!s) throw new Error('no spreadsheet'); return s } },
    FormApp: {
      ItemType: { LIST: 'LIST' },
      openByUrl: (url) => { const form = forms.get(url); if (!form) throw new Error('no form'); return form },
    },
    DriveApp: {
      createFolder: makeFolder,
      getFolderById: (id) => { const f = folders.get(id); if (!f) throw new Error('no folder'); return f },
      getFileById: (id) => { const f = files.get(id); if (!f || f._trashed) throw new Error('no file'); return f },
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props.get(k) ?? null, setProperty: (k, v) => { props.set(k, String(v)) } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => cache.get(k) ?? null, put: (k, v) => { cache.set(k, v) } }) },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    Session: { getEffectiveUser: () => ({ getEmail: () => ownerEmail }) },
    ContentService: {
      MimeType: { JSON: 'json', TEXT: 'text' },
      createTextOutput: (text) => ({ _text: text, setMimeType() { return this } }),
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' },
      computeDigest: (_alg, s) => [...createHash('sha256').update(s).digest()],
      base64EncodeWebSafe: (bytes) => Buffer.from(bytes).toString('base64url'),
      base64Encode: (bytes) => Buffer.from(bytes).toString('base64'),
      // Apps Script returns signed bytes; mimic that so sign handling is exercised
      base64Decode: (s) => [...new Int8Array(Buffer.from(s, 'base64'))],
      newBlob: (bytes, mime, name) => ({ getBytes: () => bytes, getContentType: () => mime, getName: () => name }),
      getUuid: () => randomUUID(),
      // only the two patterns the server uses, evaluated in the given time zone
      formatDate: (date, tz, fmt) => {
        const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(date).map((p) => [p.type, p.value]))
        if (fmt === 'yyyy-MM-dd') return `${parts.year}-${parts.month}-${parts.day}`
        if (fmt === 'HH:mm:ss') return `${parts.hour}:${parts.minute}:${parts.second}`
        throw new Error('unsupported date pattern ' + fmt)
      },
    },
    UrlFetchApp: {
      fetch: (url) => {
        const token = decodeURIComponent(url.split('id_token=')[1] ?? '')
        const m = /^dev\.([^|]+)(\|.*)?$/.exec(token)
        // "dev.<email>" is a valid login; "dev.<email>|aud" / "|expired" / "|unverified" are tampered tokens
        if (!m || token.length < 20) return { getResponseCode: () => 400, getContentText: () => '{"error":"invalid_token"}' }
        const flag = m[2] ?? ''
        const claims = {
          iss: 'https://accounts.google.com',
          aud: flag === '|aud' ? 'someone-elses-app' : DEV_CLIENT_ID,
          email: m[1],
          email_verified: flag === '|unverified' ? 'false' : 'true',
          exp: String(Math.floor(Date.now() / 1000) + (flag === '|expired' ? -60 : 3600)),
        }
        return { getResponseCode: () => 200, getContentText: () => JSON.stringify(claims) }
      },
    },
    MailApp: {
      sendEmail: (...args) => { ctx.MailApp._sent.push(args) },
      getRemainingDailyQuota: () => 100,
      _sent: [],
    },
    ScriptApp: {
      newTrigger: () => ({
        timeBased: () => ({
          everyDays: () => ({ atHour: () => ({ create: () => {} }) }),
        }),
      }),
      getProjectTriggers: () => [],
    },
  }
  vm.createContext(ctx)
  for (const f of readdirSync(serverDir).filter((n) => n.endsWith('.js')).sort()) {
    vm.runInContext(readFileSync(join(serverDir, f), 'utf8'), ctx, { filename: f })
  }
  props.set('CLIENT_ID', DEV_CLIENT_ID)

  /** Calls the web entry point exactly as the browser would. */
  const call = (email, action, payload, rawToken, extra = {}) => {
    const token = rawToken ?? 'dev.' + email
    const out = ctx.doPost({ postData: { contents: JSON.stringify({ token, action, payload, ...extra }) } })
    return JSON.parse(out._text)
  }
  return { ctx, call, props, files, folders, forms, spreadsheets, shared }
}
