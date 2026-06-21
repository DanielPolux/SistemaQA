import { Injectable } from '@angular/core';
import {
  AlignmentType, BorderStyle, Document, HeadingLevel,
  Packer, Paragraph, Table, TableCell, TableRow, TextRun,
  WidthType, VerticalAlign,
} from 'docx';
import { saveAs } from 'file-saver';
import { Defecto, PlanPrueba, PlanCicloResumen } from '../models';

@Injectable({ providedIn: 'root' })
export class WordExportService {

  async exportarDefecto(d: Defecto): Promise<void> {
    const fecha = d.creadoEn
      ? new Date(d.creadoEn).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '—';

    const doc = new Document({
      sections: [{
        children: [

          // ── Encabezado ──────────────────────────────────────────────────
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'SISTEMA QA TOTAL', size: 18, color: '6B7280', bold: false }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({ text: 'REPORTE DE DEFECTO', size: 36, bold: true, color: '1E3A5F' }),
            ],
          }),

          // ── Identificación ───────────────────────────────────────────────
          this.sectionTitle('IDENTIFICACIÓN'),
          this.infoTable([
            ['Código',        d.codigoProyecto ?? d.codigo ?? '—'],
            ['Proyecto',      d.proyectoNombre ?? '—'],
            ['Caso de Prueba', d.casoPruebaCodigo ?? '—'],
            ['Plan de Pruebas', (d as any).planNombre ?? '—'],
            ['Ciclo',         (d as any).cicloNombre ?? '—'],
            ['Fecha Reporte', fecha],
            ['Reportado por', d.reportadoPorNombre ?? '—'],
            ['Asignado a',    d.asignadoANombre ?? 'Sin asignar'],
          ]),

          // ── Clasificación ───────────────────────────────────────────────
          this.sectionTitle('CLASIFICACIÓN'),
          this.infoTable([
            ['Severidad', d.severidad],
            ['Prioridad', d.prioridad],
            ['Estado',    d.estado],
            ['Ambiente',  d.ambiente],
            ['Versión',   d.version],
          ]),

          // ── Título del defecto ──────────────────────────────────────────
          this.sectionTitle('TÍTULO'),
          new Paragraph({
            spacing: { after: 280 },
            children: [new TextRun({ text: d.titulo, size: 24, bold: true })],
          }),

          // ── Descripción ─────────────────────────────────────────────────
          this.sectionTitle('DESCRIPCIÓN'),
          ...this.multilineParagraphs(d.descripcion),

          // ── Pasos para reproducir ───────────────────────────────────────
          this.sectionTitle('PASOS PARA REPRODUCIR'),
          ...this.multilineParagraphs(d.pasosReproduccion),

          // ── Resultado obtenido ──────────────────────────────────────────
          this.sectionTitle('RESULTADO OBTENIDO'),
          ...this.multilineParagraphs(d.resultadoObtenido),

          // ── Resultado esperado ──────────────────────────────────────────
          this.sectionTitle('RESULTADO ESPERADO'),
          ...this.multilineParagraphs(d.resultadoEsperado),

        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${d.codigoProyecto ?? d.codigo ?? 'defecto'}-reporte.docx`);
  }

  // ── Plan de Pruebas ──────────────────────────────────────────────────────

  async exportarPlan(plan: PlanPrueba): Promise<void> {
    const fmt = (d?: string | Date | null) =>
      d ? new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

    const ciclos: PlanCicloResumen[] = plan.ciclos ?? [];
    const totalEjec   = ciclos.reduce((a, c) => a + (c.totalEjecuciones ?? 0), 0);
    const totalOk     = ciclos.reduce((a, c) => a + (c.aprobados ?? 0), 0);
    const totalFail   = ciclos.reduce((a, c) => a + (c.fallidos ?? 0), 0);
    const pctExito    = totalEjec ? Math.round((totalOk / totalEjec) * 100) : 0;

    const ciclosTable = ciclos.length
      ? new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          margins: { bottom: 240 },
          rows: [
            new TableRow({
              tableHeader: true,
              children: ['Ciclo', 'Ambiente', 'Estado', 'Ejecutados', 'Aprobados', 'Fallidos'].map(h =>
                new TableCell({
                  shading: { fill: '1E3A5F' },
                  margins: { top: 80, bottom: 80, left: 100, right: 100 },
                  children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18, color: 'FFFFFF' })] })],
                })
              ),
            }),
            ...ciclos.map(c =>
              new TableRow({
                children: [
                  c.nombre,
                  c.ambiente ?? '—',
                  c.estado,
                  String(c.totalEjecuciones),
                  String(c.aprobados),
                  String(c.fallidos),
                ].map(val =>
                  new TableCell({
                    margins: { top: 60, bottom: 60, left: 100, right: 100 },
                    children: [new Paragraph({ children: [new TextRun({ text: val, size: 18 })] })],
                  })
                ),
              })
            ),
          ],
        })
      : new Paragraph({ children: [new TextRun({ text: 'Sin ciclos asignados.', color: '9CA3AF', size: 18 })] });

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
            children: [new TextRun({ text: 'PLAN DE PRUEBAS', size: 36, bold: true, color: '1E3A5F' })],
          }),

          this.sectionTitle('INFORMACIÓN GENERAL'),
          this.infoTable([
            ['Plan',              plan.nombre],
            ['Proyecto',          plan.proyectoNombre ?? '—'],
            ['Responsable',       plan.responsableNombre ?? '—'],
            ['Estado',            plan.estado],
            ['Fecha Inicio',      fmt(plan.fechaInicio)],
            ['Fecha Objetivo',    fmt(plan.fechaObjetivo)],
          ]),

          this.sectionTitle('OBJETIVO'),
          ...this.multilineParagraphs(plan.objetivo ?? ''),

          ...(plan.alcance ? [this.sectionTitle('ALCANCE'), ...this.multilineParagraphs(plan.alcance)] : []),
          ...(plan.fueraAlcance ? [this.sectionTitle('FUERA DEL ALCANCE'), ...this.multilineParagraphs(plan.fueraAlcance)] : []),
          ...(plan.criteriosEntrada ? [this.sectionTitle('CRITERIOS DE ENTRADA'), ...this.multilineParagraphs(plan.criteriosEntrada)] : []),
          ...(plan.criteriosSalida ? [this.sectionTitle('CRITERIOS DE SALIDA'), ...this.multilineParagraphs(plan.criteriosSalida)] : []),
          ...(plan.riesgos ? [this.sectionTitle('RIESGOS'), ...this.multilineParagraphs(plan.riesgos)] : []),

          // ── Requerimientos ──────────────────────────────────────────────
          this.sectionTitle('TRAZABILIDAD DE REQUERIMIENTOS'),
          ...(plan.requerimientos?.length
            ? [new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                margins: { bottom: 240 },
                rows: [
                  new TableRow({
                    tableHeader: true,
                    children: ['Código', 'Requerimiento', 'Prioridad', 'Casos', 'Aprobados', 'Fallidos', 'Estado'].map(h =>
                      new TableCell({
                        shading: { fill: '1E3A5F' },
                        margins: { top: 70, bottom: 70, left: 100, right: 100 },
                        children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 17, color: 'FFFFFF' })] })],
                      })
                    ),
                  }),
                  ...(plan.requerimientos ?? []).map(r =>
                    new TableRow({
                      children: [
                        r.codigo,
                        r.titulo,
                        r.prioridad,
                        String(r.totalCasos),
                        String(r.casosAprobados),
                        String(r.casosFallidos),
                        r.estadoValidacion,
                      ].map((val, i) =>
                        new TableCell({
                          shading: i === 6 && r.estadoValidacion === 'Validado' ? { fill: 'DCFCE7' }
                                 : i === 6 && r.estadoValidacion === 'Con fallas' ? { fill: 'FEE2E2' }
                                 : {},
                          margins: { top: 60, bottom: 60, left: 100, right: 100 },
                          children: [new Paragraph({ children: [new TextRun({ text: val, size: 17 })] })],
                        })
                      ),
                    })
                  ),
                ],
              })]
            : [new Paragraph({ children: [new TextRun({ text: 'Sin requerimientos vinculados.', color: '9CA3AF', size: 18 })] })]
          ),

          this.sectionTitle('RESUMEN DE CICLOS'),
          ciclosTable,

          this.sectionTitle('MÉTRICAS CONSOLIDADAS'),
          this.infoTable([
            ['Total ciclos',    String(ciclos.length)],
            ['Ciclos cerrados', String(ciclos.filter(c => c.estado === 'Cerrado').length)],
            ['Total ejecuciones', String(totalEjec)],
            ['Aprobados',       String(totalOk)],
            ['Fallidos',        String(totalFail)],
            ['% Éxito',         `${pctExito}%`],
          ]),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const slug = plan.nombre.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 40);
    saveAs(blob, `plan-${slug}.docx`);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private sectionTitle(text: string): Paragraph {
    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 320, after: 120 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 4, color: 'C8D6E8', space: 4 },
      },
      children: [new TextRun({ text, bold: true, size: 22, color: '1E3A5F' })],
    });
  }

  private infoTable(rows: [string, string][]): Table {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      margins: { bottom: 240 },
      rows: rows.map(([label, value]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 28, type: WidthType.PERCENTAGE },
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
              width: { size: 72, type: WidthType.PERCENTAGE },
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

  private multilineParagraphs(text: string): Paragraph[] {
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
}
