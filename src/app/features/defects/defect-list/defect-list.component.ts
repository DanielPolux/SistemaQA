import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DefectService } from '../../../core/services/defect.service';
import { ProjectService } from '../../../core/services/project.service';
import { AuthService } from '../../../core/services/auth.service';
import { WordExportService } from '../../../core/services/word-export.service';
import { Defecto, EstadoDefecto, PrioridadDefecto, SeveridadDefecto, Proyecto } from '../../../core/models';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-defect-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './defect-list.component.html'
})
export class DefectListComponent implements OnInit {
  private service        = inject(DefectService);
  private projectService = inject(ProjectService);
  private route          = inject(ActivatedRoute);
  private wordExport     = inject(WordExportService);
  private toast          = inject(ToastService);
  auth                   = inject(AuthService);

  defectos: Defecto[]   = [];
  proyectos: Proyecto[] = [];
  total     = 0;
  pagina    = 1;
  porPagina = 10;

  get totalPaginas(): number { return Math.ceil(this.total / this.porPagina); }
  proyectoId?: number;
  estadoFiltro = '';
  severidadFiltro = '';
  busqueda = '';
  cargando = false;

  readonly estados    = Object.values(EstadoDefecto);
  readonly severidades = Object.values(SeveridadDefecto);

  readonly severidadClase: Record<string, string> = {
    [SeveridadDefecto.CRITICO]: 'badge-sev-critico',
    [SeveridadDefecto.ALTO]:    'badge-sev-alto',
    [SeveridadDefecto.MEDIO]:   'badge-sev-medio',
    [SeveridadDefecto.BAJO]:    'badge-sev-bajo',
  };

  readonly prioridadClase: Record<string, string> = {
    [PrioridadDefecto.URGENTE]: 'badge-pri-urgente',
    [PrioridadDefecto.ALTA]:    'badge-pri-alta',
    [PrioridadDefecto.MEDIA]:   'badge-pri-media',
    [PrioridadDefecto.BAJA]:    'badge-pri-baja',
  };

  readonly estadoClase: Record<string, string> = {
    [EstadoDefecto.NUEVO]:       'badge-est-nuevo',
    [EstadoDefecto.ASIGNADO]:    'badge-est-asignado',
    [EstadoDefecto.EN_PROGRESO]: 'badge-est-en-progreso',
    [EstadoDefecto.EN_REVISION]: 'badge-est-en-revision',
    [EstadoDefecto.RESUELTO]:    'badge-est-resuelto',
    [EstadoDefecto.CERRADO]:     'badge-est-cerrado',
    [EstadoDefecto.REABIERTO]:   'badge-est-reabierto',
    [EstadoDefecto.RECHAZADO]:   'badge-est-rechazado',
  };

  ngOnInit(): void {
    this.proyectoId = this.route.snapshot.queryParams['proyectoId']
      ? Number(this.route.snapshot.queryParams['proyectoId'])
      : undefined;
    this.projectService.getAll({ porPagina: 500 }).subscribe(r => {
      this.proyectos = r.datos;
      if (this.proyectoId) this.cargar();
    });
  }

  private get asignadoFiltro(): number | undefined {
    const u = this.auth.usuarioActual();
    return this.auth.esDesarrollador() && u ? u.id : undefined;
  }

  private get reportadoPorFiltro(): number | undefined {
    const u = this.auth.usuarioActual();
    return this.auth.esTester() && u ? u.id : undefined;
  }

  cargar(): void {
    if (!this.proyectoId) return;
    this.cargando = true;
    this.service.getAll({
      proyectoId: this.proyectoId,
      estado: this.estadoFiltro || undefined,
      severidad: this.severidadFiltro || undefined,
      busqueda: this.busqueda || undefined,
      asignadoA: this.asignadoFiltro,
      reportadoPor: this.reportadoPorFiltro,
      pagina: this.pagina,
      porPagina: this.porPagina
    }).subscribe({
      next: (res) => {
        this.defectos = res.datos; this.total = res.total; this.cargando = false;
        if (res.datos.length === 0 && this.pagina > 1) { this.pagina = Math.max(1, this.totalPaginas); this.cargar(); }
      },
      error: () => { this.cargando = false; this.toast.error('Error al cargar defectos'); }
    });
  }

  buscar(): void { this.pagina = 1; this.cargar(); }
  cambiarPagina(p: number): void { this.pagina = p; this.cargar(); }
  get paginas(): number[] { return Array.from({ length: this.totalPaginas }, (_, i) => i + 1); }

  // ─── Modal confirmación eliminar ─────────────────────────────────────────
  modalConfirmarAbierto = signal(false);
  confirmPendiente: { id: number; nombre: string } | null = null;

  eliminar(id: number, titulo: string): void {
    this.confirmPendiente = { id, nombre: titulo };
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

  generarWord(d: Defecto): void {
    this.wordExport.exportarDefecto(d);
  }

  // ─── Modal verificación (Cerrar / Reabrir) ───────────────────────────────
  modalVerificarAbierto = signal(false);
  verificarPendiente: { id: number; titulo: string; accion: 'cerrar' | 'reabrir' } | null = null;
  comentarioReabrir = '';
  errorVerificar = '';

  abrirVerificar(d: Defecto, accion: 'cerrar' | 'reabrir'): void {
    this.verificarPendiente = { id: d.id, titulo: d.titulo, accion };
    this.comentarioReabrir = '';
    this.errorVerificar = '';
    this.modalVerificarAbierto.set(true);
  }

  cerrarModalVerificar(): void {
    this.modalVerificarAbierto.set(false);
    this.verificarPendiente = null;
    this.comentarioReabrir = '';
    this.errorVerificar = '';
  }

  confirmarVerificar(): void {
    if (!this.verificarPendiente) return;
    this.errorVerificar = '';
    const { id, accion } = this.verificarPendiente;

    if (accion === 'reabrir' && !this.comentarioReabrir.trim()) {
      this.errorVerificar = 'Debes ingresar un comentario para el desarrollador.';
      return;
    }

    const nuevoEstado  = accion === 'cerrar' ? EstadoDefecto.CERRADO : EstadoDefecto.ASIGNADO;
    const comentario   = accion === 'reabrir' ? this.comentarioReabrir.trim() : undefined;

    this.service.cambiarEstado(id, nuevoEstado, comentario).subscribe({
      next: () => { this.cerrarModalVerificar(); this.cargar(); },
      error: (err) => { this.errorVerificar = err?.error?.message || 'Error al actualizar el defecto.'; }
    });
  }
}
