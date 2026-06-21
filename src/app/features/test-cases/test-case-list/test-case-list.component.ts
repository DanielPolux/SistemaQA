import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TestCaseService } from '../../../core/services/test-case.service';
import { ProjectService } from '../../../core/services/project.service';
import { RequirementService } from '../../../core/services/requirement.service';
import { AuthService } from '../../../core/services/auth.service';
import { EjecucionService } from '../../../core/services/ejecucion.service';
import { CicloService } from '../../../core/services/ciclo.service';
import { CicloPrueba } from '../../../core/models';
import { UserService } from '../../../core/services/user.service';
import { AuditoriaService, AuditoriaRegistro } from '../../../core/services/auditoria.service';
import {
  CasoPrueba, EstadoCasoPrueba, ResultadoCasoPrueba, TipoPrueba,
  Proyecto, Requerimiento, Usuario, Rol, EstadoProyecto,
  ResultadoEjecucion, AmbienteEjecucion,
  SeveridadDefecto, PrioridadDefecto, EstadoDefecto
} from '../../../core/models';

interface PasoEjecucion {
  orden: number;
  descripcion: string;
  resultadoEsperado: string;
  estado: 'pendiente' | 'ok' | 'no_ok';
  imagenes: string[];
}

@Component({
  selector: 'app-test-case-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  templateUrl: './test-case-list.component.html'
})
export class TestCaseListComponent implements OnInit, OnDestroy {
  private service            = inject(TestCaseService);
  private route              = inject(ActivatedRoute);
  private projectService     = inject(ProjectService);
  private requirementService = inject(RequirementService);
  private ejecucionService   = inject(EjecucionService);
  private cicloService       = inject(CicloService);
  private userService        = inject(UserService);
  private auditoriaService   = inject(AuditoriaService);
  private fb                 = inject(FormBuilder);
  auth                       = inject(AuthService);

  casos: CasoPrueba[]            = [];
  proyectos: Proyecto[]          = [];
  requerimientos: Requerimiento[] = [];
  usuarios: Usuario[]            = [];
  desarrolladores: Usuario[]     = [];

  total     = 0;
  pagina    = 1;
  porPagina = 10;
  cargando  = false;

  private proyectoSubject = new Subject<string>();
  private sub!: Subscription;

  // Filtros
  proyectoId?: number;
  proyectoFiltroTexto      = '';
  requerimientoFiltroTexto = '';
  requerimientoFiltroId?: number;
  estadoFiltro    = '';
  tipoFiltro      = '';
  resultadoFiltro = '';
  busqueda        = '';

  readonly estadosQA  = Object.values(EstadoCasoPrueba);
  readonly tipos      = Object.values(TipoPrueba);
  readonly resultados = Object.values(ResultadoCasoPrueba);
  readonly resultadosEjecucion = Object.values(ResultadoEjecucion);
  readonly ambientes           = Object.values(AmbienteEjecucion);
  readonly severidades         = Object.values(SeveridadDefecto);
  readonly prioridades         = Object.values(PrioridadDefecto);

  readonly resultadoClase: Record<string, string> = {
    [ResultadoCasoPrueba.APROBADO]:    'badge-resultado-aprobado',
    [ResultadoCasoPrueba.FALLIDO]:     'badge-resultado-fallido',
    [ResultadoCasoPrueba.BLOQUEADO]:   'badge-resultado-bloqueado',
    [ResultadoCasoPrueba.SIN_EJECUTAR]:'badge-resultado-no-ejecutado',
    [ResultadoCasoPrueba.OMITIDO]:     'badge-resultado-omitido'
  };

  readonly estadoQAClase: Record<string, string> = {
    [EstadoCasoPrueba.PENDIENTE]:    'badge-qa-pendiente',
    [EstadoCasoPrueba.EN_EJECUCION]: 'badge-qa-en-ejecucion',
    [EstadoCasoPrueba.EJECUTADO]:    'badge-qa-completado',
    [EstadoCasoPrueba.BLOQUEADO]:    'badge-qa-bloqueado',
    [EstadoCasoPrueba.OMITIDO]:      'badge-qa-omitido'
  };

  readonly resultadoEjecucionClase: Record<string, string> = {
    [ResultadoEjecucion.APROBADO]:  'badge-resultado-aprobado',
    [ResultadoEjecucion.FALLIDO]:   'badge-resultado-fallido',
    [ResultadoEjecucion.BLOQUEADO]: 'badge-resultado-bloqueado',
    [ResultadoEjecucion.OMITIDO]:   'badge-resultado-no-ejecutado',
  };

  // ─── Modal confirmación eliminar ─────────────────────────────────────────
  modalConfirmarAbierto = signal(false);
  confirmPendiente: { id: number; nombre: string; bloqueado: boolean; mensaje?: string } | null = null;

  abrirConfirmarEliminar(id: number, nombre: string, totalDefectos: number): void {
    if (totalDefectos > 0) {
      this.confirmPendiente = {
        id, nombre, bloqueado: true,
        mensaje: `Este caso tiene ${totalDefectos} defecto(s) asociado(s) y no puede eliminarse.`
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

  // ─── Popup error sin ciclo ───────────────────────────────────────────────
  popupSinCicloAbierto = signal(false);
  popupSinCicloMsg     = '';

  abrirPopupSinCiclo(msg: string): void {
    this.popupSinCicloMsg = msg;
    this.popupSinCicloAbierto.set(true);
  }

  cerrarPopupSinCiclo(): void {
    this.popupSinCicloAbierto.set(false);
  }

  // ─── Modal de ejecución ──────────────────────────────────────────────────
  modalAbierto      = signal(false);
  guardandoEjec     = signal(false);
  errorEjecucion    = '';
  ejecucionExito    = signal<string | null>(null);
  casoSeleccionado: CasoPrueba | null = null;
  cicloActivo: CicloPrueba | null = null;
  pasosEjecucion: PasoEjecucion[] = [];

  formEjecucion = {
    cicloPrueba:          '',
    testerId:             0,
    ambiente:             '' as AmbienteEjecucion | '',
    version:              '',
    resultado:            '' as ResultadoEjecucion | '',
    resultadoObtenido:    '',
    evidenciaUrl:         '',
    observaciones:        '',
    // Campos del defecto (visibles cuando resultado = Fallido)
    defTitulo:            '',
    defDescripcion:       '',
    defPasosReproduccion: '',
    defResultadoEsperado: '',
    defSeveridad:         '' as SeveridadDefecto | '',
    defPrioridad:         '' as PrioridadDefecto | '',
    defAsignadoA:         null as number | null,
  };

  // ─── Modal Ver ───────────────────────────────────────────────────────────
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
      this.casoVer = { ...c, pasosTexto: this.pasosATexto((c as any).pasos) };
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

  // ─── Modal Editar ────────────────────────────────────────────────────────
  modalEditarAbierto  = signal(false);
  guardandoEditar     = signal(false);
  errorEditar         = '';
  casoEditarId: number | null = null;
  requerimientosEditar: Requerimiento[] = [];

  readonly tiposForm      = Object.values(TipoPrueba);
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
        pasos:             this.pasosATexto((c as any).pasos),
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

    const val = this.formEditar.value;
    const payload = {
      ...val,
      pasos: this.textoPasos(val.pasos as string),
    };

    this.service.update(this.casoEditarId, payload as any).subscribe({
      next: () => {
        this.guardandoEditar.set(false);
        this.cerrarEditar();
        this.cargar();
      },
      error: (err) => {
        this.errorEditar = err.error?.message || 'Error al guardar';
        this.guardandoEditar.set(false);
      }
    });
  }

  ngOnInit(): void {
    this.sub = this.proyectoSubject.pipe(
      debounceTime(350),
      distinctUntilChanged(),
    ).subscribe(texto => this.aplicarFiltroProyecto(texto));

    this.projectService.getAll({ porPagina: 500 }).subscribe(r => {
      this.proyectos = r.datos;
      const qpId = this.route.snapshot.queryParams['proyectoId'];
      if (qpId) {
        this.proyectoId = Number(qpId);
        const p = this.proyectos.find(x => x.id === this.proyectoId);
        if (p) {
          this.proyectoFiltroTexto = p.codigo;
          this.requirementService.getByProyecto(this.proyectoId!).subscribe(reqs => {
            this.requerimientos = reqs;
          });
        }
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

    this.cargar();
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  // ─── Filtro de proyecto ──────────────────────────────────────────────────

  onProyectoInput(texto: string): void {
    this.proyectoFiltroTexto = texto;
    this.proyectoSubject.next(texto);
  }

  private aplicarFiltroProyecto(texto: string): void {
    const codigo    = texto.trim();
    const match     = this.proyectos.find(p => p.codigo === codigo);
    const anteriorId = this.proyectoId;
    this.proyectoId  = match?.id;

    if (this.proyectoId !== anteriorId) {
      this.requerimientos           = [];
      this.requerimientoFiltroTexto = '';
      this.requerimientoFiltroId    = undefined;
      if (this.proyectoId) {
        this.requirementService.getByProyecto(this.proyectoId).subscribe(r => {
          this.requerimientos = r;
        });
      }
    }
    this.buscar();
  }

  // ─── Filtro de requerimiento ─────────────────────────────────────────────

  onRequerimientoChange(event: Event): void {
    const codigo = (event.target as HTMLInputElement).value.trim();
    const match  = this.requerimientos.find(r => r.codigo === codigo);
    this.requerimientoFiltroId = match?.id;
    this.buscar();
  }

  limpiarFiltros(): void {
    this.proyectoId              = undefined;
    this.proyectoFiltroTexto     = '';
    this.requerimientoFiltroTexto= '';
    this.requerimientoFiltroId   = undefined;
    this.requerimientos          = [];
    this.estadoFiltro            = '';
    this.tipoFiltro              = '';
    this.resultadoFiltro         = '';
    this.busqueda                = '';
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
      porPagina:       this.porPagina
    }).subscribe({
      next: (res) => { this.casos = res.datos; this.total = res.total; this.cargando = false; },
      error: ()   => { this.cargando = false; }
    });
  }

  buscar(): void { this.pagina = 1; this.cargar(); }

  eliminar(id: number, nombre: string, totalDefectos: number): void {
    this.abrirConfirmarEliminar(id, nombre, totalDefectos);
  }

  // ─── Modal de ejecución ──────────────────────────────────────────────────

  abrirModalEjecucion(caso: CasoPrueba): void {
    const proyecto = this.proyectos.find(p => p.id === caso.proyectoId);

    if (proyecto && proyecto.estado !== EstadoProyecto.EN_EJECUCION) {
      this.abrirPopupSinCiclo(
        `El proyecto "${proyecto.nombre}" está en estado "${proyecto.estado}". ` +
        `Solo se pueden ejecutar casos de prueba cuando el proyecto está en estado "En Ejecución".`
      );
      return;
    }

    if (proyecto && (!proyecto.fechaInicioReal || !proyecto.fechaFinReal)) {
      this.abrirPopupSinCiclo(
        `El proyecto "${proyecto.nombre}" no tiene Fechas Reales de Entrega configuradas. ` +
        `Edita el proyecto e ingresa la Fecha Inicio Real y Fecha Fin Real antes de ejecutar casos de prueba.`
      );
      return;
    }

    this.cicloService.getActivoByProyecto(caso.proyectoId).subscribe(ciclo => {
      if (!ciclo) {
        this.abrirPopupSinCiclo(
          `El proyecto "${caso.proyectoNombre ?? 'seleccionado'}" no tiene un ciclo de prueba activo. ` +
          `Ve a Ciclos de Prueba, crea un nuevo ciclo o reactiva uno existente, y luego registra la ejecución.`
        );
        return;
      }
      this.cicloActivo = ciclo;
      this.casoSeleccionado = caso;
      this.pasosEjecucion = ((caso as any).pasos ?? []).map((p: any) => ({
        orden: p.orden,
        descripcion: p.descripcion,
        resultadoEsperado: p.resultadoEsperado ?? '',
        estado: 'pendiente' as const,
        imagenes: [] as string[],
      }));
      const userId    = this.auth.usuarioActual()?.id ?? 0;
      const pasosTexto = this.pasosATexto((caso as any).pasos ?? []);
      this.formEjecucion = {
        cicloPrueba:          '',
        testerId:             userId,
        ambiente:             '' as AmbienteEjecucion | '',
        version:              '',
        resultado:            '' as ResultadoEjecucion | '',
        resultadoObtenido:    '',
        evidenciaUrl:         '',
        observaciones:        '',
        defTitulo:            '',
        defDescripcion:       (caso as any).descripcion ?? '',
        defPasosReproduccion: pasosTexto,
        defResultadoEsperado: (caso as any).resultadoEsperado ?? '',
        defSeveridad:         '' as SeveridadDefecto | '',
        defPrioridad:         '' as PrioridadDefecto | '',
        defAsignadoA:         null,
      };
      this.ejecucionService.getByCasoPrueba(caso.id).subscribe(ejecuciones => {
        this.formEjecucion.version = String(ejecuciones.length + 1);
      });
      this.ejecucionExito.set(null);
      this.errorEjecucion = '';
      this.modalAbierto.set(true);
    });
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.casoSeleccionado = null;
    this.errorEjecucion = '';
    this.ejecucionExito.set(null);
    this.pasosEjecucion = [];
  }

  marcarPaso(idx: number, estado: 'ok' | 'no_ok'): void {
    this.pasosEjecucion[idx].estado =
      this.pasosEjecucion[idx].estado === estado ? 'pendiente' : estado;
    this.sincronizarResultadoDesdePasos();
  }

  limpiarImagenPaso(pasoIdx: number, imgIdx: number): void {
    const imgs = [...this.pasosEjecucion[pasoIdx].imagenes];
    imgs.splice(imgIdx, 1);
    this.pasosEjecucion[pasoIdx] = { ...this.pasosEjecucion[pasoIdx], imagenes: imgs };
  }

  pegarImagenPaso(idx: number, event: ClipboardEvent): void {
    event.preventDefault();
    const items = event.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) this.leerArchivoImagenPaso(file, idx);
        break;
      }
    }
  }

  onFileSelectedPaso(event: Event, idx: number): void {
    const files = (event.target as HTMLInputElement).files;
    if (files) Array.from(files).forEach(f => { if (f.type.startsWith('image/')) this.leerArchivoImagenPaso(f, idx); });
    (event.target as HTMLInputElement).value = '';
  }

  private leerArchivoImagenPaso(file: File, idx: number): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imagenes = [...this.pasosEjecucion[idx].imagenes, e.target?.result as string];
      this.pasosEjecucion[idx] = { ...this.pasosEjecucion[idx], imagenes };
    };
    reader.readAsDataURL(file);
  }

  private sincronizarResultadoDesdePasos(): void {
    const pasos = this.pasosEjecucion;
    if (!pasos.length) return;
    const hayNoOk  = pasos.some(p => p.estado === 'no_ok');
    const todosOk  = pasos.every(p => p.estado === 'ok');
    if (hayNoOk) {
      this.formEjecucion.resultado = ResultadoEjecucion.FALLIDO;
      this.formEjecucion.defPasosReproduccion = pasos
        .filter(p => p.estado === 'no_ok')
        .map(p => `${p.orden}. ${p.descripcion}`)
        .join('\n');
    } else if (todosOk) {
      this.formEjecucion.resultado = ResultadoEjecucion.APROBADO;
    }
  }

  get esFallido(): boolean {
    return this.formEjecucion.resultado === ResultadoEjecucion.FALLIDO;
  }

  guardarEjecucion(): void {
    const f = this.formEjecucion;
    if (!f.ambiente || !f.resultado || !f.resultadoObtenido || !f.testerId) {
      this.errorEjecucion = 'Completa los campos obligatorios: Ambiente, Tester, Resultado y Resultado Obtenido.';
      return;
    }
    if (this.esFallido && (!f.defTitulo.trim() || !f.defDescripcion.trim() || !f.defPasosReproduccion.trim() || !f.defSeveridad || !f.defPrioridad)) {
      this.errorEjecucion = 'Para resultado Fallido completa: Título, Descripción, Pasos para reproducir, Severidad y Prioridad.';
      return;
    }
    this.errorEjecucion = '';
    this.guardandoEjec.set(true);

    const caso     = this.casoSeleccionado!;
    const esFallido = this.esFallido;

    const ejPayload: any = {
      casoPruebaId:     caso.id,
      proyectoId:       caso.proyectoId,
      cicloPrueba:      f.cicloPrueba        || undefined,
      testerId:         f.testerId,
      ambiente:         f.ambiente,
      version:          f.version,
      resultado:        f.resultado,
      resultadoObtenido:f.resultadoObtenido,
      evidenciaUrl:     f.evidenciaUrl        || undefined,
      desarrolladorId:  esFallido && f.defAsignadoA ? f.defAsignadoA : undefined,
      observaciones:    f.observaciones       || undefined,
      ...(esFallido && {
        defectoData: {
          titulo:            f.defTitulo.trim(),
          descripcion:       f.defDescripcion.trim() || caso.descripcion,
          pasosReproduccion: f.defPasosReproduccion.trim(),
          resultadoObtenido: f.resultadoObtenido,
          resultadoEsperado: f.defResultadoEsperado.trim() || (caso as any).resultadoEsperado,
          ambiente:          f.ambiente,
          version:           f.version,
          severidad:         f.defSeveridad,
          prioridad:         f.defPrioridad,
          asignadoA:         f.defAsignadoA ?? undefined,
        },
      }),
    };

    this.ejecucionService.create(ejPayload).subscribe({
      next: (res: any) => {
        this.guardandoEjec.set(false);
        this.cargar();
        if (esFallido) {
          const codigoDefecto = res?.defecto?.codigoProyecto ?? res?.defecto?.codigo ?? 'INC-???';
          this.ejecucionExito.set(codigoDefecto);
        } else {
          this.cerrarModal();
        }
      },
      error: (err: any) => {
        this.guardandoEjec.set(false);
        this.errorEjecucion = 'Error al registrar la ejecución: ' + (err?.error?.message ?? 'Error desconocido');
      }
    });
  }

  get totalPaginas(): number { return Math.ceil(this.total / this.porPagina); }

  nombreUsuario(u: Usuario): string {
    return `${u.nombre} ${u.apellido}`;
  }

  private pasosATexto(pasos: any[]): string {
    if (!pasos?.length) return '';
    return pasos.map((p: any) => `${p.orden}. ${p.descripcion}`).join('\n');
  }

  private textoPasos(texto: string): any[] {
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
}
