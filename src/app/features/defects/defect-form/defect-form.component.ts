import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DefectService } from '../../../core/services/defect.service';
import { ProjectService } from '../../../core/services/project.service';
import { TestCaseService } from '../../../core/services/test-case.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  AmbienteDefecto, EstadoDefecto, EstadoDesarrollo, PrioridadDefecto, SeveridadDefecto,
  Proyecto, CasoPrueba, Usuario, Rol
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
  auth = inject(AuthService);

  defectoId?: number;
  proyectos: Proyecto[] = [];
  casosPrueba: CasoPrueba[] = [];
  usuarios: Usuario[] = [];
  guardando = false;
  error = '';

  casoFijo = false;
  proyectoNombreFijo = '';
  casoNombreFijo = '';

  readonly severidades       = Object.values(SeveridadDefecto);
  readonly prioridades       = Object.values(PrioridadDefecto);
  readonly estados           = Object.values(EstadoDefecto);
  readonly ambientes         = Object.values(AmbienteDefecto);
  readonly estadosDesarrollo = Object.values(EstadoDesarrollo);

  form = this.fb.group({
    proyectoId: [null as number | null, Validators.required],
    casoPruebaId: [null as number | null, Validators.required],
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
    asignadoA:              [null as number | null],
    estadoDesarrollo:       [null as EstadoDesarrollo | null],
    comentariosDesarrollo:  [null as string | null],
  });

  soloLectura = false;

  get esSoloDesarrollo(): boolean { return this.esEdicion && this.auth.esDesarrollador(); }

  get esEdicion(): boolean { return !!this.defectoId; }

  ngOnInit(): void {
    this.projectService.getAll({ porPagina: 100 }).subscribe(r => { this.proyectos = r.datos; });

    const base = { activo: true, porPagina: 100 };
    forkJoin([
      this.userService.getAll({ ...base, rol: Rol.DEVELOPER }),
      this.userService.getAll({ ...base, rol: Rol.PROJECT_MANAGER })
    ]).subscribe(([devs, pms]) => {
      this.usuarios = [...devs.datos, ...pms.datos]
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
    });

    this.form.get('proyectoId')?.valueChanges.subscribe(id => {
      if (id && !this.casoFijo) this.testCaseService.getByProyecto(id).subscribe(c => { this.casosPrueba = c; });
    });

    const casoPruebaIdParam = this.route.snapshot.queryParams['casoPruebaId'];
    if (casoPruebaIdParam) {
      const casoPruebaId = Number(casoPruebaIdParam);
      this.casoFijo = true;
      this.testCaseService.getById(casoPruebaId).subscribe(caso => {
        this.casoNombreFijo = `${caso.codigo ?? ''} - ${caso.nombre}`.replace(/^- /, '');
        this.proyectoNombreFijo = caso.proyectoNombre ?? '';

        const pasosTexto = Array.isArray(caso.pasos) && caso.pasos.length
          ? caso.pasos.map(p => `${p.orden}. ${p.descripcion}`).join('\n')
          : '';

        this.form.patchValue({
          casoPruebaId,
          proyectoId: caso.proyectoId,
          resultadoEsperado: caso.resultadoEsperado ?? '',
          pasosReproduccion: pasosTexto,
          descripcion: caso.descripcion ?? ''
        });
        this.form.get('casoPruebaId')?.disable();
        this.form.get('proyectoId')?.disable();
      });
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.defectoId = Number(id);
      this.service.getById(this.defectoId).subscribe(d => {
        this.form.patchValue(d as any);
        if (this.auth.esDesarrollador()) {
          const bloqueado = d.estado === EstadoDefecto.RESUELTO
                         || d.estado === EstadoDefecto.CERRADO
                         || d.estado === EstadoDefecto.EN_REVISION;
          if (bloqueado) {
            this.soloLectura = true;
            Object.keys(this.form.controls).forEach(key => this.form.get(key)?.disable());
          } else {
            const soloEditables = new Set(['estadoDesarrollo', 'comentariosDesarrollo']);
            Object.keys(this.form.controls).forEach(key => {
              if (!soloEditables.has(key)) this.form.get(key)?.disable();
            });
          }
        }
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.guardando = true;
    const payload = this.form.getRawValue();

    let op;
    if (this.esSoloDesarrollo) {
      if (!payload.estadoDesarrollo) {
        this.error = 'Debes seleccionar un Estado de Desarrollo (Atendido o No Aplica).';
        this.guardando = false;
        return;
      }
      op = this.service.actualizarEstadoDesarrollo(
        this.defectoId!,
        payload.estadoDesarrollo as any,
        payload.comentariosDesarrollo ?? undefined,
      );
    } else {
      op = this.esEdicion
        ? this.service.update(this.defectoId!, payload as any)
        : this.service.create(payload as any);
    }

    op.subscribe({
      next: (d) => this.router.navigate(['/defectos', d.id]),
      error: (err) => { this.error = err.error?.message || 'Error al guardar'; this.guardando = false; }
    });
  }
}
