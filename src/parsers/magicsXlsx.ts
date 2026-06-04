import { parseMagicsRows, type TableRow } from './magicsCsv'

const preferredSheetPatterns = [/данные.*срез/i, /slice/i, /distribution/i, /magics/i]

export const parseMagicsXlsxFile = async (file: File) => {
  const { default: readXlsxFile } = await import('read-excel-file/browser')
  const sheets = await readXlsxFile(file)
  const sheet =
    sheets.find(({ sheet: sheetName }) =>
      preferredSheetPatterns.some((pattern) => pattern.test(sheetName)),
    ) ?? sheets[0]

  if (!sheet) {
    throw new Error('В XLSX не найдено листов для импорта.')
  }

  return parseMagicsRows(sheet.data as TableRow[], `${file.name} · ${sheet.sheet}`)
}
