import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TestCaseService } from '../../../core/services/test-case.service';
import { ProjectService } from '../../../core/services/project.service';
import { RequirementService } from '../../../core/services/requirement.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  CasoPrueba, EstadoCasoPrueba, ResultadoCasoPrueba, TipoPrueba,
  Proyecto, Requerimiento
} from '../../../core/models';

@Component({
  selector: 'app-test-case-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './test-case-list.component.html'
})
export class TestCaseListComponent implements OnInit {
  private service            = inject(TestCaseService);
  private route              = inject(ActivatedRoute);
  private projectService     = inject(ProjectService);
  private requirementService = inject(RequirementService);
  auth                       = inject(AuthService);

  casos: CasoPrueba[]            = [];
  proyectos: Proyecto[]          = [];
  requerimientos: Requerimiento[] = [];

  total     = 0;
  pagina    = 1;
  porPagina = 15;
  cargando  = false;

  // Filtros
  proyectoId?: number;
  proyectoFiltroTexto      = '';
  requerimientoFiltroTexto = '';
  requerimientoFiltroId?: number;
  estadoFiltro    = '';
  tipoFiltro      = '';
  resultadoFiltro = '';
  busqueda        = '';

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
    this.projectService.getAll({ porPagina: 500 }).subscribe(r => {
      this.proyectos = r.datos;
      // Restaurar filtro de proyecto si viene por queryParam
      const qpId = this.route.snapshot.queryParams['proyectoId'];
      if (qpId) {
        this.proyectoId = Number(qpId);
        const p = this.proyectos.find(x => x.id === this.proyectoId);
        if (p) {
          this.proyectoFiltroTexto = p.codigo;
          this.requirementService.getByProyecto(this.proyectoId!).subscribe(reqs => {
            this.requerimientos = reqs;
          });
        }
      }
    });
    this.cargar();
  }

  // ─── Filtro de proyecto ──────────────────────────────────────────────────

  onProyectoChange(event: Event): void {
    const codigo = (event.target as HTMLInputElement).value.trim();
    const match  = this.proyectos.find(p => p.codigo === codigo);
    const anteriorId = this.proyectoId;
    this.proyectoId  = match?.id;

    if (this.proyectoId !== anteriorId) {
      // Limpiar requerimiento al cambiar proyecto
      this.requerimientos          = [];
      this.requerimientoFiltroTexto= '';
      this.requerimientoFiltroId   = undefined;
      if (this.proyectoId) {
        this.requirementService.getByProyecto(this.proyectoId).subscribe(r => {
          this.requerimientos = r;
        });
      }
    }
    this.buscar();
  }

  // ─── Filtro de requerimiento ─────────────────────────────────────────────

  onRequerimientoChange(event: Event): void {
    const codigo = (event.target as HTMLInputElement).value.trim();
    const match  = this.requerimientos.find(r => r.codigo === codigo);
    this.requerimientoFiltroId = match?.id;
    this.buscar();
  }

  // ─── Limpiar ──────────────────────────────────────────────────────────────

  limpiarFiltros(): void {
    this.proyectoId              = undefined;
    this.proyectoFiltroTexto     = '';
    this.requerimientoFiltroTexto= '';
    this.requerimientoFiltroId   = undefined;
    this.requerimientos          = [];
    this.estadoFiltro            = '';
    this.tipoFiltro              = '';
    this.resultadoFiltro         = '';
    this.busqueda                = '';
    this.buscar();
  }

  cargar(): void {
    this.cargando = true;
    this.service.getAll({
      proyectoId:      this.proyectoId,
      requerimientoId: this.requerimientoFiltroId,
      estado:          this.estadoFiltro    || undefined,
      tipo:            this.tipoFiltro      || undefined,
      resultado:       this.resultadoFiltro || undefined,
      busqueda:        this.busqueda        || undefined,
      pagina:          this.pagina,
      porPagina:       this.porPagina
    }).subscribe({
      next: (res) => { this.casos = res.datos; this.total = res.total; this.cargando = false; },
      error: ()   => { this.cargando = false; }
    });
  }

  buscar(): void { this.pagina = 1; this.cargar(); }

  get totalPaginas(): number { return Math.ceil(this.total / this.porPagina); }
}
