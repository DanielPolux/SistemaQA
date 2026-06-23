import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PlanPruebaService } from '../../../core/services/plan-prueba.service';
import { PlanWordExportService } from '../../../core/services/word-export-plan.service';
import {
  TrazabilidadPlan, TrazabilidadReq, TrazabilidadCaso,
} from '../../../core/models';

type FiltroResultado = 'todos' | 'Aprobado' | 'Fallido' | 'Bloqueado' | 'Sin ejecutar' | 'Sin casos';

@Component({
  selector: 'app-trazabilidad',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './trazabilidad.component.html',
})
export class TrazabilidadComponent implements OnInit {
  private route       = inject(ActivatedRoute);
  private service     = inject(PlanPruebaService);
  private wordExport  = inject(PlanWordExportService);

  planId    = 0;
  cargando  = signal(true);
  error     = '';
  data      = signal<TrazabilidadPlan | null>(null);

  filtroResultado = signal<FiltroResultado>('todos');
  busqueda        = signal('');

  readonly FILTROS: { valor: FiltroResultado; etiqueta: string }[] = [
    { valor: 'todos',       etiqueta: 'Todos'        },
    { valor: 'Sin casos',   etiqueta: 'Sin casos'    },
    { valor: 'Sin ejecutar',etiqueta: 'Sin ejecutar' },
    { valor: 'Aprobado',    etiqueta: 'Aprobado'     },
    { valor: 'Fallido',     etiqueta: 'Fallido'      },
    { valor: 'Bloqueado',   etiqueta: 'Bloqueado'    },
  ];

  requerimientosFiltrados = computed<TrazabilidadReq[]>(() => {
    const d = this.data();
    if (!d) return [];
    const filtro = this.filtroResultado();
    const q      = this.busqueda().toLowerCase().trim();

    return d.requerimientos
      .map(req => {
        const casosFiltrados = req.casos.filter(c => {
          const resultado = c.ultimoResultado ?? 'Sin ejecutar';
          if (filtro !== 'todos' && filtro !== resultado) return false;
          if (q && !c.titulo.toLowerCase().includes(q) &&
              !c.codigo.toLowerCase().includes(q) &&
              !req.titulo.toLowerCase().includes(q) &&
              !req.codigo.toLowerCase().includes(q)) return false;
          return true;
        });

        if (filtro === 'Sin casos') {
          if (req.casos.length > 0) return null;
          if (q && !req.titulo.toLowerCase().includes(q) &&
              !req.codigo.toLowerCase().includes(q)) return null;
          return { ...req, casos: [] };
        }

        if (casosFiltrados.length === 0 && filtro !== 'todos') return null;
        if (q && casosFiltrados.length === 0 &&
            !req.titulo.toLowerCase().includes(q) &&
            !req.codigo.toLowerCase().includes(q)) return null;

        return { ...req, casos: casosFiltrados };
      })
      .filter((r): r is TrazabilidadReq => r !== null);
  });

  stats = computed(() => {
    const d = this.data();
    if (!d) return null;
    let totalReqs = d.requerimientos.length;
    let sinCasos = 0, sinEjecutar = 0, aprobados = 0, fallidos = 0, bloqueados = 0, omitidos = 0;
    let totalCasos = 0;

    for (const req of d.requerimientos) {
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
    const ejecutados  = aprobados + fallidos + bloqueados + omitidos;
    const cobertura   = totalCasos ? Math.round((ejecutados / totalCasos) * 100) : 0;
    const reqCubiertos = d.requerimientos.filter(r => r.casos.length > 0).length;

    return { totalReqs, reqCubiertos, totalCasos, sinCasos, sinEjecutar, aprobados, fallidos, bloqueados, omitidos, cobertura };
  });

  ngOnInit(): void {
    this.planId = Number(this.route.snapshot.paramMap.get('id'));
    this.service.getTrazabilidad(this.planId).subscribe({
      next:  d => { this.data.set(d); this.cargando.set(false); },
      error: () => { this.error = 'No se pudo cargar la trazabilidad.'; this.cargando.set(false); },
    });
  }

  resultadoClase(resultado: string | null): string {
    switch (resultado) {
      case 'Aprobado':  return 'traz-resultado--aprobado';
      case 'Fallido':   return 'traz-resultado--fallido';
      case 'Bloqueado': return 'traz-resultado--bloqueado';
      case 'Omitido':   return 'traz-resultado--omitido';
      default:          return 'traz-resultado--pendiente';
    }
  }

  resultadoIcono(resultado: string | null): string {
    switch (resultado) {
      case 'Aprobado':  return '✓';
      case 'Fallido':   return '✗';
      case 'Bloqueado': return '⊘';
      case 'Omitido':   return '○';
      default:          return '–';
    }
  }

  defectoChipClase(estado: string): string {
    const map: Record<string, string> = {
      'Nuevo':       'traz-defecto-chip--nuevo',
      'Asignado':    'traz-defecto-chip--asignado',
      'En Progreso': 'traz-defecto-chip--en-progreso',
      'En Revisión': 'traz-defecto-chip--en-revision',
      'Resuelto':    'traz-defecto-chip--resuelto',
      'Cerrado':     'traz-defecto-chip--cerrado',
      'Rechazado':   'traz-defecto-chip--rechazado',
      'Reabierto':   'traz-defecto-chip--reabierto',
    };
    return map[estado] ?? '';
  }

  coberturaReq(req: TrazabilidadReq): number {
    if (!req.casos.length) return 0;
    const ej = req.casos.filter(c => c.ultimoResultado !== null).length;
    return Math.round((ej / req.casos.length) * 100);
  }

  exportarWord(): void {
    const d = this.data();
    if (d) this.wordExport.exportarTrazabilidad(d);
  }

  exportarCSV(): void {
    const d = this.data();
    if (!d) return;
    const cabecera = ['Req Código','Req Título','Req Prioridad','Caso Código','Caso Título','Tipo','Prioridad','Último Resultado','Defectos'];
    const filas: string[][] = [cabecera];

    for (const req of d.requerimientos) {
      if (!req.casos.length) {
        filas.push([req.codigo, req.titulo, req.prioridad, '', '(Sin casos)', '', '', '', '']);
        continue;
      }
      for (const c of req.casos) {
        filas.push([
          req.codigo, req.titulo, req.prioridad,
          c.codigo, c.titulo, c.tipo ?? '', c.prioridad ?? '',
          c.ultimoResultado ?? 'Sin ejecutar',
          c.defectos.map(d => d.codigoProyecto).join(' | '),
        ]);
      }
    }

    const csv = filas.map(f => f.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `trazabilidad-plan-${this.planId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
