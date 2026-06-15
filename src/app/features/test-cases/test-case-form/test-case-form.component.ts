import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TestCaseService } from '../../../core/services/test-case.service';
import { ProjectService } from '../../../core/services/project.service';
import { UserService } from '../../../core/services/user.service';
import { RequirementService } from '../../../core/services/requirement.service';
import {
  EstadoCasoPrueba, PrioridadCasoPrueba, ResultadoCasoPrueba, TipoPrueba,
  Proyecto, Usuario, Paso, Requerimiento
} from '../../../core/models';

@Component({
  selector: 'app-test-case-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './test-case-form.component.html'
})
export class TestCaseFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(TestCaseService);
  private projectService = inject(ProjectService);
  private userService = inject(UserService);
  private requirementService = inject(RequirementService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  casoId?: number;
  proyectos: Proyecto[] = [];
  usuarios: Usuario[] = [];
  requerimientos: Requerimiento[] = [];
  guardando = false;
  error = '';

  readonly tipos      = Object.values(TipoPrueba);
  readonly prioridades= Object.values(PrioridadCasoPrueba);
  readonly estadosQA  = Object.values(EstadoCasoPrueba);
  readonly resultados = Object.values(ResultadoCasoPrueba);

  form = this.fb.group({
    codigo:            [''],
    nombre:            ['', Validators.required],
    proyectoId:        [null as number | null, Validators.required],
    claveProyecto:     [''],

    tipo:              [TipoPrueba.FUNCIONAL, Validators.required],
    descripcion:       ['', Validators.required],

    pasos:             ['', Validators.required],
    resultadoEsperado: ['', Validators.required],

    prioridad:         [PrioridadCasoPrueba.MEDIA, Validators.required],
    estado:            [EstadoCasoPrueba.PENDIENTE, Validators.required],
    resultado:         [ResultadoCasoPrueba.SIN_EJECUTAR],

    responsableQaId:   [null as number | null],
    fechaEjecucion:    [''],
    evidenciaUrl:      [''],
    observaciones:     [''],

    requerimientoRf:   [''],
    requerimientoId:   [null as number | null]
  });

  get esEdicion(): boolean { return !!this.casoId; }

  ngOnInit(): void {
    this.projectService.getAll({ porPagina: 200 }).subscribe(r => { this.proyectos = r.datos; });
    this.userService.getAll({ activo: true, porPagina: 200 }).subscribe(r => { this.usuarios = r.datos; });

    this.form.get('proyectoId')?.valueChanges.subscribe(id => {
      const p = this.proyectos.find(x => x.id === id);
      if (p) this.form.patchValue({ claveProyecto: p.codigo }, { emitEvent: false });

      // Recargar requerimientos al cambiar de proyecto
      this.requerimientos = [];
      this.form.patchValue({ requerimientoRf: '', requerimientoId: null }, { emitEvent: false });
      if (id) {
        this.requirementService.getByProyecto(id).subscribe(r => { this.requerimientos = r; });
      }
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.casoId = Number(id);
      this.service.getById(this.casoId).subscribe(c => {
        // Cargar requerimientos del proyecto antes de patchValue
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
      });
    }
  }

  /** Cuando el usuario escoge o escribe en el campo requerimientoRf */
  onRequerimientoChange(event: Event): void {
    const codigo = (event.target as HTMLInputElement).value.trim();
    const match = this.requerimientos.find(r => r.codigo === codigo);
    this.form.patchValue({ requerimientoId: match?.id ?? null }, { emitEvent: false });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.guardando = true;

    const val = this.form.value;
    const payload = {
      ...val,
      pasos: this.textoPasos(val.pasos as string)
    };

    const op = this.esEdicion
      ? this.service.update(this.casoId!, payload as any)
      : this.service.create(payload as any);

    op.subscribe({
      next: (c) => this.router.navigate(['/casos-prueba', c.id]),
      error: (err) => { this.error = err.error?.message || 'Error al guardar'; this.guardando = false; }
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
