import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProjectService } from '../../../core/services/project.service';
import { UserService } from '../../../core/services/user.service';
import { EstadoProyecto, Rol, Usuario } from '../../../core/models';

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './project-form.component.html'
})
export class ProjectFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(ProjectService);
  private userService = inject(UserService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  proyectoId?: number;
  jefesProyecto: Usuario[] = [];
  jefesQA: Usuario[]       = [];
  responsablesQA: Usuario[] = [];
  cargando = false;
  guardando = false;
  error = '';

  guardadoId?: number;
  guardadoCodigo = '';
  guardadoNombre = '';

  private estadoOriginal?: EstadoProyecto;

  private static readonly TRANSICIONES: Record<EstadoProyecto, EstadoProyecto[]> = {
    [EstadoProyecto.POR_ESTIMAR]:   [EstadoProyecto.ESTIMADO],
    [EstadoProyecto.ESTIMADO]:      [EstadoProyecto.PLANIFICADO],
    [EstadoProyecto.PLANIFICADO]:   [EstadoProyecto.EN_EJECUCION],
    [EstadoProyecto.EN_EJECUCION]:  [EstadoProyecto.FINALIZADO, EstadoProyecto.OBSERVADO],
    [EstadoProyecto.OBSERVADO]:     [EstadoProyecto.EN_EJECUCION],
    [EstadoProyecto.FINALIZADO]:    [EstadoProyecto.EN_PRODUCCION],
    [EstadoProyecto.EN_PRODUCCION]: [],
  };

  get estadosDisponibles(): EstadoProyecto[] {
    if (!this.esEdicion || !this.estadoOriginal) {
      return [EstadoProyecto.POR_ESTIMAR];
    }
    const siguientes = ProjectFormComponent.TRANSICIONES[this.estadoOriginal] ?? [];
    return [this.estadoOriginal, ...siguientes];
  }

  form = this.fb.group({
    // Identificación
    codigo: ['', [Validators.required, Validators.maxLength(10)]],
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    cliente: ['', Validators.required],
    sistema: [''],

    // Responsables
    responsableQaId: [null as number | null],
    jefeProyectoId: [null as number | null, Validators.required],
    jefeQaId: [null as number | null, Validators.required],

    // Estado y avance
    estado: [EstadoProyecto.POR_ESTIMAR, Validators.required],
    horasQa: [null as number | null],

    // Fechas planificadas
    fechaEstimacion: [''],
    fechaInicioPlanificada: [''],
    fechaFinPlanificada: [''],

    // Fechas reales
    fechaInicioReal: [''],
    fechaFinReal: [''],

    // Otros
    repositorioUrl: [''],
    documentoUrl:   [''],
    rutaSharepoint: ['', Validators.required],
    notas: [''],
  });

  get esEdicion(): boolean { return !!this.proyectoId; }

  get mostrarHorasQa(): boolean {
    return this.form.get('estado')?.value !== EstadoProyecto.POR_ESTIMAR;
  }

  ngOnInit(): void {
    const base = { activo: true, porPagina: 200 };
    this.userService.getAll({ ...base, rol: Rol.PROJECT_MANAGER }).subscribe(r => { this.jefesProyecto  = r.datos; });
    this.userService.getAll({ ...base, rol: Rol.QA_LEAD         }).subscribe(r => { this.jefesQA        = r.datos; });
    this.userService.getAll({ ...base, rol: Rol.QA_TESTER       }).subscribe(r => { this.responsablesQA = r.datos; });

    this.form.get('estado')!.valueChanges.subscribe(estado => {
      if (estado === EstadoProyecto.POR_ESTIMAR) {
        this.form.get('horasQa')!.setValue(null, { emitEvent: false });
      }
      this.actualizarValidadores(estado);
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.proyectoId = Number(id);
      this.cargando = true;
      this.service.getById(this.proyectoId).subscribe({
        next: (p) => {
          this.estadoOriginal    = p.estado as EstadoProyecto;
          this.documentosGuardados = p.documentosRequerimientos ?? [];
          this.form.patchValue({
            ...p,
            fechaEstimacion:        this.toDateStr(p.fechaEstimacion),
            fechaInicioPlanificada: this.toDateStr(p.fechaInicioPlanificada),
            fechaFinPlanificada:    this.toDateStr(p.fechaFinPlanificada),
            fechaInicioReal:        this.toDateStr(p.fechaInicioReal),
            fechaFinReal:           this.toDateStr(p.fechaFinReal),
          });
          this.actualizarValidadores(p.estado as EstadoProyecto);
          this.cargando = false;
        }
      });
    }
  }

  get estadoActual(): EstadoProyecto {
    return this.form.get('estado')?.value as EstadoProyecto;
  }

  get labelDocumentoUrl(): string {
    return this.estadoActual === EstadoProyecto.PLANIFICADO
      ? 'URL Documento de Planificación'
      : 'URL Documento de Estimación';
  }

  get mostrarDocumentoUrl(): boolean {
    return this.estadoActual === EstadoProyecto.ESTIMADO ||
           this.estadoActual === EstadoProyecto.PLANIFICADO;
  }

  private actualizarValidadores(estado: EstadoProyecto | null): void {
    const requiereEstimacion    = estado === EstadoProyecto.ESTIMADO;
    const requierePlanificadas  = estado === EstadoProyecto.PLANIFICADO;
    const requiereReales        = estado === EstadoProyecto.EN_EJECUCION;

    this.setRequired('fechaEstimacion',        requiereEstimacion);
    this.setRequired('fechaInicioPlanificada', requierePlanificadas);
    this.setRequired('fechaFinPlanificada',    requierePlanificadas);
    this.setRequired('fechaInicioReal',        requiereReales);
    this.setRequired('fechaFinReal',           requiereReales);
  }

  private setRequired(field: string, required: boolean): void {
    const ctrl = this.form.get(field)!;
    if (required) {
      ctrl.addValidators(Validators.required);
    } else {
      ctrl.removeValidators(Validators.required);
    }
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  private toDateStr(date?: Date): string {
    return date ? new Date(date).toISOString().split('T')[0] : '';
  }

  // ─── Submit ──────────────────────────────────────────────────────────────

  onSubmit(): void {
    if (this.form.invalid) return;

    this.guardando = true;
    this.error = '';

    const raw = this.form.value as any;
    const toNum  = (v: any) => (v !== null && v !== undefined && v !== '') ? +v : undefined;
    const toDate = (v: any) => (v && v !== '') ? v : undefined;

    const payload: any = {
      ...raw,
      jefeProyectoId:         toNum(raw.jefeProyectoId),
      jefeQaId:               toNum(raw.jefeQaId),
      responsableQaId:        toNum(raw.responsableQaId) ?? undefined,
      horasQa:                toNum(raw.horasQa),
      fechaEstimacion:        toDate(raw.fechaEstimacion),
      fechaInicioPlanificada: toDate(raw.fechaInicioPlanificada),
      fechaFinPlanificada:    toDate(raw.fechaFinPlanificada),
      fechaInicioReal:        toDate(raw.fechaInicioReal),
      fechaFinReal:           toDate(raw.fechaFinReal),
    };

    const op = this.esEdicion
      ? this.service.update(this.proyectoId!, payload)
      : this.service.create(payload);

    op.subscribe({
      next: (p) => {
        this.guardando = false;
        if (this.esEdicion) {
          this.router.navigate(['/proyectos', p.id]);
        } else {
          this.guardadoId     = p.id;
          this.guardadoCodigo = p.codigo;
          this.guardadoNombre = p.nombre;
        }
      },
      error: (err) => {
        this.error = err.error?.message || 'Error al guardar el proyecto';
        this.guardando = false;
      }
    });
  }
}
