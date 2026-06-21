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
  proyectoFijo = false;
  proyectoNombre = '';
  guardando = false;
  error = '';

  guardadoId?: number;
  guardadoCodigo = '';
  guardadoTitulo = '';

  readonly tipos = Object.values(TipoRequerimiento);
  readonly prioridades = Object.values(PrioridadRequerimiento);
  readonly estados = Object.values(EstadoRequerimiento);

  form = this.fb.group({
    proyectoId: [null as number | null, Validators.required],
    codigo: [{ value: '', disabled: true }],
    titulo: ['', Validators.required],
    descripcion: ['', Validators.required],
    criteriosAceptacion: ['', Validators.required],
    tipo: [TipoRequerimiento.FUNCIONAL, Validators.required],
    prioridad: [PrioridadRequerimiento.MEDIA, Validators.required],
    estado: [EstadoRequerimiento.PENDIENTE, Validators.required]
  });

  get esEdicion(): boolean { return !!this.reqId; }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.reqId = Number(id);
      this.service.getById(this.reqId).subscribe(r => this.form.patchValue(r as any));
    }

    const qpProyecto = this.route.snapshot.queryParams['proyectoId'];

    // Cuando cambia el proyecto en el selector libre, previsualizar código
    this.form.get('proyectoId')?.valueChanges.subscribe(pid => {
      if (pid && !this.reqId) {
        this.cargarNextCodigo(pid);
      } else if (!pid && !this.reqId) {
        this.form.get('codigo')?.setValue('', { emitEvent: false });
      }
    });

    this.projectService.getAll({ porPagina: 200 }).subscribe(r => {
      this.proyectos = r.datos;
      if (qpProyecto && !this.reqId) {
        const pid = Number(qpProyecto);
        this.form.patchValue({ proyectoId: pid });
        this.form.get('proyectoId')?.disable();
        const p = this.proyectos.find(x => x.id === pid);
        this.proyectoNombre = p ? `${p.codigo} — ${p.nombre}` : String(pid);
        this.proyectoFijo = true;
        this.cargarNextCodigo(pid);
      }
    });
  }

  private cargarNextCodigo(proyectoId: number): void {
    this.service.getNextCodigo(proyectoId).subscribe(r => {
      this.form.get('codigo')?.setValue(r.codigo, { emitEvent: false });
    });
  }

  get proyectoIdActual(): number | null {
    return (this.form.getRawValue() as any).proyectoId ?? null;
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.guardando = true;
    const { codigo: _codigo, ...rest } = this.form.getRawValue();
    const payload = this.esEdicion ? this.form.getRawValue() : rest;
    const op = this.esEdicion
      ? this.service.update(this.reqId!, payload as any)
      : this.service.create(payload as any);

    op.subscribe({
      next: (req) => {
        if (this.esEdicion) {
          this.router.navigate(['/requerimientos'], {
            queryParams: this.proyectoIdActual ? { proyectoId: this.proyectoIdActual } : {}
          });
        } else {
          this.guardadoId     = req.id;
          this.guardadoCodigo = req.codigo;
          this.guardadoTitulo = req.titulo;
          this.guardando      = false;
        }
      },
      error: (err) => { this.error = err.error?.message || 'Error al guardar'; this.guardando = false; }
    });
  }
}
