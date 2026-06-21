import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProjectService } from '../../../core/services/project.service';
import { UserService } from '../../../core/services/user.service';
import { DocumentoRequerimiento, EstadoProyecto, Rol, Usuario } from '../../../core/models';

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

  // ─── Documentos de requerimientos ────────────────────────────────────────
  archivosSeleccionados: File[]             = [];
  documentosGuardados:   DocumentoRequerimiento[] = [];
  errorDocumentos = '';
  eliminandoDoc: string | null = null;

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

  // ─── Gestión de archivos ─────────────────────────────────────────────────

  onArchivosSeleccionados(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const nuevos = Array.from(input.files);
    this.archivosSeleccionados = [...this.archivosSeleccionados, ...nuevos];
    this.errorDocumentos = '';
    input.value = '';
  }

  quitarArchivoSeleccionado(index: number): void {
    this.archivosSeleccionados = this.archivosSeleccionados.filter((_, i) => i !== index);
  }

  eliminarDocumentoGuardado(itemId: string): void {
    this.eliminandoDoc = itemId;
    this.service.deleteDocument(this.proyectoId!, itemId).subscribe({
      next: (p) => {
        this.documentosGuardados = p.documentosRequerimientos ?? [];
        this.eliminandoDoc = null;
      },
      error: (err) => {
        this.errorDocumentos = err.error?.message || 'Error al eliminar el documento';
        this.eliminandoDoc = null;
      }
    });
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private get totalDocumentos(): number {
    return this.documentosGuardados.length + this.archivosSeleccionados.length;
  }

  private subirArchivosSecuencial(proyectoId: number, archivos: File[], index = 0): void {
    if (index >= archivos.length) {
      this.guardando = false;
      if (this.esEdicion) {
        this.router.navigate(['/proyectos', proyectoId]);
      } else {
        const p = { id: proyectoId, codigo: this.guardadoCodigo, nombre: this.guardadoNombre };
        // guardadoId already set, success screen already showing
      }
      return;
    }
    this.service.uploadDocument(proyectoId, archivos[index]).subscribe({
      next: (p) => {
        this.documentosGuardados = p.documentosRequerimientos ?? [];
        this.subirArchivosSecuencial(proyectoId, archivos, index + 1);
      },
      error: (err) => {
        this.errorDocumentos +=
          `\nError al subir "${archivos[index].name}": ${err.error?.message || 'Error'}`;
        this.subirArchivosSecuencial(proyectoId, archivos, index + 1);
      }
    });
  }

  // ─── Submit ──────────────────────────────────────────────────────────────

  onSubmit(): void {
    if (this.form.invalid) return;

    this.guardando = true;
    this.error = '';
    this.errorDocumentos = '';

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
        if (!this.esEdicion) {
          this.guardadoId     = p.id;
          this.guardadoCodigo = p.codigo;
          this.guardadoNombre = p.nombre;
        }
        if (this.archivosSeleccionados.length > 0) {
          this.subirArchivosSecuencial(p.id, this.archivosSeleccionados);
        } else {
          this.guardando = false;
          if (this.esEdicion) this.router.navigate(['/proyectos', p.id]);
        }
      },
      error: (err) => {
        this.error = err.error?.message || 'Error al guardar el proyecto';
        this.guardando = false;
      }
    });
  }
}
