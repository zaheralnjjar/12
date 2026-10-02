// The complete list as an .xlsx file, written in the browser from the rows the server returned.
// exceljs is loaded only when someone exports, so the app itself stays small.

export async function xlsxBytes(headers: string[], rows: string[][], rtl: boolean): Promise<ArrayBuffer> {
  const { Workbook } = (await import('exceljs')).default
  const wb = new Workbook()
  const ws = wb.addWorksheet(rtl ? 'السجلات' : 'Registros', { views: [{ rightToLeft: rtl, state: 'frozen', ySplit: 1 }] })
  ws.addRow(headers)
  rows.forEach((r) => ws.addRow(r))
  ws.getRow(1).font = { bold: true }
  ws.columns.forEach((col, i) => {
    const longest = Math.max(headers[i]?.length ?? 10, ...rows.slice(0, 200).map((r) => String(r[i] ?? '').length))
    col.width = Math.min(50, Math.max(10, longest + 2))
  })
  // everything stays text: a document number must never turn into 3.0111E+7
  ws.eachRow((row) => row.eachCell((cell) => { cell.numFmt = '@' }))
  return wb.xlsx.writeBuffer() as Promise<ArrayBuffer>
}

export async function downloadXlsx(name: string, headers: string[], rows: string[][], rtl: boolean) {
  const buf = await xlsxBytes(headers, rows, rtl)
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
