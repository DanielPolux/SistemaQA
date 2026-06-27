import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PlanPruebaService } from '../../../core/services/plan-prueba.service';
import { ProjectService } from '../../../core/services/project.service';
import { AuthService } from '../../../core/services/auth.service';
import { PlanPrueba, EstadoPlan, Proyecto } from '../../../core/models';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-plan-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './plan-list.component.html',
})
export class PlanListComponent implements OnInit {
  private service        = inject(PlanPruebaService);
  private projectService = inject(ProjectService);
  private toast          = inject(ToastService);
  auth                   = inject(AuthService);

  planes: PlanPrueba[] = [];
  proyectos: Proyecto[] = [];
  total     = 0;
  pagina    = 1;
  porPagina = 10;
  cargando  = false;

  proyectoFiltroId?: number;
  estadoFiltro = '';

  readonly estados = Object.values(EstadoPlan);

  readonly estadoClase: Record<string, string> = {
    [EstadoPlan.BORRADOR]:     'badge-plan-borrador',
    [EstadoPlan.PLANIFICADO]:  'badge-plan-planificado',
    [EstadoPlan.EN_EJECUCION]: 'badge-ciclo-activo',
    [EstadoPlan.CERRADO]:      'badge-ciclo-cerrado',
  };

  modalConfirmarAbierto = signal(false);
  confirmPendiente: { id: number; nombre: string } | null = null;

  ngOnInit(): void {
    this.projectService.getAll({ porPagina: 500 }).subscribe(r => { this.proyectos = r.datos; });
    this.cargar();
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
        this.planes = res.datos; this.total = res.total; this.cargando = false;
        if (res.datos.length === 0 && this.pagina > 1) { this.pagina = Math.max(1, this.totalPaginas); this.cargar(); }
      },
      error: ()   => { this.cargando = false; this.toast.error('Error al cargar planes de prueba'); },
    });
  }

  buscar(): void { this.pagina = 1; this.cargar(); }
  cambiarPagina(p: number): void { this.pagina = p; this.cargar(); }
  get paginas(): number[] { return Array.from({ length: this.totalPaginas }, (_, i) => i + 1); }

  cerrar(p: PlanPrueba): void {
    this.service.cerrar(p.id).subscribe(() => this.cargar());
  }

  reabrir(p: PlanPrueba): void {
    this.service.reabrir(p.id).subscribe(() => this.cargar());
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

  puedeGestionar(): boolean {
    return this.auth.esAdmin() || this.auth.esQaLead() || this.auth.esProjectManager();
  }

  get totalPaginas(): number { return Math.ceil(this.total / this.porPagina); }
}
