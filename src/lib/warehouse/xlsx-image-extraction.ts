import JSZip from 'jszip'

/**
 * Extracts embedded row-anchored images from an .xlsx workbook's first
 * worksheet, keyed by the same "Excel row number" convention used by
 * `XLSX.utils.sheet_to_json(sheet, { header: 1 })`'s row index + 1 (i.e. for
 * a data row at `allSheetRows[i]`, look up `imagesByRow.get(i + 1)`).
 *
 * Factored out of `/api/warehouse/import` (the original Yuan-stage import,
 * which pioneered this exact drawing/media parsing) so the MBM-300 Container
 * Batch importer can reuse it without duplicating the OOXML-relationship
 * plumbing. Behavior is unchanged from that route's original inline version.
 */
export async function extractImagesFromXlsx(buffer: Buffer): Promise<Map<number, { data: Buffer; mimeType: string }>> {
  const imagesByRow = new Map<number, { data: Buffer; mimeType: string }>()
  try {
    function xlsxResolve(base: string, rel: string): string {
      if (rel.startsWith('/')) return rel.slice(1)
      const parts = base.split('/')
      parts.pop()
      for (const p of rel.split('/')) {
        if (p === '..') parts.pop()
        else if (p !== '.') parts.push(p)
      }
      return parts.join('/')
    }

    const zip = await JSZip.loadAsync(buffer)

    const wbRels = await zip.file('xl/_rels/workbook.xml.rels')?.async('text') ?? ''
    const sheetRel = wbRels.match(/Type="[^"]*\/worksheet"[^>]*Target="([^"]+)"/)
    const sheetPath = sheetRel ? xlsxResolve('xl/workbook.xml', sheetRel[1]) : 'xl/worksheets/sheet1.xml'

    const sheetFileName = sheetPath.split('/').pop()!
    const sheetRels = await zip.file(`xl/worksheets/_rels/${sheetFileName}.rels`)?.async('text') ?? ''
    const drawingRel = sheetRels.match(/Type="[^"]*\/drawing"[^>]*Target="([^"]+)"/)
    if (!drawingRel) throw new Error('no drawing in sheet')
    const drawingPath = xlsxResolve(sheetPath, drawingRel[1])

    const drawingRelsPath = xlsxResolve(drawingPath, `_rels/${drawingPath.split('/').pop()}.rels`)
    const drawingRels = await zip.file(drawingRelsPath)?.async('text') ?? ''
    const rIdToMedia: Record<string, string> = {}
    for (const rel of drawingRels.matchAll(/<Relationship\s[^>]*/g)) {
      const block = rel[0]
      if (!block.includes('/image')) continue
      const id = block.match(/Id="(rId\d+)"/)
      const target = block.match(/Target="([^"]+)"/)
      if (id && target) rIdToMedia[id[1]] = xlsxResolve(drawingPath, target[1])
    }

    const drawingXml = await zip.file(drawingPath)?.async('text') ?? ''
    const anchorRe = /<(?:xdr:)?(?:twoCellAnchor|oneCellAnchor)\b[^>]*>([\s\S]*?)<\/(?:xdr:)?(?:twoCellAnchor|oneCellAnchor)>/g
    for (const [, block] of drawingXml.matchAll(anchorRe)) {
      const fromBlock = block.match(/<(?:xdr:)?from>([\s\S]*?)<\/(?:xdr:)?from>/)
      const blipRid = block.match(/r:embed="(rId\d+)"/)
      if (!fromBlock || !blipRid) continue
      const rowMatch = fromBlock[1].match(/<(?:xdr:)?row>(\d+)<\/(?:xdr:)?row>/)
      if (!rowMatch) continue
      const rowNum = parseInt(rowMatch[1], 10) + 1
      const mediaPath = rIdToMedia[blipRid[1]]
      if (!mediaPath) continue
      const imgBuffer = await zip.file(mediaPath)?.async('nodebuffer')
      if (!imgBuffer) continue
      imagesByRow.set(rowNum, {
        data: imgBuffer,
        mimeType: mediaPath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg',
      })
    }
  } catch (imgErr: any) {
    console.warn('xlsx image extraction skipped:', imgErr.message)
  }
  return imagesByRow
}
