import { useState } from 'react'
import type { GeometryImport } from '../domain/types'
import { parseMagicsCsv } from '../parsers/magicsCsv'
import { parseMagicsXlsxFile } from '../parsers/magicsXlsx'
import { parseStlMeshFile, type StlMeshPreview } from '../parsers/stl'
import LayoutPreview from './LayoutPreview'

type FileImportProps = {
  onImport: (geometry: GeometryImport) => void
  onStatus: (message: string) => void
  onMeshPreview?: (mesh: StlMeshPreview | null) => void
}

const FileImport = ({ onImport, onStatus, onMeshPreview }: FileImportProps) => {
  const [mesh, setMesh] = useState<StlMeshPreview | null>(null)
  const [selectedFileName, setSelectedFileName] = useState('Файл не выбран')

  const updateMeshPreview = (nextMesh: StlMeshPreview | null) => {
    setMesh(nextMesh)
    onMeshPreview?.(nextMesh)
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) {
      return
    }

    setSelectedFileName(file.name)

    try {
      const extension = file.name.split('.').pop()?.toLowerCase()

      if (extension === 'stl') {
        const imported = await parseStlMeshFile(file)
        updateMeshPreview(imported.mesh)
        onImport(imported.geometry)
      } else if (extension === 'xlsx') {
        const imported = await parseMagicsXlsxFile(file)
        updateMeshPreview(null)
        onImport(imported)
      } else {
        const imported = parseMagicsCsv(await file.text(), file.name)
        updateMeshPreview(null)
        onImport(imported)
      }

      onStatus(`Импортировано: ${file.name}`)
    } catch (error) {
      onStatus(error instanceof Error ? error.message : 'Не удалось импортировать файл.')
    }
  }

  return (
    <div className="file-import">
      <div className="import-layout">
        <div>
          <label className="upload">
            <span>Загрузить STL, CSV или XLSX из Magics</span>
            <strong className="upload-button">Выбрать файл</strong>
            <small title={selectedFileName}>{selectedFileName}</small>
            <input
              type="file"
              accept=".stl,.csv,.txt,.xlsx"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
          </label>
          <div className="import-help">
            <span>Поддерживается</span>
            <p>Срезы Magics или таблица с готовыми параметрами компоновки.</p>
            <div className="import-chips" aria-label="Поддерживаемые колонки CSV/XLSX">
              <code>partsVolumeMm3</code>
              <code>supportVolumeMm3</code>
              <code>meanSectionMm2</code>
              <code>buildHeightMm</code>
            </div>
          </div>
        </div>
        <LayoutPreview mesh={mesh} />
      </div>
    </div>
  )
}

export default FileImport
