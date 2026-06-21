import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CicloService, CasoPrevio } from '../../../core/services/ciclo.service';
import { PlanPruebaService } from '../../../core/services/plan-prueba.service';
import { ProjectService } from '../../../core/services/project.service';
import { RequirementService } from '../../../core/services/requirement.service';
import { TestCaseService } from '../../../core/services/test-case.service';
import { AmbienteEjecucion, EstadoProyecto, Proyecto, PlanPrueba } from '../../../core/models';

@Component({
  selector: 'app-ciclo-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './ciclo-form.component.html',
})
export class CicloFormComponent implements OnInit {
  private fb                 = inject(FormBuilder);
  private service            = inject(CicloService);
  private planService        = inject(PlanPruebaService);
  private projectService     = inject(ProjectService);
  private requirementService = inject(RequirementService);
  private testCaseService    = inject(TestCaseService);
  private router             = inject(Router);
  private route              = inject(ActivatedRoute);

  private readonly ESTADOS_PERMITIDOS = new Set<EstadoProyecto>([
    EstadoProyecto.PLANIFICADO,
    EstadoProyecto.EN_EJECUCION,
    EstadoProyecto.OBSERVADO,
  ]);

  cicloId?: number;
  proyectos: Proyecto[] = [];
  planes: PlanPrueba[]  = [];
  readonly ambientes = Object.values(AmbienteEjecucion);
  guardando = false;
  error = '';
  errorEstado = '';
  errorRequerimientos = '';
  verificandoReqs = false;

  // ─── Checklist casos previos ─────────────────────────────────────────────
  cargandoCasos = false;
  tieneHistorial = false;
  casosReejecucion: CasoPrevio[] = [];   // Fallido / Bloqueado / Omitido
  casosAprobados: CasoPrevio[]   = [];   // Aprobado (opcional)
  seleccionados = new Set<number>();

  form = this.fb.group({
    proyectoId:   [null as number | null, Validators.required],
    planPruebaId: [null as number | null],
    nombre:       ['', [Validators.required, Validators.maxLength(200)]],
    descripcion:  [''],
    ambiente:     ['', Validators.required],
    fechaInicio:  [''],
    fechaFin:     [''],
  });

  get esEdicion(): boolean { return !!this.cicloId; }

  get proyectoValido(): boolean {
    if (this.esEdicion) return true;
    const pid = this.form.get('proyectoId')?.value;
    if (!pid) return true;
    return !this.errorEstado && !this.errorRequerimientos && !this.verificandoReqs;
  }

  ngOnInit(): void {
    this.projectService.getAll({ porPagina: 500 }).subscribe(r => { this.proyectos = r.datos; });
    this.planService.getAll({ porPagina: 500 }).subscribe(r => { this.planes = r.datos; });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.cicloId = Number(id);
      this.service.getById(this.cicloId).subscribe(c => {
        this.form.patchValue({
          proyectoId:   c.proyectoId,
          planPruebaId: c.planPruebaId ?? null,
          nombre:       c.nombre,
          descripcion:  c.descripcion ?? '',
          ambiente:     c.ambiente    ?? '',
          fechaInicio:  c.fechaInicio ? String(c.fechaInicio).substring(0, 10) : '',
          fechaFin:     c.fechaFin    ? String(c.fechaFin).substring(0, 10)    : '',
        });
      });
    }

    const qpProyecto = this.route.snapshot.queryParams['proyectoId'];
    if (qpProyecto && !id) {
      this.form.patchValue({ proyectoId: Number(qpProyecto) });
      this.cargarCasosPrevios(Number(qpProyecto));
    }

    // Recargar casos cuando cambia el proyecto (solo en modo creación)
    if (!id) {
      this.form.get('proyectoId')!.valueChanges.subscribe(pid => {
        this.resetChecklist();
        this.errorEstado = '';
        this.errorRequerimientos = '';
        this.verificandoReqs = false;
        if (!pid) return;

        const p = this.proyectos.find(x => x.id === Number(pid));
        if (p && !this.ESTADOS_PERMITIDOS.has(p.estado as EstadoProyecto)) {
          this.errorEstado =
            `El proyecto está en estado "${p.estado}". Solo se pueden crear ciclos en proyectos con estado Planificado, En Ejecución u Observado.`;
          return;
        }

        // Verificar que todos los requerimientos tengan casos de prueba
        this.verificandoReqs = true;
        forkJoin({
          reqs:  this.requirementService.getByProyecto(Number(pid)),
          casos: this.testCaseService.getByProyecto(Number(pid)),
        }).subscribe({
          next: ({ reqs, casos }) => {
            this.verificandoReqs = false;
            if (reqs.length === 0) {
              this.cargarCasosPrevios(Number(pid));
              return;
            }
            const reqsConCaso = new Set(
              casos.filter(c => c.requerimientoId).map(c => c.requerimientoId!)
            );
            const faltantes = reqs.filter(r => !reqsConCaso.has(r.id));
            if (faltantes.length > 0) {
              this.errorRequerimientos =
                `Los siguientes requerimientos no tienen casos de prueba asociados: ` +
                faltantes.map(r => r.codigo).join(', ') + '.';
            } else {
              this.cargarCasosPrevios(Number(pid));
            }
          },
          error: () => { this.verificandoReqs = false; },
        });
      });
    }
  }

  private cargarCasosPrevios(proyectoId: number): void {
    this.cargandoCasos = true;
    this.service.getCasosPrevios(proyectoId).subscribe({
      next: ({ tieneHistorial, casos }) => {
        this.tieneHistorial = tieneHistorial;
        this.casosReejecucion = casos.filter(c => c.resultado !== 'Aprobado');
        this.casosAprobados   = casos.filter(c => c.resultado === 'Aprobado');
        // Pre-check Fallido / Bloqueado / Omitido
        this.seleccionados = new Set(this.casosReejecucion.map(c => c.id));
        this.cargandoCasos = false;
      },
      error: () => { this.cargandoCasos = false; },
    });
  }

  private resetChecklist(): void {
    this.tieneHistorial   = false;
    this.casosReejecucion = [];
    this.casosAprobados   = [];
    this.seleccionados    = new Set();
  }

  toggleCaso(id: number): void {
    if (this.seleccionados.has(id)) this.seleccionados.delete(id);
    else this.seleccionados.add(id);
  }

  badgeResultado(resultado: string): string {
    const map: Record<string, string> = {
      Fallido:  'badge-hist-fallido',
      Bloqueado:'badge-hist-bloqueado',
      Omitido:  'badge-hist-omitido',
      Aprobado: 'badge-hist-aprobado',
    };
    return map[resultado] ?? 'badge';
  }

  onSubmit(): void {
    if (this.form.invalid || !this.proyectoValido) return;
    this.guardando = true;
    const val = this.form.getRawValue();

    const payload: any = {
      proyectoId:   val.proyectoId,
      planPruebaId: val.planPruebaId || undefined,
      nombre:       val.nombre,
      descripcion:  val.descripcion || undefined,
      ambiente:     val.ambiente    || undefined,
      fechaInicio:  val.fechaInicio || undefined,
      fechaFin:     val.fechaFin    || undefined,
    };

    if (!this.esEdicion && this.seleccionados.size > 0) {
      payload.casosIds = Array.from(this.seleccionados);
    }

    const op = this.esEdicion
      ? this.service.update(this.cicloId!, payload)
      : this.service.create(payload);

    op.subscribe({
      next: () => this.router.navigate(['/ciclos']),
      error: (err) => { this.error = err.error?.message || 'Error al guardar'; this.guardando = false; },
    });
  }
}
