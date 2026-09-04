import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { DefectService } from '../../../core/services/defect.service';
import { ProjectService } from '../../../core/services/project.service';
import { AuthService } from '../../../core/services/auth.service';
import { WordExportService } from '../../../core/services/word-export.service';
import { Defecto, EstadoDefecto, PrioridadDefecto, SeveridadDefecto, Proyecto } from '../../../core/models';
import { ToastService } from '../../../core/services/toast.service';
import { UserService } from '../../../core/services/user.service';
import { Rol, Usuario } from '../../../core/models';

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
  private userService    = inject(UserService);
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
  desarrolladores: Usuario[] = [];
  seleccionados = new Set<number>();
  desarrolladorLoteId?: number;
  modalAsignacionAbierto = signal(false);
  asignandoLote = false;

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
    if (this.puedeAsignarLote) {
      this.userService.getAll({ rol: Rol.DEVELOPER, activo: true, porPagina: 500 }).subscribe(r => {
        this.desarrolladores = r.datos.sort((a, b) => a.nombre.localeCompare(b.nombre));
      });
    }
  }

  get puedeAsignarLote(): boolean {
    return this.auth.esAdmin() || this.auth.esQaLead() || this.auth.esProjectManager();
  }

  esSeleccionable(d: Defecto): boolean {
    return d.estado !== EstadoDefecto.CERRADO && d.estado !== EstadoDefecto.RECHAZADO;
  }

  alternarSeleccion(id: number, marcado: boolean): void {
    marcado ? this.seleccionados.add(id) : this.seleccionados.delete(id);
  }

  alternarTodos(marcado: boolean): void {
    this.seleccionados.clear();
    if (marcado) this.defectos.filter(d => this.esSeleccionable(d)).forEach(d => this.seleccionados.add(d.id));
  }

  get todosSeleccionados(): boolean {
    const disponibles = this.defectos.filter(d => this.esSeleccionable(d));
    return disponibles.length > 0 && disponibles.every(d => this.seleccionados.has(d.id));
  }

  private get asignadoFiltro(): number | undefined {
    const u = this.auth.usuarioActual();
    return this.auth.esDesarrollador() && u ? u.id : undefined;
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
      pagina: this.pagina,
      porPagina: this.porPagina
    }).subscribe({
      next: (res) => {
        this.defectos = res.datos; this.total = res.total; this.cargando = false; this.seleccionados.clear();
        if (res.datos.length === 0 && this.pagina > 1) { this.pagina = Math.max(1, this.totalPaginas); this.cargar(); }
      },
      error: () => { this.cargando = false; this.toast.error('Error al cargar defectos'); }
    });
  }

  buscar(): void { this.pagina = 1; this.cargar(); }
  cambiarPagina(p: number): void { this.pagina = p; this.cargar(); }
  get paginas(): number[] { return Array.from({ length: this.totalPaginas }, (_, i) => i + 1); }

  iniciarAtencion(defecto: Defecto): void {
    this.service.cambiarEstado(defecto.id, EstadoDefecto.EN_PROGRESO, 'El desarrollador inició la atención del defecto.').subscribe({
      next: () => { this.toast.exito('Atención iniciada'); this.cargar(); },
      error: (err) => this.toast.error(err?.error?.message || 'No se pudo iniciar la atención'),
    });
  }

  abrirAsignacionLote(): void {
    if (!this.seleccionados.size) return;
    this.desarrolladorLoteId = undefined;
    this.modalAsignacionAbierto.set(true);
  }

  cerrarAsignacionLote(): void {
    if (!this.asignandoLote) this.modalAsignacionAbierto.set(false);
  }

  confirmarAsignacionLote(): void {
    if (!this.desarrolladorLoteId || !this.seleccionados.size) return;
    this.asignandoLote = true;
    this.service.asignarLote([...this.seleccionados], this.desarrolladorLoteId).subscribe({
      next: r => {
        this.asignandoLote = false; this.modalAsignacionAbierto.set(false);
        const base = `${r.asignados} defecto${r.asignados === 1 ? '' : 's'} asignado${r.asignados === 1 ? '' : 's'} correctamente`;
        r.correoEnviado
          ? this.toast.exito(`${base}. Correo enviado al desarrollador.`)
          : this.toast.error(`${base}, pero el correo no pudo enviarse. Revisa la auditoría.`);
        this.cargar();
      },
      error: err => { this.asignandoLote = false; this.toast.error(err?.error?.message || 'No se pudo completar la asignación'); },
    });
  }

  get contieneEnRevision(): boolean {
    return this.defectos.some(d => this.seleccionados.has(d.id) && d.estado === EstadoDefecto.EN_REVISION);
  }

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
    // El listado paginado no trae `evidencias` (ver defectos.service.ts findOne) —
    // se pide el defecto completo antes de exportar para poder embeber las imágenes.
    this.service.getById(d.id).subscribe({
      next: (full) => this.wordExport.exportarDefecto(full),
      error: () => this.toast.error('No se pudo generar el Word del defecto.'),
    });
  }

  exportarExcel(): void {
    const rows = this.defectos.map(d => ({
      'Defecto':      d.codigoProyecto ?? d.codigo,
      'Título':       d.titulo,
      'Caso':         d.casoPruebaCodigo ?? '',
      'Severidad':    d.severidad,
      'Prioridad':    d.prioridad,
      'Estado':       d.estado,
      'Asignado A':   d.asignadoANombre ?? '',
      'Estado Dev':   d.estadoDesarrollo ?? '',
      'Reportado':    d.creadoEn ? new Date(d.creadoEn).toLocaleDateString('es-PE') : '',
    }));
    const ws  = XLSX.utils.json_to_sheet(rows);
    const wb  = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Defectos');
    XLSX.writeFile(wb, 'defectos.xlsx');
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

    const nuevoEstado  = accion === 'cerrar' ? EstadoDefecto.CERRADO : EstadoDefecto.REABIERTO;
    const comentario   = accion === 'reabrir' ? this.comentarioReabrir.trim() : undefined;

    this.service.cambiarEstado(id, nuevoEstado, comentario).subscribe({
      next: () => { this.cerrarModalVerificar(); this.cargar(); },
      error: (err) => { this.errorVerificar = err?.error?.message || 'Error al actualizar el defecto.'; }
    });
  }
}
