import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RequirementService } from '../../../core/services/requirement.service';
import { ProjectService } from '../../../core/services/project.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  Requerimiento, EstadoRequerimiento, TipoRequerimiento,
  PrioridadRequerimiento, Proyecto
} from '../../../core/models';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-requirement-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  templateUrl: './requirement-list.component.html'
})
export class RequirementListComponent implements OnInit {
  private service        = inject(RequirementService);
  private projectService = inject(ProjectService);
  private fb             = inject(FormBuilder);
  private route          = inject(ActivatedRoute);
  private router         = inject(Router);
  private toast          = inject(ToastService);
  auth                   = inject(AuthService);

  proyectos: Proyecto[]           = [];
  requerimientos: Requerimiento[] = [];
  total      = 0;
  pagina     = 1;
  porPagina  = 10;
  proyectoId: number | null = null;
  proyectoSeleccionado: Proyecto | null = null;
  estadoFiltro = '';
  tipoFiltro   = '';
  busqueda     = '';
  cargando     = false;

  readonly estados    = Object.values(EstadoRequerimiento);
  readonly tipos      = Object.values(TipoRequerimiento);
  readonly prioridades= Object.values(PrioridadRequerimiento);

  // ─── Modal crear / editar requerimiento ──────────────────────────────────
  modalAbierto = signal(false);
  guardando    = signal(false);
  editandoId   = signal<number | null>(null);
  errorModal   = '';

  form = this.fb.group({
    proyectoId:          [null as number | null, Validators.required],
    codigo:              [{ value: '', disabled: true }],
    titulo:              ['', Validators.required],
    descripcion:         ['', Validators.required],
    criteriosAceptacion: ['', Validators.required],
    tipo:                [TipoRequerimiento.FUNCIONAL,   Validators.required],
    prioridad:           [PrioridadRequerimiento.MEDIA,  Validators.required],
    estado:              [EstadoRequerimiento.PENDIENTE, Validators.required],
  });

  ngOnInit(): void {
    this.projectService.getAll({ porPagina: 200 }).subscribe(r => {
      this.proyectos = r.datos;
      const qp = this.route.snapshot.queryParams;
      const qpId = qp['proyectoId'];
      if (qpId) {
        this.proyectoId = Number(qpId);
        this.proyectoSeleccionado = this.proyectos.find(p => p.id === this.proyectoId) ?? null;
        this.cargar();
        if (qp['openModal'] === 'true') {
          this.abrirModal();
        }
      }
    });
  }

  onProyectoChange(): void {
    this.proyectoSeleccionado = this.proyectos.find(p => p.id === Number(this.proyectoId)) ?? null;
    this.requerimientos = [];
    this.busqueda       = '';
    this.estadoFiltro   = '';
    this.tipoFiltro     = '';
    this.pagina         = 1;
    if (this.proyectoId) {
      this.router.navigate([], { queryParams: { proyectoId: this.proyectoId }, replaceUrl: true });
      this.cargar();
    } else {
      this.router.navigate([], { queryParams: {}, replaceUrl: true });
    }
  }

  cargar(): void {
    if (!this.proyectoId) return;
    this.cargando = true;
    this.service.getAll({
      proyectoId: this.proyectoId,
      estado:     this.estadoFiltro || undefined,
      tipo:       this.tipoFiltro   || undefined,
      busqueda:   this.busqueda     || undefined,
      pagina:     this.pagina,
      porPagina:  this.porPagina
    }).subscribe({
      next: (res) => {
        this.requerimientos = res.datos; this.total = res.total; this.cargando = false;
        if (res.datos.length === 0 && this.pagina > 1) { this.pagina = Math.max(1, this.totalPaginas); this.cargar(); }
      },
      error: ()   => { this.cargando = false; this.toast.error('Error al cargar requerimientos'); }
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

  abrirModal(): void {
    this.editandoId.set(null);
    this.errorModal = '';
    this.form.reset({
      proyectoId:          this.proyectoId,
      codigo:              '',
      titulo:              '',
      descripcion:         '',
      criteriosAceptacion: '',
      tipo:                TipoRequerimiento.FUNCIONAL,
      prioridad:           PrioridadRequerimiento.MEDIA,
      estado:              EstadoRequerimiento.PENDIENTE,
    });
    if (this.proyectoId) {
      this.service.getNextCodigo(this.proyectoId).subscribe(r => {
        this.form.get('codigo')?.setValue(r.codigo, { emitEvent: false });
      });
    }
    this.modalAbierto.set(true);
  }

  abrirModalEditar(req: Requerimiento): void {
    this.editandoId.set(req.id);
    this.errorModal = '';
    this.form.patchValue({
      proyectoId:          req.proyectoId ?? this.proyectoId,
      codigo:              req.codigo,
      titulo:              req.titulo,
      descripcion:         req.descripcion,
      criteriosAceptacion: req.criteriosAceptacion,
      tipo:                req.tipo,
      prioridad:           req.prioridad,
      estado:              req.estado,
    });
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.editandoId.set(null);
    this.errorModal = '';
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    this.errorModal = '';

    const id = this.editandoId();
    const op = id
      ? this.service.update(id, this.form.getRawValue() as any)
      : this.service.create(this.form.getRawValue() as any);

    op.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarModal();
        this.cargar();
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorModal = err?.error?.message || 'Error al guardar el requerimiento.';
      }
    });
  }

  get totalPaginas(): number { return Math.ceil(this.total / this.porPagina); }

  proyectoNombreActual(): string {
    return this.proyectoSeleccionado
      ? `${this.proyectoSeleccionado.codigo} — ${this.proyectoSeleccionado.nombre}`
      : '';
  }
}
