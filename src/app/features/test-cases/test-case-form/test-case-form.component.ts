import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TestCaseService } from '../../../core/services/test-case.service';
import { ProjectService } from '../../../core/services/project.service';
import { RequirementService } from '../../../core/services/requirement.service';
import { UserService } from '../../../core/services/user.service';
import {
  EstadoCasoPrueba, PrioridadCasoPrueba, TipoCasoPrueba,
  Proyecto, Requerimiento, Usuario
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
  private reqService = inject(RequirementService);
  private userService = inject(UserService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  casoId?: number;
  proyectos: Proyecto[] = [];
  requerimientos: Requerimiento[] = [];
  usuarios: Usuario[] = [];
  guardando = false;
  error = '';

  readonly tipos = Object.values(TipoCasoPrueba);
  readonly prioridades = Object.values(PrioridadCasoPrueba);
  readonly estados = Object.values(EstadoCasoPrueba);

  form = this.fb.group({
    proyectoId: [null as number | null, Validators.required],
    requerimientoId: [null as number | null],
    codigo: ['', Validators.required],
    titulo: ['', Validators.required],
    descripcion: ['', Validators.required],
    precondiciones: [''],
    resultadoEsperado: ['', Validators.required],
    tipo: [TipoCasoPrueba.FUNCIONAL, Validators.required],
    prioridad: [PrioridadCasoPrueba.MEDIA, Validators.required],
    estado: [EstadoCasoPrueba.PENDIENTE, Validators.required],
    asignadoA: [null as number | null],
    pasos: this.fb.array([this.crearPaso()])
  });

  get pasos(): FormArray { return this.form.get('pasos') as FormArray; }
  get esEdicion(): boolean { return !!this.casoId; }

  crearPaso() {
    return this.fb.group({
      orden: [1],
      descripcion: ['', Validators.required],
      resultadoEsperado: ['', Validators.required]
    });
  }

  agregarPaso(): void {
    const paso = this.crearPaso();
    paso.patchValue({ orden: this.pasos.length + 1 });
    this.pasos.push(paso);
  }

  eliminarPaso(i: number): void {
    if (this.pasos.length > 1) this.pasos.removeAt(i);
  }

  ngOnInit(): void {
    this.projectService.getAll({ porPagina: 100 }).subscribe(r => { this.proyectos = r.datos; });
    this.userService.getAll({ activo: true, porPagina: 100 }).subscribe(r => { this.usuarios = r.datos; });

    this.form.get('proyectoId')?.valueChanges.subscribe(id => {
      if (id) this.reqService.getByProyecto(id).subscribe(r => { this.requerimientos = r; });
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.casoId = Number(id);
      this.service.getById(this.casoId).subscribe(c => {
        while (this.pasos.length < c.pasos.length) this.pasos.push(this.crearPaso());
        this.form.patchValue(c as any);
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
