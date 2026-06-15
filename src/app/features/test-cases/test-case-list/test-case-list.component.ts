import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TestCaseService } from '../../../core/services/test-case.service';
import { CasoPrueba, EstadoQA, PrioridadCasoPrueba, ResultadoCasoPrueba, TipoPrueba } from '../../../core/models';

@Component({
  selector: 'app-test-case-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './test-case-list.component.html'
})
export class TestCaseListComponent implements OnInit {
  private service = inject(TestCaseService);
  private route = inject(ActivatedRoute);

  casos: CasoPrueba[] = [];
  total = 0;
  pagina = 1;
  porPagina = 15;
  proyectoId?: number;
  estadoFiltro = '';
  tipoFiltro = '';
  resultadoFiltro = '';
  busqueda = '';
  cargando = false;

  readonly estadosQA = Object.values(EstadoQA);
  readonly tipos = Object.values(TipoPrueba);
  readonly resultados = Object.values(ResultadoCasoPrueba);

  readonly resultadoClase: Record<string, string> = {
    [ResultadoCasoPrueba.APROBADO]:    'badge-resultado-aprobado',
    [ResultadoCasoPrueba.FALLIDO]:     'badge-resultado-fallido',
    [ResultadoCasoPrueba.BLOQUEADO]:   'badge-resultado-bloqueado',
    [ResultadoCasoPrueba.NO_EJECUTADO]:'badge-resultado-no-ejecutado'
  };

  readonly estadoQAClase: Record<string, string> = {
    [EstadoQA.PENDIENTE]:    'badge-qa-pendiente',
    [EstadoQA.EN_EJECUCION]: 'badge-qa-en-ejecucion',
    [EstadoQA.BLOQUEADO]:    'badge-qa-bloqueado',
    [EstadoQA.COMPLETADO]:   'badge-qa-completado'
  };

  ngOnInit(): void {
    this.proyectoId = this.route.snapshot.queryParams['proyectoId']
      ? Number(this.route.snapshot.queryParams['proyectoId'])
      : undefined;
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.service.getAll({
      proyectoId: this.proyectoId,
      estadoQA: this.estadoFiltro || undefined,
      tipoPrueba: this.tipoFiltro || undefined,
      resultado: this.resultadoFiltro || undefined,
      busqueda: this.busqueda || undefined,
      pagina: this.pagina,
      porPagina: this.porPagina
    }).subscribe({
      next: (res) => { this.casos = res.datos; this.total = res.total; this.cargando = false; },
      error: () => { this.cargando = false; }
    });
  }

  buscar(): void { this.pagina = 1; this.cargar(); }

  get totalPaginas(): number { return Math.ceil(this.total / this.porPagina); }
}
