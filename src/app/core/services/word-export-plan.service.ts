import { Injectable } from '@angular/core';
import {
  AlignmentType, Document, Packer, Paragraph,
  Table, TableCell, TableRow, TextRun, WidthType,
} from 'docx';
import { saveAs } from 'file-saver';
import { PlanCicloResumen, PlanPrueba, TrazabilidadPlan } from '../models';
import { infoTable, multilineParagraphs, sectionTitle } from './word-export.helpers';

@Injectable({ providedIn: 'root' })
export class PlanWordExportService {

  async exportarPlan(plan: PlanPrueba): Promise<void> {
    const fmt = (d?: string | Date | null) =>
      d ? new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

    const ciclos: PlanCicloResumen[] = plan.ciclos ?? [];
    const totalEjec = ciclos.reduce((a, c) => a + (c.totalEjecuciones ?? 0), 0);
    const totalOk   = ciclos.reduce((a, c) => a + (c.aprobados ?? 0), 0);
    const totalFail = ciclos.reduce((a, c) => a + (c.fallidos ?? 0), 0);
    const pctExito  = totalEjec ? Math.round((totalOk / totalEjec) * 100) : 0;

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

          sectionTitle('INFORMACIÓN GENERAL'),
          infoTable([
            ['Plan',           plan.nombre],
            ['Proyecto',       plan.proyectoNombre ?? '—'],
            ['Responsable',    plan.responsableNombre ?? '—'],
            ['Estado',         plan.estado],
            ['Fecha Inicio',   fmt(plan.fechaInicio)],
            ['Fecha Objetivo', fmt(plan.fechaObjetivo)],
          ]),

          sectionTitle('OBJETIVO'),
          ...multilineParagraphs(plan.objetivo ?? ''),

          ...(plan.alcance       ? [sectionTitle('ALCANCE'),               ...multilineParagraphs(plan.alcance)]       : []),
          ...(plan.fueraAlcance  ? [sectionTitle('FUERA DEL ALCANCE'),     ...multilineParagraphs(plan.fueraAlcance)]  : []),
          ...(plan.criteriosEntrada ? [sectionTitle('CRITERIOS DE ENTRADA'), ...multilineParagraphs(plan.criteriosEntrada)] : []),
          ...(plan.criteriosSalida  ? [sectionTitle('CRITERIOS DE SALIDA'),  ...multilineParagraphs(plan.criteriosSalida)]  : []),
          ...(plan.riesgos       ? [sectionTitle('RIESGOS'),               ...multilineParagraphs(plan.riesgos)]       : []),

          sectionTitle('TRAZABILIDAD DE REQUERIMIENTOS'),
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
                          shading: i === 6 && r.estadoValidacion === 'Validado'   ? { fill: 'DCFCE7' }
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

          sectionTitle('RESUMEN DE CICLOS'),
          ciclosTable,

          sectionTitle('MÉTRICAS CONSOLIDADAS'),
          infoTable([
            ['Total ciclos',      String(ciclos.length)],
            ['Ciclos cerrados',   String(ciclos.filter(c => c.estado === 'Cerrado').length)],
            ['Total ejecuciones', String(totalEjec)],
            ['Aprobados',         String(totalOk)],
            ['Fallidos',          String(totalFail)],
            ['% Éxito',           `${pctExito}%`],
          ]),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const slug = plan.nombre.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 40);
    saveAs(blob, `plan-${slug}.docx`);
  }

  async exportarTrazabilidad(data: TrazabilidadPlan): Promise<void> {
    const ahora = new Date().toLocaleDateString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    let sinCasos = 0, sinEjecutar = 0, aprobados = 0, fallidos = 0, bloqueados = 0, omitidos = 0, totalCasos = 0;
    for (const req of data.requerimientos) {
      if (!req.casos.length) { sinCasos++; continue; }
      for (const c of req.casos) {
        totalCasos++;
        switch (c.ultimoResultado) {
          case 'Aprobado':  aprobados++;  break;
          case 'Fallido':   fallidos++;   break;
          case 'Bloqueado': bloqueados++; break;
          case 'Omitido':   omitidos++;   break;
          default:          sinEjecutar++;
        }
      }
    }
    const ejecutados = aprobados + fallidos + bloqueados + omitidos;
    const cobertura  = totalCasos ? Math.round((ejecutados / totalCasos) * 100) : 0;

    const hCell = (text: string) => new TableCell({
      shading: { fill: '1E3A5F' },
      margins: { top: 70, bottom: 70, left: 100, right: 100 },
      children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 17, color: 'FFFFFF' })] })],
    });
    const dCell = (text: string, fill?: string) => new TableCell({
      ...(fill ? { shading: { fill } } : {}),
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: [new Paragraph({ children: [new TextRun({ text, size: 17 })] })],
    });
    const resFill = (r: string | null) =>
      r === 'Aprobado'  ? 'DCFCE7' :
      r === 'Fallido'   ? 'FEE2E2' :
      r === 'Bloqueado' ? 'FEF3C7' :
      r === 'Omitido'   ? 'E5E7EB' : 'F9FAFB';

    const matrizRows: TableRow[] = [
      new TableRow({
        tableHeader: true,
        children: ['Req', 'Requerimiento', 'Caso', 'Caso de Prueba', 'Tipo', 'Prioridad', 'Resultado', 'Defectos'].map(hCell),
      }),
    ];

    for (const req of data.requerimientos) {
      matrizRows.push(new TableRow({
        children: [new TableCell({
          columnSpan: 8,
          shading: { fill: 'EEF2F7' },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [
            new TextRun({ text: `${req.codigo}  `, bold: true, size: 18, color: '1E3A5F' }),
            new TextRun({ text: req.titulo, bold: true, size: 18, color: '374151' }),
            new TextRun({ text: `  [${req.prioridad}] · ${req.estado}`, size: 16, color: '6B7280' }),
          ]})],
        })],
      }));

      if (!req.casos.length) {
        matrizRows.push(new TableRow({
          children: [new TableCell({
            columnSpan: 8,
            shading: { fill: 'F9FAFB' },
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Sin casos de prueba vinculados', size: 17, color: '9CA3AF', italics: true })] })],
          })],
        }));
        continue;
      }

      for (const caso of req.casos) {
        const defStr = caso.defectos.length
          ? caso.defectos.map(d => `${d.codigoProyecto} (${d.estado})`).join(', ')
          : '—';
        matrizRows.push(new TableRow({
          children: [
            dCell(req.codigo),
            dCell(req.titulo),
            dCell(caso.codigo),
            dCell(caso.titulo),
            dCell(caso.tipo ?? '—'),
            dCell(caso.prioridad ?? '—'),
            dCell(caso.ultimoResultado ?? 'Sin ejecutar', resFill(caso.ultimoResultado)),
            dCell(defStr),
          ],
        }));
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
            children: [new TextRun({ text: 'MATRIZ DE TRAZABILIDAD', size: 36, bold: true, color: '1E3A5F' })],
          }),

          sectionTitle('INFORMACIÓN GENERAL'),
          infoTable([
            ['Plan de Pruebas', data.planNombre],
            ['Proyecto',        data.proyectoNombre ?? '—'],
            ['Generado el',     ahora],
          ]),

          sectionTitle('RESUMEN DE COBERTURA'),
          infoTable([
            ['Total requerimientos',      String(data.requerimientos.length)],
            ['Sin cobertura (sin casos)', String(sinCasos)],
            ['Total casos de prueba',     String(totalCasos)],
            ['Casos ejecutados',          `${ejecutados} / ${totalCasos} (${cobertura}%)`],
            ['Aprobados',                 String(aprobados)],
            ['Fallidos',                  String(fallidos)],
            ['Bloqueados',                String(bloqueados)],
            ['Sin ejecutar',              String(sinEjecutar)],
          ]),

          sectionTitle('MATRIZ DETALLADA'),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: matrizRows }),

          new Paragraph({
            spacing: { before: 400 },
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: `Generado por Sistema QA Total · ${ahora}`, size: 16, color: '9CA3AF' })],
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const slug = data.planNombre.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 40);
    saveAs(blob, `trazabilidad-${slug}.docx`);
  }
}
