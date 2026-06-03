import { useState } from 'react'
import type { GeometryImport } from '../domain/types'
import { parseMagicsCsv } from '../parsers/magicsCsv'
import { parseStlMeshFile, type StlMeshPreview } from '../parsers/stl'
import LayoutPreview from './LayoutPreview'

type FileImportProps = {
  onImport: (geometry: GeometryImport) => void
  onStatus: (message: string) => void
}

const FileImport = ({ onImport, onStatus }: FileImportProps) => {
  const [mesh, setMesh] = useState<StlMeshPreview | null>(null)

  const handleFile = async (file: File | undefined) => {
    if (!file) {
      return
    }

    try {
      const extension = file.name.split('.').pop()?.toLowerCase()

      if (extension === 'stl') {
        const imported = await parseStlMeshFile(file)
        setMesh(imported.mesh)
        onImport(imported.geometry)
      } else {
        const imported = parseMagicsCsv(await file.text(), file.name)
        setMesh(null)
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
            <span>Загрузить STL или CSV из Magics</span>
            <input
              type="file"
              accept=".stl,.csv,.txt"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
          </label>
          <p>
            CSV может содержать срезы Magics или колонки: <code>partsVolumeMm3</code>,{' '}
            <code>supportVolumeMm3</code>, <code>meanSectionMm2</code>, <code>buildHeightMm</code>.
          </p>
        </div>
        <LayoutPreview mesh={mesh} />
      </div>
    </div>
  )
}

export default FileImport
