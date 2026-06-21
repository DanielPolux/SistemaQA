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

  // ─── Modal crear requerimiento ───────────────────────────────────────────
  modalAbierto = signal(false);
  guardando    = signal(false);
  errorModal   = '';

  form = this.fb.group({
    proyectoId:          [null as number | null, Validators.required],
    codigo:              ['', Validators.required],
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
      const qpId = this.route.snapshot.queryParams['proyectoId'];
      if (qpId) {
        this.proyectoId = Number(qpId);
        this.proyectoSeleccionado = this.proyectos.find(p => p.id === this.proyectoId) ?? null;
        this.cargar();
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
      next: (res) => { this.requerimientos = res.datos; this.total = res.total; this.cargando = false; },
      error: ()   => { this.cargando = false; }
    });
  }

  buscar(): void { this.pagina = 1; this.cargar(); }

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
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.errorModal = '';
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    this.errorModal = '';

    this.service.create(this.form.getRawValue() as any).subscribe({
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
