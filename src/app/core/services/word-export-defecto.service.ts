import { Injectable } from '@angular/core';
import { AlignmentType, Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { Defecto } from '../models';
import { infoTable, multilineParagraphs, sectionTitle } from './word-export.helpers';

@Injectable({ providedIn: 'root' })
export class DefectoWordExportService {

  async exportarDefecto(d: Defecto): Promise<void> {
    const fecha = d.creadoEn
      ? new Date(d.creadoEn).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '—';

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [new TextRun({ text: 'SISTEMA QA TOTAL', size: 18, color: '6B7280', bold: false })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [new TextRun({ text: 'REPORTE DE DEFECTO', size: 36, bold: true, color: '1E3A5F' })],
          }),

          sectionTitle('IDENTIFICACIÓN'),
          infoTable([
            ['Código',          d.codigoProyecto ?? d.codigo ?? '—'],
            ['Proyecto',        d.proyectoNombre ?? '—'],
            ['Caso de Prueba',  d.casoPruebaCodigo ?? '—'],
            ['Plan de Pruebas', (d as any).planNombre ?? '—'],
            ['Ciclo',           (d as any).cicloNombre ?? '—'],
            ['Fecha Reporte',   fecha],
            ['Reportado por',   d.reportadoPorNombre ?? '—'],
            ['Asignado a',      d.asignadoANombre ?? 'Sin asignar'],
          ]),

          sectionTitle('CLASIFICACIÓN'),
          infoTable([
            ['Severidad', d.severidad],
            ['Prioridad', d.prioridad],
            ['Estado',    d.estado],
            ['Ambiente',  d.ambiente],
            ['Versión',   d.version],
          ]),

          sectionTitle('TÍTULO'),
          new Paragraph({
            spacing: { after: 280 },
            children: [new TextRun({ text: d.titulo, size: 24, bold: true })],
          }),

          sectionTitle('DESCRIPCIÓN'),
          ...multilineParagraphs(d.descripcion),

          sectionTitle('PASOS PARA REPRODUCIR'),
          ...multilineParagraphs(d.pasosReproduccion),

          sectionTitle('RESULTADO OBTENIDO'),
          ...multilineParagraphs(d.resultadoObtenido),

          sectionTitle('RESULTADO ESPERADO'),
          ...multilineParagraphs(d.resultadoEsperado),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${d.codigoProyecto ?? d.codigo ?? 'defecto'}-reporte.docx`);
  }
}
