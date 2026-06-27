import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ProjectService } from '../../../core/services/project.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Proyecto, EstadoProyecto } from '../../../core/models';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './project-list.component.html'
})
export class ProjectListComponent implements OnInit, OnDestroy {
  private service = inject(ProjectService);
  private toast   = inject(ToastService);
  auth = inject(AuthService);

  proyectos: Proyecto[] = [];
  total = 0;
  pagina    = 1;
  porPagina = 10;
  busqueda = '';
  estadoFiltro = '';
  cargando = false;

  private busquedaSubject = new Subject<string>();
  private sub!: Subscription;

  readonly estados = Object.values(EstadoProyecto);

  readonly estadoClase: Record<EstadoProyecto, string> = {
    [EstadoProyecto.POR_ESTIMAR]:   'badge-por-estimar',
    [EstadoProyecto.ESTIMADO]:      'badge-estimado',
    [EstadoProyecto.OBSERVADO]:     'badge-observado',
    [EstadoProyecto.PLANIFICADO]:   'badge-planificado',
    [EstadoProyecto.EN_EJECUCION]:  'badge-en-ejecucion',
    [EstadoProyecto.FINALIZADO]:    'badge-finalizado',
    [EstadoProyecto.EN_PRODUCCION]: 'badge-en-produccion',
  };

  ngOnInit(): void {
    this.sub = this.busquedaSubject.pipe(
      debounceTime(350),
      distinctUntilChanged(),
    ).subscribe(() => { this.pagina = 1; this.cargar(); });
    this.cargar();
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  onBusquedaChange(valor: string): void {
    this.busqueda = valor;
    this.busquedaSubject.next(valor);
  }

  cargar(): void {
    this.cargando = true;
    this.service.getAll({
      busqueda: this.busqueda || undefined,
      estado: this.estadoFiltro || undefined,
      pagina: this.pagina,
      porPagina: this.porPagina
    }).subscribe({
      next: (res) => {
        this.proyectos = res.datos; this.total = res.total; this.cargando = false;
        if (res.datos.length === 0 && this.pagina > 1) { this.pagina = Math.max(1, this.totalPaginas); this.cargar(); }
      },
      error: () => { this.cargando = false; this.toast.error('Error al cargar proyectos'); }
    });
  }

  buscar(): void { this.pagina = 1; this.cargar(); }

  cambiarPagina(p: number): void { this.pagina = p; this.cargar(); }

  get totalPaginas(): number { return Math.ceil(this.total / this.porPagina); }

  get paginas(): number[] { return Array.from({ length: this.totalPaginas }, (_, i) => i + 1); }

  badgeEstado(estado: EstadoProyecto): string {
    return this.estadoClase[estado] ?? 'badge';
  }

  // ─── Modal confirmación eliminar ─────────────────────────────────────────
  modalConfirmarAbierto = signal(false);
  confirmPendiente: { id: number; nombre: string } | null = null;

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
    this.service.delete(this.confirmPendiente.id).subscribe({ next: () => { this.cerrarConfirmar(); this.cargar(); } });
  }
}
