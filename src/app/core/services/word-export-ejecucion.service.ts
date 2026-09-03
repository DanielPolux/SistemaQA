import { Injectable } from '@angular/core';
import {
  AlignmentType, BorderStyle, Document, HeadingLevel, ImageRun,
  Packer, Paragraph, Table, TableCell, TableRow, TextRun,
  VerticalAlign, WidthType,
} from 'docx';
import { saveAs } from 'file-saver';

type TipoImagenDocx = 'png' | 'jpg' | 'gif' | 'bmp';

export interface PasoEvidenciaWord {
  orden: number;
  descripcion: string;
  resultadoEsperado: string;
  estado: 'pendiente' | 'ok' | 'no_ok' | 'bloqueado';
  imagenes: string[];
}

export interface EjecucionEvidenciaWord {
  esReporteDefecto: boolean;
  codigoProyecto?: string;
  proyecto: string;
  ciclo: string;
  codigoCaso: string;
  nombreCaso: string;
  descripcionCaso?: string;
  tester: string;
  ambiente: string;
  version: string;
  resultado: string;
  resultadoEsperado?: string;
  resultadoObtenido?: string;
  observaciones?: string;
  defectoTitulo?: string;
  defectoDescripcion?: string;
  defectoPasos?: string;
  defectoSeveridad?: string;
  defectoPrioridad?: string;
  defectoAsignadoA?: string;
  pasos: PasoEvidenciaWord[];
}

@Injectable({ providedIn: 'root' })
export class EjecucionWordExportService {
  async exportar(data: EjecucionEvidenciaWord): Promise<void> {
    const fecha = new Date().toLocaleString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const contenidoPasos: (Paragraph | Table)[] = [];
    if (!data.pasos.length) {
      contenidoPasos.push(this.parrafo('El caso no tiene pasos registrados.', '6B7280'));
    }

    for (const paso of data.pasos) {
      const estado = paso.estado === 'ok' ? 'OK'
        : paso.estado === 'no_ok' ? 'NO OK'
        : paso.estado === 'bloqueado' ? 'BLOQUEADO / NO EJECUTADO'
        : 'PENDIENTE';
      const color = paso.estado === 'ok' ? '15803D'
        : paso.estado === 'no_ok' ? 'B91C1C'
        : paso.estado === 'bloqueado' ? '92400E'
        : '6B7280';
      contenidoPasos.push(new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 280, after: 100 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'D9E2EC', space: 3 } },
        children: [
          new TextRun({ text: `Paso ${paso.orden}`, bold: true, size: 23, color: '1E3A5F' }),
          new TextRun({ text: `  ${estado}`, bold: true, size: 19, color }),
        ],
      }));
      contenidoPasos.push(this.tablaInfo([
        ['Acción', paso.descripcion || '—'],
      ], 18));

      if (!paso.imagenes.length) {
        contenidoPasos.push(this.parrafo('Sin capturas para este paso.', '9CA3AF'));
      } else {
        for (let i = 0; i < paso.imagenes.length; i++) {
          const imagen = await this.imagenDesdeDataUrl(paso.imagenes[i]);
          if (!imagen) {
            contenidoPasos.push(this.parrafo(`No se pudo incluir la captura ${i + 1}.`, 'B91C1C'));
            continue;
          }
          contenidoPasos.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 50 },
            children: [new ImageRun({
              type: imagen.type,
              data: imagen.data,
              transformation: { width: imagen.width, height: imagen.height },
            })],
          }));
          contenidoPasos.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 180 },
            children: [new TextRun({ text: `Captura ${i + 1} — Paso ${paso.orden}`, italics: true, size: 16, color: '6B7280' })],
          }));
        }
      }
    }

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [new TextRun({ text: 'SISTEMA QA TOTAL', size: 18, color: '6B7280' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [new TextRun({
              text: data.esReporteDefecto ? 'REPORTE DE DEFECTO' : 'EVIDENCIA DE EJECUCIÓN',
              size: 34,
              bold: true,
              color: data.esReporteDefecto ? 'B91C1C' : '1E3A5F',
            })],
          }),
          this.tituloSeccion('CABECERA'),
          this.tablaInfo([
            ['Proyecto', [data.codigoProyecto, data.proyecto].filter(Boolean).join(' - ') || '—'],
            ['Ciclo de prueba', data.ciclo || '—'],
            ['Caso de prueba', `${data.codigoCaso} — ${data.nombreCaso}`],
            ['Tester', data.tester || '—'],
            ['Fecha de generación', fecha],
            ['Ambiente', data.ambiente || '—'],
            ['Versión', data.version || '—'],
            ['Resultado', data.resultado || 'Pendiente'],
          ], 18),
          this.tituloSeccion('DETALLE DEL CASO'),
          this.tablaInfo([
            ['Descripción', data.descripcionCaso || '—'],
            ['Resultado esperado', data.resultadoEsperado || '—'],
            ['Resultado obtenido', data.resultadoObtenido || '—'],
            ['Observaciones', data.observaciones || '—'],
          ], 18),
          ...(data.esReporteDefecto ? [
            this.tituloSeccion('DETALLE DEL DEFECTO'),
            this.tablaInfo([
              ['Título', data.defectoTitulo || '—'],
              ['Descripción', data.defectoDescripcion || '—'],
              ['Pasos para reproducir', data.defectoPasos || '—'],
              ['Severidad', data.defectoSeveridad || '—'],
              ['Prioridad', data.defectoPrioridad || '—'],
              ['Asignado a', data.defectoAsignadoA || 'Sin asignar'],
            ]),
          ] : []),
          this.tituloSeccion('PASOS Y CAPTURAS'),
          ...contenidoPasos,
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const codigoCompleto = [data.codigoProyecto, data.codigoCaso]
      .filter(Boolean)
      .join('-')
      .replace(/[^a-zA-Z0-9_-]+/g, '-');
    const version = (data.version || '').replace(/[^a-zA-Z0-9_-]+/g, '-');
    saveAs(blob, `${[codigoCompleto || 'caso-prueba', version].filter(Boolean).join('-')}.docx`);
  }

  private tituloSeccion(texto: string): Paragraph {
    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 320, after: 120 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'C8D6E8', space: 4 } },
      children: [new TextRun({ text: texto, bold: true, size: 22, color: '1E3A5F' })],
    });
  }

  private tablaInfo(filas: [string, string][], anchoEtiqueta = 28): Table {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: filas.map(([etiqueta, valor]) => new TableRow({ children: [
        new TableCell({
          width: { size: anchoEtiqueta, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          shading: { fill: 'EEF2F7' },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: etiqueta, bold: true, size: 19, color: '374151' })] })],
        }),
        new TableCell({
          width: { size: 100 - anchoEtiqueta, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: valor, size: 19 })] })],
        }),
      ] })),
    });
  }

  private parrafo(texto: string, color = '111827'): Paragraph {
    return new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: texto, size: 18, color })] });
  }

  private async imagenDesdeDataUrl(dataUrl: string): Promise<{
    data: Uint8Array; type: TipoImagenDocx; width: number; height: number;
  } | null> {
    const match = /^data:image\/(png|jpeg|jpg|gif|bmp);base64,(.+)$/i.exec(dataUrl);
    if (!match) return null;
    const type = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase() as TipoImagenDocx;
    const binario = atob(match[2]);
    const bytes = Uint8Array.from(binario, c => c.charCodeAt(0));
    const dimensiones = await new Promise<{ width: number; height: number } | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
    if (!dimensiones) return null;
    const escala = Math.min(500 / dimensiones.width, 380 / dimensiones.height, 1);
    return {
      data: bytes,
      type,
      width: Math.max(1, Math.round(dimensiones.width * escala)),
      height: Math.max(1, Math.round(dimensiones.height * escala)),
    };
  }
}
