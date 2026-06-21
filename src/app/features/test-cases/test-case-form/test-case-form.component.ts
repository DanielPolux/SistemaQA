import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, UrlSegment } from '@angular/router';
import { TestCaseService } from '../../../core/services/test-case.service';
import { ProjectService } from '../../../core/services/project.service';
import { UserService } from '../../../core/services/user.service';
import { RequirementService } from '../../../core/services/requirement.service';
import {
  EstadoCasoPrueba, PrioridadCasoPrueba, ResultadoCasoPrueba, TipoPrueba,
  Proyecto, Usuario, Paso, Requerimiento, Rol
} from '../../../core/models';

@Component({
  selector: 'app-test-case-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './test-case-form.component.html'
})
export class TestCaseFormComponent implements OnInit {
  private fb                 = inject(FormBuilder);
  private service            = inject(TestCaseService);
  private projectService     = inject(ProjectService);
  private userService        = inject(UserService);
  private requirementService = inject(RequirementService);
  private router             = inject(Router);
  private route              = inject(ActivatedRoute);

  casoId?: number;
  proyectos: Proyecto[]          = [];
  usuarios: Usuario[]            = [];
  requerimientos: Requerimiento[] = [];
  guardando = false;
  error = '';

  readonly tipos       = Object.values(TipoPrueba);
  readonly prioridades = Object.values(PrioridadCasoPrueba);

  form = this.fb.group({
    codigo:            [{ value: '', disabled: true }],
    nombre:            ['', Validators.required],
    proyectoId:        [null as number | null, Validators.required],
    claveProyecto:     [''],

    tipo:              [TipoPrueba.FUNCIONAL, Validators.required],
    descripcion:       ['', Validators.required],

    pasos:             ['', Validators.required],
    resultadoEsperado: ['', Validators.required],

    prioridad:         [PrioridadCasoPrueba.MEDIA, Validators.required],

    // Campos de ejecución — solo lectura, no se muestran en el form
    estado:            [EstadoCasoPrueba.PENDIENTE],
    resultado:         [ResultadoCasoPrueba.SIN_EJECUTAR],
    responsableQaId:   [null as number | null],
    fechaEjecucion:    [''],
    evidenciaUrl:      [''],
    observaciones:     [''],

    requerimientoRf:   [''],
    requerimientoId:   [null as number | null],
  });

  get esEdicion(): boolean { return !!this.casoId; }

  get soloLectura(): boolean {
    return this.route.snapshot.url.some((s: UrlSegment) => s.path === 'ver');
  }

  ngOnInit(): void {
    this.projectService.getAll({ porPagina: 200 }).subscribe(r => { this.proyectos = r.datos; });
    this.userService.getAll({ activo: true, rol: Rol.QA_TESTER, porPagina: 200 }).subscribe(r => { this.usuarios = r.datos; });

    this.form.get('proyectoId')?.valueChanges.subscribe(id => {
      const p = this.proyectos.find(x => x.id === id);
      if (p) this.form.patchValue({ claveProyecto: p.codigo }, { emitEvent: false });

      this.requerimientos = [];
      this.form.patchValue({ requerimientoRf: '', requerimientoId: null }, { emitEvent: false });
      if (id) {
        this.requirementService.getByProyecto(id).subscribe(r => { this.requerimientos = r; });
        if (!this.esEdicion) {
          this.service.getNextCodigo(id).subscribe(r => {
            this.form.get('codigo')?.setValue(r.codigo, { emitEvent: false });
          });
        }
      } else if (!this.esEdicion) {
        this.form.get('codigo')?.setValue('', { emitEvent: false });
      }
    });

    // Pre-seleccionar proyecto y requerimiento desde query params (flujo guiado)
    const qpProyecto     = this.route.snapshot.queryParams['proyectoId'];
    const qpRequerimiento = this.route.snapshot.queryParams['requerimientoId'];
    if (qpProyecto && !this.route.snapshot.paramMap.get('id')) {
      const pid = Number(qpProyecto);
      this.form.patchValue({ proyectoId: pid });
      if (qpRequerimiento) {
        this.requirementService.getByProyecto(pid).subscribe(r => {
          this.requerimientos = r;
          const req = r.find(x => x.id === Number(qpRequerimiento));
          if (req) {
            this.form.patchValue({ requerimientoRf: req.codigo, requerimientoId: req.id });
          }
        });
      }
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.casoId = Number(id);
      this.service.getById(this.casoId).subscribe(c => {
        if (c.proyectoId) {
          this.requirementService.getByProyecto(c.proyectoId).subscribe(r => {
            this.requerimientos = r;
          });
        }
        this.form.patchValue({
          ...c,
          pasos: this.pasosATexto(c.pasos),
          fechaEjecucion: c.fechaEjecucion
            ? new Date(c.fechaEjecucion).toISOString().split('T')[0]
            : ''
        } as any);
        if (this.soloLectura) this.form.disable();
      });
    }
  }

  onRequerimientoChange(event: Event): void {
    const codigo = (event.target as HTMLInputElement).value.trim();
    const match  = this.requerimientos.find(r => r.codigo === codigo);
    this.form.patchValue({ requerimientoId: match?.id ?? null }, { emitEvent: false });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.guardando = true;

    const val     = this.form.value;
    const { codigo: _codigo, ...rest } = val;
    const payload = {
      ...rest,
      pasos:          this.textoPasos(rest.pasos as string),
      fechaEjecucion: rest.fechaEjecucion || undefined,
      evidenciaUrl:   rest.evidenciaUrl   || undefined,
    };

    const op = this.esEdicion
      ? this.service.update(this.casoId!, payload as any)
      : this.service.create(payload as any);

    op.subscribe({
      next: () => this.router.navigate(['/casos-prueba']),
      error: (err) => {
        this.error = err.error?.message || 'Error al guardar';
        this.guardando = false;
      }
    });
  }

  private textoPasos(texto: string): Paso[] {
    if (!texto?.trim()) return [];
    return texto
      .split('\n')
      .filter(l => l.trim())
      .map((l, idx) => ({
        orden: idx + 1,
        descripcion: l.replace(/^\d+\.\s*/, '').trim(),
        resultadoEsperado: ''
      }));
  }

  private pasosATexto(pasos: Paso[]): string {
    if (!pasos?.length) return '';
    return pasos.map(p => `${p.orden}. ${p.descripcion}`).join('\n');
  }
}
