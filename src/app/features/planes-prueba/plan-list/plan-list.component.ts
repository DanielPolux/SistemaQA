import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { PlanPruebaService } from '../../../core/services/plan-prueba.service';
import { ProjectService } from '../../../core/services/project.service';
import { UserService } from '../../../core/services/user.service';
import { RequirementService } from '../../../core/services/requirement.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  PlanPrueba, EstadoPlan, Proyecto, Usuario, Requerimiento,
  TIPOS_PRUEBA, AMBIENTES_PLAN,
} from '../../../core/models';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-plan-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  templateUrl: './plan-list.component.html',
})
export class PlanListComponent implements OnInit {
  private service            = inject(PlanPruebaService);
  private projectService     = inject(ProjectService);
  private userService        = inject(UserService);
  private requirementService = inject(RequirementService);
  private fb                 = inject(FormBuilder);
  private toast              = inject(ToastService);
  auth                       = inject(AuthService);

  planes: PlanPrueba[]        = [];
  proyectos: Proyecto[]       = [];
  responsables: Usuario[]     = [];
  requerimientos: Requerimiento[] = [];
  requerimientosSeleccionados = new Set<number>();
  cargandoReqs                = false;

  total     = 0;
  pagina    = 1;
  porPagina = 10;
  cargando  = false;

  proyectoFiltroId?: number;
  estadoFiltro = '';

  readonly estados      = Object.values(EstadoPlan);
  readonly tiposPrueba  = TIPOS_PRUEBA;
  readonly ambientesPlan = AMBIENTES_PLAN;

  readonly estadoClase: Record<string, string> = {
    [EstadoPlan.BORRADOR]:     'badge-plan-borrador',
    [EstadoPlan.PLANIFICADO]:  'badge-plan-planificado',
    [EstadoPlan.EN_EJECUCION]: 'badge-ciclo-activo',
    [EstadoPlan.CERRADO]:      'badge-ciclo-cerrado',
  };

  // ─── Modal crear / editar plan ───────────────────────────────────────────
  modalAbierto = signal(false);
  guardando    = signal(false);
  errorModal   = '';
  editandoId   = signal<number | null>(null);

  form = this.fb.group({
    proyectoId:    [null as number | null, Validators.required],
    nombre:        ['', [Validators.required, Validators.maxLength(200)]],
    descripcion:   [''],
    sprint:        [''],
    tipoPrueba:    [''],
    ambiente:      [''],
    objetivo:      ['', Validators.required],
    alcance:       [''],
    fueraAlcance:  [''],
    responsableId: [null as number | null],
    fechaInicio:   [''],
    fechaObjetivo: [''],
  });

  // ─── Modal confirmar eliminar ─────────────────────────────────────────────
  modalConfirmarAbierto = signal(false);
  confirmPendiente: { id: number; nombre: string } | null = null;

  ngOnInit(): void {
    this.projectService.getAll({ porPagina: 500 }).subscribe(r => { this.proyectos = r.datos; });
    this.userService.getAll({ porPagina: 500 }).subscribe(r => { this.responsables = r.datos; });
    this.cargar();

    this.form.get('proyectoId')!.valueChanges.subscribe(pid => {
      this.requerimientos = [];
      this.requerimientosSeleccionados.clear();
      if (pid) this.cargarRequerimientos(Number(pid));
    });
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
      error: () => { this.cargando = false; this.toast.error('Error al cargar planes de prueba'); },
    });
  }

  buscar(): void { this.pagina = 1; this.cargar(); }
  cambiarPagina(p: number): void { this.pagina = p; this.cargar(); }
  get paginas(): number[] { return Array.from({ length: this.totalPaginas }, (_, i) => i + 1); }
  get totalPaginas(): number { return Math.ceil(this.total / this.porPagina); }

  // ─── Modal crear ──────────────────────────────────────────────────────────
  abrirModal(): void {
    this.errorModal = '';
    this.editandoId.set(null);
    this.requerimientos = [];
    this.requerimientosSeleccionados.clear();
    this.form.reset({
      proyectoId: null, nombre: '', descripcion: '', sprint: '',
      tipoPrueba: '', ambiente: '', objetivo: '', alcance: '',
      fueraAlcance: '', responsableId: null, fechaInicio: '', fechaObjetivo: '',
    });
    this.form.get('proyectoId')!.enable();
    this.modalAbierto.set(true);
  }

  abrirModalEditar(plan: PlanPrueba): void {
    this.errorModal = '';
    this.editandoId.set(plan.id);
    this.requerimientos = [];
    this.requerimientosSeleccionados.clear();
    this.form.reset({
      proyectoId:    plan.proyectoId ?? null,
      nombre:        plan.nombre,
      descripcion:   plan.descripcion    ?? '',
      sprint:        plan.sprint         ?? '',
      tipoPrueba:    plan.tipoPrueba     ?? '',
      ambiente:      plan.ambiente       ?? '',
      objetivo:      plan.objetivo       ?? '',
      alcance:       plan.alcance        ?? '',
      fueraAlcance:  plan.fueraAlcance   ?? '',
      responsableId: plan.responsableId  ?? null,
      fechaInicio:   plan.fechaInicio  ? String(plan.fechaInicio).substring(0, 10)  : '',
      fechaObjetivo: plan.fechaObjetivo ? String(plan.fechaObjetivo).substring(0, 10) : '',
    });
    this.form.get('proyectoId')!.disable();
    if (plan.proyectoId) {
      this.cargandoReqs = true;
      this.requirementService.getAll({ proyectoId: plan.proyectoId, porPagina: 500 }).subscribe({
        next: (res) => {
          this.requerimientos = res.datos;
          this.requerimientosSeleccionados = new Set((plan as any).requerimientoIds ?? []);
          this.cargandoReqs = false;
        },
        error: () => { this.cargandoReqs = false; },
      });
    }
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.editandoId.set(null);
    this.errorModal = '';
    this.form.get('proyectoId')!.enable();
  }

  private cargarRequerimientos(proyectoId: number): void {
    this.cargandoReqs = true;
    this.requirementService.getAll({ proyectoId, porPagina: 500 }).subscribe({
      next: (res) => { this.requerimientos = res.datos; this.cargandoReqs = false; },
      error: () => { this.cargandoReqs = false; },
    });
  }

  toggleReq(id: number): void {
    if (this.requerimientosSeleccionados.has(id)) {
      this.requerimientosSeleccionados.delete(id);
    } else {
      this.requerimientosSeleccionados.add(id);
    }
  }

  seleccionarTodos(): void    { this.requerimientos.forEach(r => this.requerimientosSeleccionados.add(r.id)); }
  deseleccionarTodos(): void  { this.requerimientosSeleccionados.clear(); }

  prioridadClase(p: string): string {
    const m: Record<string, string> = {
      'Crítica': 'badge-prioridad-critica',
      'Alta':    'badge-prioridad-alta',
      'Media':   'badge-prioridad-media',
      'Baja':    'badge-prioridad-baja',
    };
    return m[p] ?? 'badge';
  }

  guardar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardando.set(true);
    this.errorModal = '';
    const val = this.form.getRawValue();
    const payload: any = {
      proyectoId:       val.proyectoId,
      nombre:           val.nombre,
      descripcion:      val.descripcion      || undefined,
      sprint:           val.sprint           || undefined,
      tipoPrueba:       val.tipoPrueba       || undefined,
      ambiente:         val.ambiente         || undefined,
      objetivo:         val.objetivo,
      alcance:          val.alcance          || undefined,
      fueraAlcance:     val.fueraAlcance     || undefined,
      responsableId:    val.responsableId    || undefined,
      fechaInicio:      val.fechaInicio      || undefined,
      fechaObjetivo:    val.fechaObjetivo    || undefined,
      requerimientoIds: Array.from(this.requerimientosSeleccionados),
    };
    const op = this.editandoId()
      ? this.service.update(this.editandoId()!, payload)
      : this.service.create(payload);

    op.subscribe({
      next: () => { this.guardando.set(false); this.cerrarModal(); this.cargar(); },
      error: (err) => {
        this.guardando.set(false);
        this.errorModal = err?.error?.message || 'Error al guardar el plan.';
      },
    });
  }

  nombreUsuario(u: Usuario): string { return `${u.nombre} ${u.apellido}`; }

  // ─── Acciones de lista ────────────────────────────────────────────────────
  cerrar(p: PlanPrueba): void   { this.service.cerrar(p.id).subscribe(() => this.cargar()); }
  reabrir(p: PlanPrueba): void  { this.service.reabrir(p.id).subscribe(() => this.cargar()); }

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
}
