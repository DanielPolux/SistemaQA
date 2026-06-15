import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RequirementService } from '../../../core/services/requirement.service';
import { ProjectService } from '../../../core/services/project.service';
import {
  EstadoRequerimiento, PrioridadRequerimiento, TipoRequerimiento, Proyecto
} from '../../../core/models';

@Component({
  selector: 'app-requirement-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './requirement-form.component.html'
})
export class RequirementFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(RequirementService);
  private projectService = inject(ProjectService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  reqId?: number;
  proyectos: Proyecto[] = [];
  guardando = false;
  error = '';

  readonly tipos = Object.values(TipoRequerimiento);
  readonly prioridades = Object.values(PrioridadRequerimiento);
  readonly estados = Object.values(EstadoRequerimiento);

  form = this.fb.group({
    proyectoId: [null as number | null, Validators.required],
    codigo: ['', Validators.required],
    titulo: ['', Validators.required],
    descripcion: ['', Validators.required],
    criteriosAceptacion: ['', Validators.required],
    tipo: [TipoRequerimiento.FUNCIONAL, Validators.required],
    prioridad: [PrioridadRequerimiento.MEDIA, Validators.required],
    estado: [EstadoRequerimiento.PENDIENTE, Validators.required]
  });

  get esEdicion(): boolean { return !!this.reqId; }

  ngOnInit(): void {
    this.projectService.getAll({ porPagina: 100 }).subscribe(r => { this.proyectos = r.datos; });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.reqId = Number(id);
      this.service.getById(this.reqId).subscribe(r => this.form.patchValue(r as any));
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.guardando = true;
    const op = this.esEdicion
      ? this.service.update(this.reqId!, this.form.value as any)
      : this.service.create(this.form.value as any);

    op.subscribe({
      next: () => this.router.navigate(['/requerimientos']),
      error: (err) => { this.error = err.error?.message || 'Error al guardar'; this.guardando = false; }
    });
  }
}
