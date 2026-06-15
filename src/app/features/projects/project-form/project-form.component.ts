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
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    codigo: ['', [Validators.required, Validators.maxLength(20)]],
    descripcion: ['', Validators.required],
    fechaInicio: ['', Validators.required],
    fechaFin: [''],
    estado: [EstadoProyecto.ACTIVO, Validators.required],
    responsableId: [null as number | null, Validators.required]
  });

  get esEdicion(): boolean { return !!this.proyectoId; }

  ngOnInit(): void {
    this.userService.getAll({ activo: true, porPagina: 100 }).subscribe(r => { this.usuarios = r.datos; });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.proyectoId = Number(id);
      this.cargando = true;
      this.service.getById(this.proyectoId).subscribe({
        next: (p) => {
          this.form.patchValue({
            ...p,
            fechaInicio: p.fechaInicio ? new Date(p.fechaInicio).toISOString().split('T')[0] : '',
            fechaFin: p.fechaFin ? new Date(p.fechaFin).toISOString().split('T')[0] : ''
          });
          this.cargando = false;
        }
      });
    }
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
