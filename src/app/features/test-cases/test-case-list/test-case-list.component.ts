import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TestCaseService } from '../../../core/services/test-case.service';
import { CasoPrueba, EstadoCasoPrueba, ResultadoCasoPrueba, TipoPrueba } from '../../../core/models';

@Component({
  selector: 'app-test-case-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './test-case-list.component.html'
})
export class TestCaseListComponent implements OnInit {
  private service = inject(TestCaseService);
  private route   = inject(ActivatedRoute);

  casos: CasoPrueba[] = [];
  total = 0;
  pagina = 1;
  porPagina = 15;
  proyectoId?: number;
  estadoFiltro = '';
  tipoFiltro   = '';
  resultadoFiltro = '';
  busqueda = '';
  cargando = false;

  readonly estadosQA  = Object.values(EstadoCasoPrueba);
  readonly tipos      = Object.values(TipoPrueba);
  readonly resultados = Object.values(ResultadoCasoPrueba);

  readonly resultadoClase: Record<string, string> = {
    [ResultadoCasoPrueba.APROBADO]:    'badge-resultado-aprobado',
    [ResultadoCasoPrueba.FALLIDO]:     'badge-resultado-fallido',
    [ResultadoCasoPrueba.BLOQUEADO]:   'badge-resultado-bloqueado',
    [ResultadoCasoPrueba.SIN_EJECUTAR]:'badge-resultado-no-ejecutado',
    [ResultadoCasoPrueba.OMITIDO]:     'badge-resultado-omitido'
  };

  readonly estadoQAClase: Record<string, string> = {
    [EstadoCasoPrueba.PENDIENTE]:    'badge-qa-pendiente',
    [EstadoCasoPrueba.EN_EJECUCION]: 'badge-qa-en-ejecucion',
    [EstadoCasoPrueba.EJECUTADO]:    'badge-qa-completado',
    [EstadoCasoPrueba.BLOQUEADO]:    'badge-qa-bloqueado',
    [EstadoCasoPrueba.OMITIDO]:      'badge-qa-omitido'
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
      proyectoId:  this.proyectoId,
      estado:      this.estadoFiltro  || undefined,
      tipo:        this.tipoFiltro    || undefined,
      resultado:   this.resultadoFiltro || undefined,
      busqueda:    this.busqueda      || undefined,
      pagina:      this.pagina,
      porPagina:   this.porPagina
    }).subscribe({
      next: (res) => { this.casos = res.datos; this.total = res.total; this.cargando = false; },
      error: ()   => { this.cargando = false; }
    });
  }

  buscar(): void { this.pagina = 1; this.cargar(); }

  get totalPaginas(): number { return Math.ceil(this.total / this.porPagina); }
}
