import {
  AlignmentType, BorderStyle, HeadingLevel, ImageRun,
  Paragraph, Table, TableCell, TableRow, TextRun,
  WidthType, VerticalAlign,
} from 'docx';

type TipoImagenDocx = 'png' | 'jpg' | 'gif' | 'bmp';

const EXT_A_TIPO_DOCX: Record<string, TipoImagenDocx> = {
  png: 'png', jpg: 'jpg', jpeg: 'jpg', gif: 'gif', bmp: 'bmp',
};

const EVIDENCIA_MAX_ANCHO = 500;
const EVIDENCIA_MAX_ALTO  = 380;

export function sectionTitle(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 120 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'C8D6E8', space: 4 },
    },
    children: [new TextRun({ text, bold: true, size: 22, color: '1E3A5F' })],
  });
}

export function infoTable(rows: [string, string][], labelWidth = 28): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: { bottom: 240 },
    rows: rows.map(([label, value]) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: labelWidth, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            shading: { fill: 'EEF2F7' },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: label, bold: true, size: 20, color: '374151' })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 100 - labelWidth, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: value, size: 20 })],
              }),
            ],
          }),
        ],
      })
    ),
  });
}

/**
 * Descarga una evidencia y, si es un formato que `docx` puede embeber (png/jpg/gif/bmp),
 * devuelve sus bytes ya escalados para no desbordar la página. Para otros tipos (webp,
 * video, pdf, log/txt) o si la descarga falla, devuelve null — el llamador la lista como
 * texto en vez de imagen.
 */
async function fetchEvidenciaImagen(
  evidencia: { url: string; nombre: string },
  resolverUrl: (rutaRelativa: string) => string,
): Promise<{ data: Uint8Array; type: TipoImagenDocx; width: number; height: number } | null> {
  const ext = (evidencia.nombre.split('.').pop() ?? evidencia.url.split('.').pop() ?? '').toLowerCase();
  const type = EXT_A_TIPO_DOCX[ext];
  if (!type) return null;

  try {
    const res = await fetch(resolverUrl(evidencia.url));
    if (!res.ok) return null;
    const data = new Uint8Array(await res.arrayBuffer());

    const blobUrl = URL.createObjectURL(new Blob([data]));
    try {
      const { width, height } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const img = new Image();
        img.onload  = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => reject(new Error(`No se pudo leer la imagen: ${evidencia.nombre}`));
        img.src = blobUrl;
      });
      const escala = Math.min(EVIDENCIA_MAX_ANCHO / width, EVIDENCIA_MAX_ALTO / height, 1);
      return { data, type, width: Math.round(width * escala), height: Math.round(height * escala) };
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  } catch {
    return null;
  }
}

/** Construye los párrafos de la sección "Evidencias": imágenes embebidas + resto como adjuntos listados. */
export async function evidenciasParagraphs(
  evidencias: { url: string; nombre: string }[] | undefined,
  resolverUrl: (rutaRelativa: string) => string,
): Promise<Paragraph[]> {
  if (!evidencias?.length) {
    return [new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'Sin evidencias adjuntas.', color: '9CA3AF', size: 18 })] })];
  }

  const bloques: Paragraph[] = [];
  for (const ev of evidencias) {
    const img = await fetchEvidenciaImagen(ev, resolverUrl);
    if (img) {
      bloques.push(new Paragraph({
        spacing: { before: 120, after: 60 },
        alignment: AlignmentType.CENTER,
        children: [new ImageRun({ type: img.type, data: img.data, transformation: { width: img.width, height: img.height } })],
      }));
      bloques.push(new Paragraph({
        spacing: { after: 220 },
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: ev.nombre, size: 16, color: '6B7280', italics: true })],
      }));
    } else {
      bloques.push(new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: `📎 ${ev.nombre} (adjunto no previsualizable en este documento — ver en el sistema)`, size: 18 })],
      }));
    }
  }
  return bloques;
}

export function multilineParagraphs(text: string): Paragraph[] {
  if (!text?.trim()) {
    return [new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: '—', color: '9CA3AF' })] })];
  }
  const lines = text.split('\n').filter(l => l.trim());
  return lines.map((line, i) =>
    new Paragraph({
      spacing: { after: i === lines.length - 1 ? 200 : 80 },
      children: [new TextRun({ text: line.trim(), size: 20 })],
    })
  );
}
