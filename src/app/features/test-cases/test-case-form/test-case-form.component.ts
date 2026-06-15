import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TestCaseService } from '../../../core/services/test-case.service';
import { ProjectService } from '../../../core/services/project.service';
import { UserService } from '../../../core/services/user.service';
import {
  EstadoQA, PrioridadCasoPrueba, ResultadoCasoPrueba, TipoPrueba,
  Proyecto, Usuario
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
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  casoId?: number;
  proyectos: Proyecto[] = [];
  usuarios: Usuario[] = [];
  guardando = false;
  error = '';

  readonly tipos = Object.values(TipoPrueba);
  readonly prioridades = Object.values(PrioridadCasoPrueba);
  readonly estadosQA = Object.values(EstadoQA);
  readonly resultados = Object.values(ResultadoCasoPrueba);

  form = this.fb.group({
    // Identificación
    codigoCP: [''],
    nombreCasoPrueba: ['', Validators.required],
    proyectoId: [null as number | null, Validators.required],
    claveProyecto: [''],

    // Tipo y descripción
    tipoPrueba: [TipoPrueba.FUNCIONAL, Validators.required],
    descripcionCasoPrueba: ['', Validators.required],

    // Pasos y resultado
    pasosDePrueba: ['', Validators.required],
    resultadoEsperado: ['', Validators.required],

    // Clasificación
    prioridad: [PrioridadCasoPrueba.MEDIA, Validators.required],
    estadoQA: [EstadoQA.PENDIENTE, Validators.required],
    resultado: [ResultadoCasoPrueba.NO_EJECUTADO],

    // Ejecución
    responsableQAId: [null as number | null],
    fechaEjecucion: [''],
    evidenciaUrl: [''],
    observaciones: [''],

    // Requerimiento
    requerimientoRF: ['', Validators.required]
  });

  get esEdicion(): boolean { return !!this.casoId; }

  ngOnInit(): void {
    this.projectService.getAll({ porPagina: 200 }).subscribe(r => { this.proyectos = r.datos; });
    this.userService.getAll({ activo: true, porPagina: 200 }).subscribe(r => { this.usuarios = r.datos; });

    // Auto-completar ClaveProyecto al seleccionar proyecto
    this.form.get('proyectoId')?.valueChanges.subscribe(id => {
      const p = this.proyectos.find(x => x.id === id);
      if (p) this.form.patchValue({ claveProyecto: p.codigo }, { emitEvent: false });
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.casoId = Number(id);
      this.service.getById(this.casoId).subscribe(c => {
        this.form.patchValue({
          ...c,
          fechaEjecucion: c.fechaEjecucion
            ? new Date(c.fechaEjecucion).toISOString().split('T')[0]
            : ''
        });
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.guardando = true;

    const op = this.esEdicion
      ? this.service.update(this.casoId!, this.form.value as any)
      : this.service.create(this.form.value as any);

    op.subscribe({
      next: (c) => this.router.navigate(['/casos-prueba', c.id]),
      error: (err) => { this.error = err.error?.message || 'Error al guardar'; this.guardando = false; }
    });
  }
}
