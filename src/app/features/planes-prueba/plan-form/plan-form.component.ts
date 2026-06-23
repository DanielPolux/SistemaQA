import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PlanPruebaService } from '../../../core/services/plan-prueba.service';
import { ProjectService } from '../../../core/services/project.service';
import { UserService } from '../../../core/services/user.service';
import { RequirementService } from '../../../core/services/requirement.service';
import { Proyecto, Usuario, Requerimiento, TIPOS_PRUEBA, AMBIENTES_PLAN } from '../../../core/models';

@Component({
  selector: 'app-plan-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './plan-form.component.html',
})
export class PlanFormComponent implements OnInit {
  private fb                 = inject(FormBuilder);
  private service            = inject(PlanPruebaService);
  private projectService     = inject(ProjectService);
  private userService        = inject(UserService);
  private requirementService = inject(RequirementService);
  private router             = inject(Router);
  private route              = inject(ActivatedRoute);

  planId?: number;
  proyectos: Proyecto[]       = [];
  responsables: Usuario[]     = [];
  requerimientos: Requerimiento[] = [];
  requerimientosSeleccionados = new Set<number>();
  cargandoReqs = false;
  guardando    = false;
  error        = '';

  readonly tiposPrueba  = TIPOS_PRUEBA;
  readonly ambientesPlan = AMBIENTES_PLAN;

  form = this.fb.group({
    proyectoId:       [null as number | null, Validators.required],
    nombre:           ['', [Validators.required, Validators.maxLength(200)]],
    descripcion:      [''],
    sprint:           [''],
    tipoPrueba:       [''],
    ambiente:         [''],
    objetivo:         ['', Validators.required],
    alcance:          [''],
    fueraAlcance:     [''],
    criteriosEntrada: [''],
    criteriosSalida:  [''],
    riesgos:          [''],
    responsableId:    [null as number | null],
    fechaInicio:      [''],
    fechaObjetivo:    [''],
  });

  get esEdicion(): boolean { return !!this.planId; }

  ngOnInit(): void {
    this.projectService.getAll({ porPagina: 500 }).subscribe(r => { this.proyectos = r.datos; });
    this.userService.getAll({ porPagina: 500 }).subscribe(r => { this.responsables = r.datos; });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.planId = Number(id);
      this.service.getById(this.planId).subscribe(p => {
        this.form.patchValue({
          proyectoId:       p.proyectoId,
          nombre:           p.nombre,
          descripcion:      p.descripcion    ?? '',
          sprint:           p.sprint         ?? '',
          tipoPrueba:       p.tipoPrueba     ?? '',
          ambiente:         p.ambiente       ?? '',
          objetivo:         p.objetivo,
          alcance:          p.alcance         ?? '',
          fueraAlcance:     p.fueraAlcance    ?? '',
          criteriosEntrada: p.criteriosEntrada ?? '',
          criteriosSalida:  p.criteriosSalida  ?? '',
          riesgos:          p.riesgos          ?? '',
          responsableId:    p.responsableId    ?? null,
          fechaInicio:      p.fechaInicio      ? String(p.fechaInicio).substring(0, 10)  : '',
          fechaObjetivo:    p.fechaObjetivo    ? String(p.fechaObjetivo).substring(0, 10): '',
        });
        this.cargarRequerimientos(p.proyectoId, new Set(p.requerimientoIds ?? []));
      });
    }

    if (!id) {
      this.form.get('proyectoId')!.valueChanges.subscribe(pid => {
        this.requerimientos = [];
        this.requerimientosSeleccionados.clear();
        if (pid) this.cargarRequerimientos(Number(pid));
      });
    }
  }

  private cargarRequerimientos(proyectoId: number, preseleccionados = new Set<number>()): void {
    this.cargandoReqs = true;
    this.requirementService.getAll({ proyectoId, porPagina: 500 }).subscribe({
      next: (res) => {
        this.requerimientos = res.datos;
        this.requerimientosSeleccionados = new Set(preseleccionados);
        this.cargandoReqs = false;
      },
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

  seleccionarTodos(): void {
    this.requerimientos.forEach(r => this.requerimientosSeleccionados.add(r.id));
  }

  deseleccionarTodos(): void {
    this.requerimientosSeleccionados.clear();
  }

  prioridadClase(p: string): string {
    const m: Record<string, string> = {
      'Crítica': 'badge-prioridad-critica',
      'Alta':    'badge-prioridad-alta',
      'Media':   'badge-prioridad-media',
      'Baja':    'badge-prioridad-baja',
    };
    return m[p] ?? 'badge';
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.guardando = true;
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
      criteriosEntrada: val.criteriosEntrada || undefined,
      criteriosSalida:  val.criteriosSalida  || undefined,
      riesgos:          val.riesgos          || undefined,
      responsableId:    val.responsableId    || undefined,
      fechaInicio:      val.fechaInicio      || undefined,
      fechaObjetivo:    val.fechaObjetivo    || undefined,
      requerimientoIds: Array.from(this.requerimientosSeleccionados),
    };

    const op = this.esEdicion
      ? this.service.update(this.planId!, payload)
      : this.service.create(payload);

    op.subscribe({
      next: (res) => this.router.navigate(['/planes-prueba', res.id]),
      error: (err) => { this.error = err.error?.message || 'Error al guardar'; this.guardando = false; },
    });
  }

  nombreUsuario(u: Usuario): string {
    return `${u.nombre} ${u.apellido}`;
  }
}
