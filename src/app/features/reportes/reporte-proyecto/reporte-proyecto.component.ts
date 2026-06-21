import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { ProjectService } from '../../../core/services/project.service';
import { ReporteService, ReporteProyecto, ChartItem, AvanceCiclo } from '../../../core/services/reporte.service';
import { Proyecto } from '../../../core/models';

Chart.register(...registerables);

const COLORES = {
  verde:    '#28a745',
  rojo:     '#dc3545',
  naranja:  '#fd7e14',
  amarillo: '#ffc107',
  azul:     '#0d6efd',
  gris:     '#6c757d',
  morado:   '#6f42c1',
  cyan:     '#0dcaf0',
};

const PALETA_ESTADOS = [
  COLORES.verde, COLORES.azul, COLORES.naranja,
  COLORES.rojo,  COLORES.gris, COLORES.morado, COLORES.amarillo,
];

@Component({
  selector: 'app-reporte-proyecto',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reporte-proyecto.component.html',
})
export class ReporteProyectoComponent implements OnInit, OnDestroy {
  @ViewChild('chartCasosEstado',       { static: false }) chartCasosEstadoRef!:       ElementRef<HTMLCanvasElement>;
  @ViewChild('chartResultados',        { static: false }) chartResultadosRef!:         ElementRef<HTMLCanvasElement>;
  @ViewChild('chartDefSeveridad',      { static: false }) chartDefSeveridadRef!:       ElementRef<HTMLCanvasElement>;
  @ViewChild('chartDefEstado',         { static: false }) chartDefEstadoRef!:          ElementRef<HTMLCanvasElement>;
  @ViewChild('chartDefPrioridad',      { static: false }) chartDefPrioridadRef!:       ElementRef<HTMLCanvasElement>;
  @ViewChild('chartAvanceCiclos',      { static: false }) chartAvanceCiclosRef!:       ElementRef<HTMLCanvasElement>;

  private proyectoService = inject(ProjectService);
  private reporteService  = inject(ReporteService);

  proyectos: Proyecto[]        = [];
  proyectoId: number | null    = null;
  datos  = signal<ReporteProyecto | null>(null);
  cargando = signal(false);
  error    = signal('');

  private charts: Chart[] = [];

  ngOnInit(): void {
    this.proyectoService.getAll({ porPagina: 500 }).subscribe({
      next: (r) => { this.proyectos = r.datos; },
    });
  }

  ngOnDestroy(): void { this.destruirGraficas(); }

  seleccionarProyecto(): void {
    if (!this.proyectoId) return;
    this.cargando.set(true);
    this.error.set('');
    this.datos.set(null);
    this.destruirGraficas();

    this.reporteService.getReporteProyecto(this.proyectoId).subscribe({
      next: (data) => {
        this.datos.set(data);
        this.cargando.set(false);
        setTimeout(() => this.renderizarGraficas(), 80);
      },
      error: () => {
        this.cargando.set(false);
        this.error.set('No se pudo cargar el reporte del proyecto.');
      },
    });
  }

  private renderizarGraficas(): void {
    const d = this.datos();
    if (!d) return;

    this.charts.push(
      this.crearTorta(this.chartCasosEstadoRef, d.casosPorEstado),
      this.crearTorta(this.chartResultadosRef,  d.resultadosEjecucion, [
        COLORES.verde, COLORES.rojo, COLORES.naranja, COLORES.gris,
      ]),
      this.crearBarrasHorizontal(this.chartDefSeveridadRef, d.defectosPorSeveridad, [
        COLORES.rojo, COLORES.naranja, COLORES.amarillo, COLORES.azul,
      ]),
      this.crearTorta(this.chartDefEstadoRef,     d.defectosPorEstado),
      this.crearBarrasHorizontal(this.chartDefPrioridadRef, d.defectosPorPrioridad, [
        COLORES.rojo, COLORES.naranja, COLORES.amarillo, COLORES.azul,
      ]),
      this.crearBarrasApiladas(this.chartAvanceCiclosRef,   d.avancePorCiclo),
    );
  }

  private crearTorta(ref: ElementRef<HTMLCanvasElement>, items: ChartItem[], colores?: string[]): Chart {
    return new Chart(ref.nativeElement, {
      type: 'doughnut',
      data: {
        labels: items.map(i => i.label),
        datasets: [{
          data:            items.map(i => i.valor),
          backgroundColor: colores ?? PALETA_ESTADOS,
          borderWidth: 2,
          borderColor: '#fff',
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } },
        },
        cutout: '55%',
      },
    });
  }

  private crearBarrasHorizontal(ref: ElementRef<HTMLCanvasElement>, items: ChartItem[], colores?: string[]): Chart {
    return new Chart(ref.nativeElement, {
      type: 'bar',
      data: {
        labels: items.map(i => i.label),
        datasets: [{
          label: 'Total',
          data:  items.map(i => i.valor),
          backgroundColor: colores ?? PALETA_ESTADOS,
          borderRadius: 4,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { precision: 0 } },
          y: { ticks: { font: { size: 12 } } },
        },
      },
    });
  }

  private crearBarrasApiladas(ref: ElementRef<HTMLCanvasElement>, ciclos: AvanceCiclo[]): Chart {
    return new Chart(ref.nativeElement, {
      type: 'bar',
      data: {
        labels: ciclos.map(c => c.ciclo),
        datasets: [
          { label: 'Aprobado',  data: ciclos.map(c => c.aprobados),  backgroundColor: COLORES.verde   },
          { label: 'Fallido',   data: ciclos.map(c => c.fallidos),   backgroundColor: COLORES.rojo    },
          { label: 'Bloqueado', data: ciclos.map(c => c.bloqueados), backgroundColor: COLORES.naranja },
          { label: 'Omitido',   data: ciclos.map(c => c.omitidos),   backgroundColor: COLORES.gris    },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } },
        },
      },
    });
  }

  private destruirGraficas(): void {
    this.charts.forEach(c => c.destroy());
    this.charts = [];
  }
}
