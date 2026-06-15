import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProjectService } from '../../../core/services/project.service';
import { UserService } from '../../../core/services/user.service';
import { EstadoProyecto, Usuario } from '../../../core/models';

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
  usuarios: Usuario[] = [];
  cargando = false;
  guardando = false;
  error = '';

  readonly estados = Object.values(EstadoProyecto);

  form = this.fb.group({
    // Identificación
    codigo: ['', [Validators.required, Validators.maxLength(30)]],
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    cliente: ['', Validators.required],
    sistema: [''],

    // Responsables
    responsableQAId: [null as number | null],
    jefeProyectoId: [null as number | null, Validators.required],
    jefeQAId: [null as number | null, Validators.required],

    // Estado y avance
    estado: [EstadoProyecto.POR_ESTIMAR, Validators.required],
    iteracion: [null as number | null],
    porcentajeAvance: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    horasQA: [null as number | null],

    // Fechas planificadas
    fechaEstimacion: [''],
    fechaInicioPlanificada: [''],
    fechaFinPlanificada: [''],

    // Fechas reales
    fechaInicioReal: [''],
    fechaFinReal: [''],

    // Otros
    repositorioUrl: [''],
    notas: ['']
  });

  get esEdicion(): boolean { return !!this.proyectoId; }

  ngOnInit(): void {
    this.userService.getAll({ activo: true, porPagina: 200 }).subscribe(r => { this.usuarios = r.datos; });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.proyectoId = Number(id);
      this.cargando = true;
      this.service.getById(this.proyectoId).subscribe({
        next: (p) => {
          this.form.patchValue({
            ...p,
            fechaEstimacion: this.toDateStr(p.fechaEstimacion),
            fechaInicioPlanificada: this.toDateStr(p.fechaInicioPlanificada),
            fechaFinPlanificada: this.toDateStr(p.fechaFinPlanificada),
            fechaInicioReal: this.toDateStr(p.fechaInicioReal),
            fechaFinReal: this.toDateStr(p.fechaFinReal)
          });
          this.cargando = false;
        }
      });
    }
  }

  private toDateStr(date?: Date): string {
    return date ? new Date(date).toISOString().split('T')[0] : '';
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.guardando = true;
    this.error = '';

    const op = this.esEdicion
      ? this.service.update(this.proyectoId!, this.form.value as any)
      : this.service.create(this.form.value as any);

    op.subscribe({
      next: (p) => this.router.navigate(['/proyectos', p.id]),
      error: (err) => {
        this.error = err.error?.message || 'Error al guardar el proyecto';
        this.guardando = false;
      }
    });
  }
}
