import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { CicloService } from '../../../core/services/ciclo.service';
import { ProjectService } from '../../../core/services/project.service';
import { RequirementService } from '../../../core/services/requirement.service';
import { TestCaseService } from '../../../core/services/test-case.service';
import { AuthService } from '../../../core/services/auth.service';
import { CicloPrueba, EstadoCiclo, EstadoProyecto, Proyecto } from '../../../core/models';

const ESTADOS_PERMITIDOS_CICLO = new Set<EstadoProyecto>([
  EstadoProyecto.PLANIFICADO,
  EstadoProyecto.EN_EJECUCION,
  EstadoProyecto.OBSERVADO,
]);

const ESTADOS_EJECUTAR_CICLO = new Set<EstadoProyecto>([
  EstadoProyecto.EN_EJECUCION,
  EstadoProyecto.OBSERVADO,
]);

@Component({
  selector: 'app-ciclo-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './ciclo-list.component.html',
})
export class CicloListComponent implements OnInit {
  private service            = inject(CicloService);
  private projectService     = inject(ProjectService);
  private requirementService = inject(RequirementService);
  private testCaseService    = inject(TestCaseService);
  private router             = inject(Router);
  auth                       = inject(AuthService);

  ciclos: CicloPrueba[] = [];
  proyectos: Proyecto[] = [];
  total     = 0;
  pagina    = 1;
  porPagina = 10;
  cargando  = false;

  proyectoFiltroId?: number;
  estadoFiltro = '';

  readonly estados = Object.values(EstadoCiclo);

  readonly estadoClase: Record<string, string> = {
    [EstadoCiclo.ACTIVO]:  'badge-ciclo-activo',
    [EstadoCiclo.CERRADO]: 'badge-ciclo-cerrado',
  };

  // ─── Modal pre-validación "+ Nuevo Ciclo" ────────────────────────────────
  modalNuevoAbierto   = signal(false);
  validandoProyecto   = false;
  proyectoSelId: number | null = null;
  erroresPrevia: string[]      = [];
  puedeContinuar               = false;

  abrirModalNuevo(): void {
    this.proyectoSelId     = this.proyectoFiltroId ?? null;
    this.erroresPrevia     = [];
    this.puedeContinuar    = false;
    this.validandoProyecto = false;
    this.modalNuevoAbierto.set(true);
    if (this.proyectoSelId) this.validarProyecto(this.proyectoSelId);
  }

  cerrarModalNuevo(): void {
    this.modalNuevoAbierto.set(false);
  }

  onProyectoNuevoChange(id: number | null): void {
    this.proyectoSelId  = id;
    this.erroresPrevia  = [];
    this.puedeContinuar = false;
    if (id) this.validarProyecto(id);
  }

  private validarProyecto(proyectoId: number): void {
    const proyecto = this.proyectos.find(p => p.id === Number(proyectoId));
    if (!proyecto) return;

    const errores: string[] = [];

    if (!ESTADOS_PERMITIDOS_CICLO.has(proyecto.estado as EstadoProyecto)) {
      errores.push(
        `El proyecto está en estado "${proyecto.estado}". Solo se permiten ciclos en proyectos con estado Planificado, En Ejecución u Observado.`
      );
      this.erroresPrevia  = errores;
      this.puedeContinuar = false;
      return;
    }

    this.validandoProyecto = true;
    forkJoin({
      reqs:   this.requirementService.getByProyecto(proyectoId),
      casos:  this.testCaseService.getByProyecto(proyectoId),
      activo: this.service.getActivoByProyecto(proyectoId),
    }).subscribe({
      next: ({ reqs, casos, activo }) => {
        this.validandoProyecto = false;

        if (activo) {
          errores.push(
            `Ya existe un ciclo activo: "${activo.nombre}". Debes cerrarlo antes de crear uno nuevo.`
          );
        }

        if (reqs.length === 0) {
          errores.push('El proyecto no tiene requerimientos registrados.');
        } else {
          const reqsConCaso = new Set(
            casos.filter(c => c.requerimientoId).map(c => c.requerimientoId!)
          );
          const faltantes = reqs.filter(r => !reqsConCaso.has(r.id));
          if (faltantes.length > 0) {
            errores.push(
              `Los siguientes requerimientos no tienen casos de prueba asociados: ` +
              faltantes.map(r => r.codigo).join(', ') + '.'
            );
          }
        }

        this.erroresPrevia  = errores;
        this.puedeContinuar = errores.length === 0;
      },
      error: () => { this.validandoProyecto = false; },
    });
  }

  continuarNuevoCiclo(): void {
    if (!this.puedeContinuar || !this.proyectoSelId) return;
    this.cerrarModalNuevo();
    this.router.navigate(['/ciclos/nuevo'], {
      queryParams: { proyectoId: this.proyectoSelId },
    });
  }

  // ─── Popup bloqueo ejecución ─────────────────────────────────────────────
  popupBloqueoAbierto = signal(false);
  popupBloqueoMsg     = '';

  ejecutarCiclo(c: CicloPrueba): void {
    const proyecto = this.proyectos.find(p => p.id === c.proyectoId);
    if (proyecto && !ESTADOS_EJECUTAR_CICLO.has(proyecto.estado as EstadoProyecto)) {
      this.popupBloqueoMsg =
        `El proyecto "${proyecto.nombre}" está en estado "${proyecto.estado}". ` +
        `Solo se puede ejecutar el ciclo cuando el proyecto está en estado ` +
        `"En Ejecución" u "Observado".`;
      this.popupBloqueoAbierto.set(true);
      return;
    }
    this.router.navigate(['/ciclos', c.id, 'ejecutar']);
  }

  cerrarPopupBloqueo(): void { this.popupBloqueoAbierto.set(false); }

  // ─── Modal confirmación eliminar ─────────────────────────────────────────
  modalConfirmarAbierto = signal(false);
  confirmPendiente: { id: number; nombre: string } | null = null;

  ngOnInit(): void {
    this.projectService.getAll({ porPagina: 500 }).subscribe(r => { this.proyectos = r.datos; });
  }

  cargar(): void {
    this.cargando = true;
    this.service.getAll({
      proyectoId: this.proyectoFiltroId,
      estado:     this.estadoFiltro || undefined,
      pagina:     this.pagina,
      porPagina:  this.porPagina,
    }).subscribe({
      next: (res) => {
        this.ciclos = res.datos; this.total = res.total; this.cargando = false;
        if (res.datos.length === 0 && this.pagina > 1) { this.pagina = Math.max(1, this.totalPaginas); this.cargar(); }
      },
      error: ()   => { this.cargando = false; },
    });
  }

  buscar(): void { this.pagina = 1; this.cargar(); }
  cambiarPagina(p: number): void { this.pagina = p; this.cargar(); }
  get paginas(): number[] { return Array.from({ length: this.totalPaginas }, (_, i) => i + 1); }

  cerrar(c: CicloPrueba): void {
    this.service.cerrar(c.id).subscribe(() => this.cargar());
  }

  reabrir(c: CicloPrueba): void {
    this.service.reabrir(c.id).subscribe(() => this.cargar());
  }

  eliminar(id: number, nombre: string): void {
    this.confirmPendiente = { id, nombre };
    this.modalConfirmarAbierto.set(true);
  }

  cerrarConfirmar(): void {
    this.modalConfirmarAbierto.set(false);
    this.confirmPendiente = null;
  }

  confirmarEliminar(): void {
    if (!this.confirmPendiente) return;
    this.service.delete(this.confirmPendiente.id).subscribe(() => {
      this.cerrarConfirmar();
      this.cargar();
    });
  }

  get totalPaginas(): number { return Math.ceil(this.total / this.porPagina); }
}
