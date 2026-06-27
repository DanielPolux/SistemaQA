import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TestCaseService } from '../../../core/services/test-case.service';
import { ProjectService } from '../../../core/services/project.service';
import { RequirementService } from '../../../core/services/requirement.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { AuditoriaService, AuditoriaRegistro } from '../../../core/services/auditoria.service';
import { EjecucionModalService } from './ejecucion-modal.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  CasoPrueba, EstadoCasoPrueba, ResultadoCasoPrueba, TipoPrueba,
  Proyecto, Requerimiento, Usuario, Rol,
  ResultadoEjecucion, AmbienteEjecucion,
  SeveridadDefecto, PrioridadDefecto,
} from '../../../core/models';

@Component({
  selector: 'app-test-case-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  templateUrl: './test-case-list.component.html',
  providers: [EjecucionModalService],
})
export class TestCaseListComponent implements OnInit {
  private service            = inject(TestCaseService);
  private route              = inject(ActivatedRoute);
  private projectService     = inject(ProjectService);
  private requirementService = inject(RequirementService);
  private userService        = inject(UserService);
  private auditoriaService   = inject(AuditoriaService);
  private fb                 = inject(FormBuilder);
  private toast              = inject(ToastService);
  auth                       = inject(AuthService);
  ejecucion                  = inject(EjecucionModalService);

  casos: CasoPrueba[]             = [];
  proyectos: Proyecto[]           = [];
  requerimientos: Requerimiento[] = [];
  usuarios: Usuario[]             = [];
  desarrolladores: Usuario[]      = [];

  total     = 0;
  pagina    = 1;
  porPagina = 10;
  cargando  = false;

  // Filtros
  proyectoId?: number;
  requerimientoFiltroTexto = '';
  requerimientoFiltroId?: number;
  estadoFiltro    = '';
  tipoFiltro      = '';
  resultadoFiltro = '';
  busqueda        = '';

  readonly estadosQA           = Object.values(EstadoCasoPrueba);
  readonly tipos               = Object.values(TipoPrueba);
  readonly resultados          = Object.values(ResultadoCasoPrueba);
  readonly resultadosEjecucion = Object.values(ResultadoEjecucion);
  readonly ambientes           = Object.values(AmbienteEjecucion);
  readonly severidades         = Object.values(SeveridadDefecto);
  readonly prioridades         = Object.values(PrioridadDefecto);

  readonly resultadoClase: Record<string, string> = {
    [ResultadoCasoPrueba.APROBADO]:     'badge-resultado-aprobado',
    [ResultadoCasoPrueba.FALLIDO]:      'badge-resultado-fallido',
    [ResultadoCasoPrueba.BLOQUEADO]:    'badge-resultado-bloqueado',
    [ResultadoCasoPrueba.SIN_EJECUTAR]: 'badge-resultado-no-ejecutado',
    [ResultadoCasoPrueba.OMITIDO]:      'badge-resultado-omitido',
  };

  readonly estadoQAClase: Record<string, string> = {
    [EstadoCasoPrueba.PENDIENTE]:    'badge-qa-pendiente',
    [EstadoCasoPrueba.EN_EJECUCION]: 'badge-qa-en-ejecucion',
    [EstadoCasoPrueba.EJECUTADO]:    'badge-qa-completado',
    [EstadoCasoPrueba.BLOQUEADO]:    'badge-qa-bloqueado',
    [EstadoCasoPrueba.OMITIDO]:      'badge-qa-omitido',
  };

  // ─── Modal confirmación eliminar ──────────────────────────────────────────
  modalConfirmarAbierto = signal(false);
  confirmPendiente: { id: number; nombre: string; bloqueado: boolean; mensaje?: string } | null = null;

  abrirConfirmarEliminar(id: number, nombre: string, totalDefectos: number): void {
    if (totalDefectos > 0) {
      this.confirmPendiente = {
        id, nombre, bloqueado: true,
        mensaje: `Este caso tiene ${totalDefectos} defecto(s) asociado(s) y no puede eliminarse.`,
      };
    } else {
      this.confirmPendiente = { id, nombre, bloqueado: false };
    }
    this.modalConfirmarAbierto.set(true);
  }

  cerrarConfirmar(): void {
    this.modalConfirmarAbierto.set(false);
    this.confirmPendiente = null;
  }

  confirmarEliminar(): void {
    if (!this.confirmPendiente || this.confirmPendiente.bloqueado) return;
    this.service.delete(this.confirmPendiente.id).subscribe({ next: () => { this.cerrarConfirmar(); this.cargar(); } });
  }

  eliminar(id: number, nombre: string, totalDefectos: number): void {
    this.abrirConfirmarEliminar(id, nombre, totalDefectos);
  }

  // ─── Modal Ver ────────────────────────────────────────────────────────────
  modalVerAbierto = signal(false);
  casoVer: any = null;
  cargandoVer = signal(false);
  auditoriaVer: AuditoriaRegistro[] = [];

  abrirVer(id: number): void {
    this.casoVer = null;
    this.auditoriaVer = [];
    this.cargandoVer.set(true);
    this.modalVerAbierto.set(true);
    this.service.getById(id).subscribe(c => {
      this.casoVer = { ...c, pasosTexto: pasosATexto((c as any).pasos) };
      this.cargandoVer.set(false);
    });
    this.auditoriaService.getByCasoPrueba(id).subscribe(registros => {
      this.auditoriaVer = registros;
    });
  }

  cerrarVer(): void {
    this.modalVerAbierto.set(false);
    this.casoVer = null;
    this.auditoriaVer = [];
  }

  // ─── Modal Editar ─────────────────────────────────────────────────────────
  modalEditarAbierto = signal(false);
  guardandoEditar    = signal(false);
  errorEditar        = '';
  casoEditarId: number | null = null;
  requerimientosEditar: Requerimiento[] = [];

  readonly tiposForm       = Object.values(TipoPrueba);
  readonly prioridadesForm = Object.values(ResultadoCasoPrueba);

  formEditar = this.fb.group({
    codigo:            [''],
    nombre:            ['', Validators.required],
    proyectoId:        [null as number | null, Validators.required],
    claveProyecto:     [''],
    tipo:              ['', Validators.required],
    descripcion:       ['', Validators.required],
    pasos:             ['', Validators.required],
    resultadoEsperado: ['', Validators.required],
    prioridad:         ['', Validators.required],
    requerimientoRf:   [''],
    requerimientoId:   [null as number | null],
  });

  abrirEditar(id: number): void {
    this.casoEditarId = id;
    this.errorEditar = '';
    this.requerimientosEditar = [];
    this.formEditar.reset();
    this.modalEditarAbierto.set(true);
    this.service.getById(id).subscribe(c => {
      this.formEditar.patchValue({
        codigo:            (c as any).codigo ?? '',
        nombre:            c.nombre,
        proyectoId:        c.proyectoId,
        claveProyecto:     (c as any).claveProyecto ?? '',
        tipo:              (c as any).tipo,
        descripcion:       (c as any).descripcion,
        pasos:             pasosATexto((c as any).pasos),
        resultadoEsperado: (c as any).resultadoEsperado,
        prioridad:         (c as any).prioridad,
        requerimientoRf:   (c as any).requerimientoRf ?? '',
        requerimientoId:   (c as any).requerimientoId ?? null,
      });
      if (c.proyectoId) {
        this.requirementService.getByProyecto(c.proyectoId).subscribe(reqs => {
          this.requerimientosEditar = reqs;
        });
      }
    });
  }

  cerrarEditar(): void {
    this.modalEditarAbierto.set(false);
    this.formEditar.reset();
    this.casoEditarId = null;
    this.errorEditar = '';
  }

  onRequerimientoChangeEditar(event: Event): void {
    const codigo = (event.target as HTMLInputElement).value.trim();
    const match  = this.requerimientosEditar.find(r => r.codigo === codigo);
    this.formEditar.patchValue({ requerimientoId: match?.id ?? null }, { emitEvent: false });
  }

  guardarEditar(): void {
    if (this.formEditar.invalid || !this.casoEditarId) return;
    this.guardandoEditar.set(true);
    this.errorEditar = '';
    const val     = this.formEditar.value;
    const payload = { ...val, pasos: textoPasos(val.pasos as string) };
    this.service.update(this.casoEditarId, payload as any).subscribe({
      next: () => {
        this.guardandoEditar.set(false);
        this.cerrarEditar();
        this.cargar();
      },
      error: (err) => {
        this.errorEditar = err.error?.message || 'Error al guardar';
        this.guardandoEditar.set(false);
      },
    });
  }

  // ─── Modal de ejecución (delegado al servicio) ────────────────────────────
  guardarEjecucion(): void {
    this.ejecucion.guardarEjecucion(() => this.cargar());
  }

  ngOnInit(): void {
    this.projectService.getAll({ porPagina: 500 }).subscribe(r => {
      this.proyectos = r.datos;
      const qpId = this.route.snapshot.queryParams['proyectoId'];
      if (qpId) {
        this.proyectoId = Number(qpId);
        this.requirementService.getByProyecto(this.proyectoId!).subscribe(reqs => {
          this.requerimientos = reqs;
        });
        this.cargar();
      }
    });
    this.userService.getAll({ porPagina: 500 }).subscribe(r => {
      this.usuarios = r.datos;
    });
    this.userService.getAll({ rol: Rol.DEVELOPER, activo: true, porPagina: 200 }).subscribe(r => {
      this.desarrolladores = r.datos;
    });

    this.formEditar.get('proyectoId')?.valueChanges.subscribe(id => {
      this.requerimientosEditar = [];
      this.formEditar.patchValue({ requerimientoRf: '', requerimientoId: null }, { emitEvent: false });
      if (id) {
        this.requirementService.getByProyecto(id).subscribe(r => { this.requerimientosEditar = r; });
      }
    });
  }

  onProyectoChange(): void {
    this.requerimientos           = [];
    this.requerimientoFiltroTexto = '';
    this.requerimientoFiltroId    = undefined;
    if (this.proyectoId) {
      this.requirementService.getByProyecto(this.proyectoId).subscribe(r => {
        this.requerimientos = r;
      });
    }
    this.buscar();
  }

  onRequerimientoChange(event: Event): void {
    const codigo = (event.target as HTMLInputElement).value.trim();
    const match  = this.requerimientos.find(r => r.codigo === codigo);
    this.requerimientoFiltroId = match?.id;
    this.buscar();
  }

  limpiarFiltros(): void {
    this.proyectoId               = undefined;
    this.requerimientoFiltroTexto = '';
    this.requerimientoFiltroId    = undefined;
    this.requerimientos           = [];
    this.estadoFiltro             = '';
    this.tipoFiltro               = '';
    this.resultadoFiltro          = '';
    this.busqueda                 = '';
    this.buscar();
  }

  cargar(): void {
    this.cargando = true;
    this.service.getAll({
      proyectoId:      this.proyectoId,
      requerimientoId: this.requerimientoFiltroId,
      estado:          this.estadoFiltro    || undefined,
      tipo:            this.tipoFiltro      || undefined,
      resultado:       this.resultadoFiltro || undefined,
      busqueda:        this.busqueda        || undefined,
      pagina:          this.pagina,
      porPagina:       this.porPagina,
    }).subscribe({
      next: (res) => {
        this.casos = res.datos; this.total = res.total; this.cargando = false;
        if (res.datos.length === 0 && this.pagina > 1) { this.pagina = Math.max(1, this.totalPaginas); this.cargar(); }
      },
      error: ()   => { this.cargando = false; this.toast.error('Error al cargar casos de prueba'); },
    });
  }

  buscar(): void { this.pagina = 1; this.cargar(); }
  cambiarPagina(p: number): void { this.pagina = p; this.cargar(); }

  get totalPaginas(): number { return Math.ceil(this.total / this.porPagina); }
  get paginas(): number[] { return Array.from({ length: this.totalPaginas }, (_, i) => i + 1); }

  nombreUsuario(u: Usuario): string {
    return `${u.nombre} ${u.apellido}`;
  }
}

function pasosATexto(pasos: any[]): string {
  if (!pasos?.length) return '';
  return pasos.map((p: any) => `${p.orden}. ${p.descripcion}`).join('\n');
}

function textoPasos(texto: string): any[] {
  if (!texto?.trim()) return [];
  return texto
    .split('\n')
    .filter(l => l.trim())
    .map((l, idx) => ({
      orden: idx + 1,
      descripcion: l.replace(/^\d+\.\s*/, '').trim(),
      resultadoEsperado: '',
    }));
}
