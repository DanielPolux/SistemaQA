import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DefectService } from '../../../core/services/defect.service';
import { ProjectService } from '../../../core/services/project.service';
import { TestCaseService } from '../../../core/services/test-case.service';
import { UserService } from '../../../core/services/user.service';
import {
  AmbienteDefecto, EstadoDefecto, PrioridadDefecto, SeveridadDefecto,
  Proyecto, CasoPrueba, Usuario
} from '../../../core/models';

@Component({
  selector: 'app-defect-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './defect-form.component.html'
})
export class DefectFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(DefectService);
  private projectService = inject(ProjectService);
  private testCaseService = inject(TestCaseService);
  private userService = inject(UserService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  defectoId?: number;
  proyectos: Proyecto[] = [];
  casosPrueba: CasoPrueba[] = [];
  usuarios: Usuario[] = [];
  guardando = false;
  error = '';

  readonly severidades = Object.values(SeveridadDefecto);
  readonly prioridades = Object.values(PrioridadDefecto);
  readonly estados = Object.values(EstadoDefecto);
  readonly ambientes = Object.values(AmbienteDefecto);

  form = this.fb.group({
    proyectoId: [null as number | null, Validators.required],
    casoPruebaId: [null as number | null, Validators.required],
    codigo: ['', Validators.required],
    titulo: ['', Validators.required],
    descripcion: ['', Validators.required],
    pasosReproduccion: ['', Validators.required],
    resultadoObtenido: ['', Validators.required],
    resultadoEsperado: ['', Validators.required],
    ambiente: [AmbienteDefecto.QA, Validators.required],
    version: ['', Validators.required],
    severidad: [SeveridadDefecto.MEDIO, Validators.required],
    prioridad: [PrioridadDefecto.MEDIA, Validators.required],
    estado: [EstadoDefecto.NUEVO, Validators.required],
    asignadoA: [null as number | null]
  });

  get esEdicion(): boolean { return !!this.defectoId; }

  ngOnInit(): void {
    this.projectService.getAll({ porPagina: 100 }).subscribe(r => { this.proyectos = r.datos; });
    this.userService.getAll({ activo: true, porPagina: 100 }).subscribe(r => { this.usuarios = r.datos; });

    this.form.get('proyectoId')?.valueChanges.subscribe(id => {
      if (id) this.testCaseService.getByProyecto(id).subscribe(c => { this.casosPrueba = c; });
    });

    const casoPruebaId = this.route.snapshot.queryParams['casoPruebaId'];
    if (casoPruebaId) this.form.patchValue({ casoPruebaId: Number(casoPruebaId) });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.defectoId = Number(id);
      this.service.getById(this.defectoId).subscribe(d => this.form.patchValue(d as any));
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.guardando = true;
    const op = this.esEdicion
      ? this.service.update(this.defectoId!, this.form.value as any)
      : this.service.create(this.form.value as any);

    op.subscribe({
      next: (d) => this.router.navigate(['/defectos', d.id]),
      error: (err) => { this.error = err.error?.message || 'Error al guardar'; this.guardando = false; }
    });
  }
}
