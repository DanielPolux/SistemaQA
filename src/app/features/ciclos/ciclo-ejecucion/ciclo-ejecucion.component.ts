import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { CicloService, CasoCiclo } from '../../../core/services/ciclo.service';
import { EjecucionService } from '../../../core/services/ejecucion.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { ProjectService } from '../../../core/services/project.service';
import { UploadService, Evidencia } from '../../../core/services/upload.service';
import { DefectService } from '../../../core/services/defect.service';
import { WordExportService } from '../../../core/services/word-export.service';
import {
  CicloPrueba, EstadoCiclo, EstadoProyecto, Usuario, Rol,
  ResultadoEjecucion, AmbienteEjecucion,
  SeveridadDefecto, PrioridadDefecto,
} from '../../../core/models';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-ciclo-ejecucion',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './ciclo-ejecucion.component.html',
})
export class CicloEjecucionComponent implements OnInit {
  private route            = inject(ActivatedRoute);
  private router           = inject(Router);
  private cicloService     = inject(CicloService);
  private ejecucionService = inject(EjecucionService);
  private userService      = inject(UserService);
  private projectService   = inject(ProjectService);
  private uploadService    = inject(UploadService);
  private defectService    = inject(DefectService);
  private wordExport       = inject(WordExportService);
  private toast            = inject(ToastService);
  auth                     = inject(AuthService);

  cicloId!: number;
  ciclo: CicloPrueba | null = null;
  casos: CasoCiclo[] = [];
  usuarios: Usuario[] = [];
  desarrolladores: Usuario[] = [];
  pmProyectoId: number | null = null;
  proyectoEstado: EstadoProyecto | null = null;
  cargando = signal(false);
  error = '';

  // ─── Popup bloqueo ejecución ──────────────────────────────────────────────
  popupBloqueadoAbierto = signal(false);
  popupBloqueadoMsg     = '';

  get pmUsuario(): Usuario | null {
    if (!this.pmProyectoId) return null;
    return this.usuarios.find(u => u.id === this.pmProyectoId) ?? null;
  }

  get mostrarPMEnDropdown(): boolean {
    if (!this.pmProyectoId) return false;
    return !this.desarrolladores.some(d => d.id === this.pmProyectoId);
  }

  readonly EstadoCiclo       = EstadoCiclo;
  readonly resultadosEjecucion = Object.values(ResultadoEjecucion);
  readonly ambientes           = Object.values(AmbienteEjecucion);
  readonly severidades         = Object.values(SeveridadDefecto);
  readonly prioridades         = Object.values(PrioridadDefecto);

  readonly resultadoClase: Record<string, string> = {
    Aprobado:  'badge-resultado-aprobado',
    Fallido:   'badge-resultado-fallido',
    Bloqueado: 'badge-resultado-bloqueado',
    Omitido:   'badge-resultado-no-ejecutado',
  };

  // ─── Panel ejecución ─────────────────────────────────────────────────────
  guardandoEjec     = signal(false);
  generandoWord     = signal(false);
  subiendoEvidencia = signal(false);
  errorEjecucion    = '';
  errorEvidencia    = '';
  ejecucionExito = signal<string | null>(null);
  casoSeleccionado: CasoCiclo | null = null;
  pasosEjecucion: { orden: number; descripcion: string; resultadoEsperado: string; estado: 'pendiente' | 'ok' | 'no_ok'; imagenes: string[] }[] = [];

  formEjecucion = {
    testerId:             0,
    ambiente:             '' as AmbienteEjecucion | '',
    version:              '',
    resultado:            '' as ResultadoEjecucion | '',
    resultadoObtenido:    '',
    evidencias:           [] as Evidencia[],
    observaciones:        '',
    defTitulo:            '',
    defDescripcion:       '',
    defPasosReproduccion: '',
    defResultadoEsperado: '',
    defSeveridad:         '' as SeveridadDefecto | '',
    defPrioridad:         '' as PrioridadDefecto | '',
    defAsignadoA:         null as number | null,
  };

  get esFallido(): boolean {
    return this.formEjecucion.resultado === ResultadoEjecucion.FALLIDO;
  }

  // ─── Pagination for case list ────────────────────────────────────────────
  paginaCiclo    = 1;
  porPaginaCiclo = 20;

  get totalPaginasCiclo(): number { return Math.ceil(this.casos.length / this.porPaginaCiclo); }

  get casosVisibles(): CasoCiclo[] {
    const start = (this.paginaCiclo - 1) * this.porPaginaCiclo;
    return this.casos.slice(start, start + this.porPaginaCiclo);
  }

  get paginasCiclo(): number[] {
    return Array.from({ length: this.totalPaginasCiclo }, (_, i) => i + 1);
  }

  cambiarPaginaCiclo(p: number): void {
    this.paginaCiclo = p;
    this.casoSeleccionado = null;
    this.ejecucionExito.set(null);
    this.errorEjecucion = '';
  }

  // ─── Stats ───────────────────────────────────────────────────────────────
  get totalEjecutados(): number {
    return this.casos.filter(c => c.resultadoCiclo != null).length;
  }

  get totalAprobados(): number {
    return this.casos.filter(c => c.resultadoCiclo === 'Aprobado').length;
  }

  get totalFallidos(): number {
    return this.casos.filter(c => c.resultadoCiclo === 'Fallido' || c.resultadoCiclo === 'Bloqueado').length;
  }

  get porcentajeCompletado(): number {
    if (!this.casos.length) return 0;
    return Math.round((this.totalEjecutados / this.casos.length) * 100);
  }

  get porcentajeAprobado(): number {
    if (!this.casos.length) return 0;
    return Math.round((this.totalAprobados / this.casos.length) * 100);
  }

  get porcentajeFallido(): number {
    if (!this.casos.length) return 0;
    return Math.round((this.totalFallidos / this.casos.length) * 100);
  }

  ngOnInit(): void {
    this.cicloId = Number(this.route.snapshot.paramMap.get('id'));

    this.userService.getAll({ porPagina: 500 }).subscribe(r => { this.usuarios = r.datos; });
    this.userService.getAll({ rol: Rol.DEVELOPER, activo: true, porPagina: 200 }).subscribe(r => {
      this.desarrolladores = r.datos;
    });

    this.cicloService.getById(this.cicloId).subscribe({
      next: (c) => {
        this.ciclo = c;
        this.projectService.getById(c.proyectoId).subscribe(p => {
          this.pmProyectoId   = p.jefeProyectoId ?? null;
          this.proyectoEstado = p.estado;
        });
      },
      error: () => { this.error = 'No se pudo cargar el ciclo.'; },
    });

    this.cargarCasos();
  }

  cargarCasos(): void {
    this.cargando.set(true);
    this.cicloService.getCasosDeCiclo(this.cicloId).subscribe({
      next: (casos) => { this.casos = casos; this.cargando.set(false); },
      error: () => { this.cargando.set(false); this.toast.error('Error al cargar los casos del ciclo'); },
    });
  }

  private abrirPopupBloqueado(msg: string): void {
    this.popupBloqueadoMsg = msg;
    this.popupBloqueadoAbierto.set(true);
  }

  cerrarPopupBloqueado(): void {
    this.popupBloqueadoAbierto.set(false);
  }

  seleccionarCaso(caso: CasoCiclo): void {
    if (this.casoSeleccionado?.id === caso.id && !this.ejecucionExito()) return;

    if (this.proyectoEstado && this.proyectoEstado !== EstadoProyecto.EN_EJECUCION) {
      this.abrirPopupBloqueado(
        `El proyecto está en estado "${this.proyectoEstado}". ` +
        `Solo se pueden ejecutar casos cuando el proyecto está en "En Ejecución".`
      );
      return;
    }

    if (this.ciclo && !this.ciclo.planPruebaId) {
      this.abrirPopupBloqueado(
        `El ciclo "${this.ciclo.nombre}" no está vinculado a un plan de prueba. ` +
        `Asocia el ciclo a un plan antes de registrar ejecuciones.`
      );
      return;
    }

    if (caso.requerimientoId && caso.requerimientoEstado && caso.requerimientoEstado !== 'Aprobado') {
      this.abrirPopupBloqueado(
        `El requerimiento asociado a "${caso.nombre}" no está Aprobado ` +
        `(estado actual: "${caso.requerimientoEstado}"). ` +
        `Aprueba el requerimiento antes de ejecutar este caso.`
      );
      return;
    }

    this.ejecucionExito.set(null);
    this.casoSeleccionado = caso;
    this.errorEjecucion = '';
    this.pasosEjecucion = (caso.pasos ?? []).map((p: any) => ({
      orden: p.orden,
      descripcion: p.descripcion,
      resultadoEsperado: p.resultadoEsperado ?? '',
      estado: 'pendiente' as const,
      imagenes: [] as string[],
    }));
    const userId     = this.auth.usuarioActual()?.id ?? 0;
    const pasosTexto = this.pasosATexto(caso.pasos ?? []);
    this.formEjecucion = {
      testerId:             userId,
      ambiente:             (this.ciclo?.ambiente as AmbienteEjecucion | '') ?? '',
      version:              '',
      resultado:            '' as ResultadoEjecucion | '',
      resultadoObtenido:    '',
      evidencias:           [] as Evidencia[],
      observaciones:        '',
      defTitulo:            '',
      defDescripcion:       caso.descripcion ?? '',
      defPasosReproduccion: pasosTexto,
      defResultadoEsperado: caso.resultadoEsperado ?? '',
      defSeveridad:         '' as SeveridadDefecto | '',
      defPrioridad:         '' as PrioridadDefecto | '',
      defAsignadoA:         this.pmProyectoId ?? null,
    };
    this.ejecucionService.getByCasoPrueba(caso.id).subscribe(ejecuciones => {
      this.formEjecucion.version = String(ejecuciones.length + 1);
    });
  }

  limpiarSeleccion(): void {
    this.casoSeleccionado = null;
    this.errorEjecucion = '';
    this.errorEvidencia = '';
    this.ejecucionExito.set(null);
    this.pasosEjecucion = [];
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
    // Vista previa local inmediata dentro del paso (no se persiste por si sola).
    const reader = new FileReader();
    reader.onload = (e) => {
      const imagenes = [...this.pasosEjecucion[idx].imagenes, e.target?.result as string];
      this.pasosEjecucion[idx] = { ...this.pasosEjecucion[idx], imagenes };
    };
    reader.readAsDataURL(file);

    // Subida real: esto es lo que efectivamente queda guardado como evidencia
    // de la ejecución (antes esta imagen se perdía al cerrar el panel).
    this.agregarEvidencia([file]);
  }

  // ─── Evidencia (archivos subidos) ──────────────────────────────────────────
  agregarEvidencia(files: FileList | File[]): void {
    const lista = Array.from(files);
    if (!lista.length) return;
    this.errorEvidencia = '';
    this.subiendoEvidencia.set(true);
    let pendientes = lista.length;
    lista.forEach(file => {
      this.uploadService.subir(file).subscribe({
        next: (evidencia) => {
          this.formEjecucion.evidencias = [...this.formEjecucion.evidencias, evidencia];
          if (--pendientes === 0) this.subiendoEvidencia.set(false);
        },
        error: (err) => {
          this.errorEvidencia = `No se pudo subir "${file.name}": ${err?.error?.message ?? 'error desconocido'}`;
          if (--pendientes === 0) this.subiendoEvidencia.set(false);
        },
      });
    });
  }

  onFileSelectedEvidencia(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (files) this.agregarEvidencia(files);
    (event.target as HTMLInputElement).value = '';
  }

  quitarEvidencia(idx: number): void {
    const lista = [...this.formEjecucion.evidencias];
    lista.splice(idx, 1);
    this.formEjecucion.evidencias = lista;
  }

  urlEvidencia(rutaRelativa: string): string {
    return this.uploadService.resolverUrl(rutaRelativa);
  }

  marcarPaso(idx: number, estado: 'ok' | 'no_ok'): void {
    this.pasosEjecucion[idx].estado =
      this.pasosEjecucion[idx].estado === estado ? 'pendiente' : estado;
    const pasos    = this.pasosEjecucion;
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

  async generarEvidenciaWord(): Promise<void> {
    if (!this.casoSeleccionado) return;
    this.generandoWord.set(true);
    try {
      const usuario = this.auth.usuarioActual();
      await this.wordExport.exportarEjecucion({
        proyecto:          this.ciclo?.proyectoNombre ?? '—',
        ciclo:             this.ciclo?.nombre ?? '—',
        codigoCaso:        this.casoSeleccionado.codigo,
        nombreCaso:        this.casoSeleccionado.nombre,
        descripcionCaso:   this.casoSeleccionado.descripcion,
        tester:            usuario ? `${usuario.nombre} ${usuario.apellido}` : '—',
        ambiente:          this.formEjecucion.ambiente,
        version:           this.formEjecucion.version,
        resultado:         this.formEjecucion.resultado,
        resultadoEsperado: this.casoSeleccionado.resultadoEsperado,
        resultadoObtenido: this.formEjecucion.resultadoObtenido,
        observaciones:     this.formEjecucion.observaciones,
        pasos:             this.pasosEjecucion,
      });
      this.toast.exito('Evidencia Word generada correctamente.');
    } catch {
      this.toast.error('No se pudo generar la evidencia Word.');
    } finally {
      this.generandoWord.set(false);
    }
  }

  guardarEjecucion(): void {
    const f = this.formEjecucion;
    if (!f.ambiente || !f.resultado || !f.resultadoObtenido || !f.testerId) {
      this.errorEjecucion = !f.ambiente
        ? 'El ciclo no tiene ambiente configurado. Edita el ciclo y asigna un ambiente antes de registrar ejecuciones.'
        : 'Completa los campos obligatorios: Tester, Resultado y Resultado Obtenido.';
      return;
    }
    if (this.esFallido && (!f.defTitulo.trim() || !f.defDescripcion.trim() || !f.defPasosReproduccion.trim() || !f.defSeveridad || !f.defPrioridad)) {
      this.errorEjecucion = 'Para resultado Fallido completa: Título, Descripción, Pasos para reproducir, Severidad y Prioridad.';
      return;
    }
    if (this.esFallido && !f.observaciones.trim()) {
      this.errorEjecucion = 'Para resultado Fallido, detalla la Observación (qué se observó al fallar el caso).';
      return;
    }
    if (this.subiendoEvidencia()) {
      this.errorEjecucion = 'Espera a que termine de subirse la evidencia antes de guardar.';
      return;
    }
    this.errorEjecucion = '';
    this.guardandoEjec.set(true);

    const caso      = this.casoSeleccionado!;
    const esFallido = this.esFallido;

    const ejPayload: any = {
      casoPruebaId:      caso.id,
      proyectoId:        caso.proyectoId,
      cicloId:           this.cicloId,
      testerId:          f.testerId,
      ambiente:          f.ambiente,
      version:           f.version,
      resultado:         f.resultado,
      resultadoObtenido: f.resultadoObtenido,
      evidencias:        f.evidencias.length ? f.evidencias : undefined,
      observaciones:     f.observaciones || undefined,
      desarrolladorId:   esFallido && f.defAsignadoA ? f.defAsignadoA : undefined,
      ...(esFallido && {
        defectoData: {
          titulo:            f.defTitulo.trim(),
          descripcion:       f.defDescripcion.trim() || caso.descripcion,
          pasosReproduccion: f.defPasosReproduccion.trim(),
          resultadoObtenido: f.resultadoObtenido,
          resultadoEsperado: f.defResultadoEsperado.trim() || caso.resultadoEsperado,
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
        this.cargarCasos();
        if (esFallido) {
          const codigoDefecto = res?.defecto?.codigoProyecto ?? res?.defecto?.codigo ?? 'INC-???';
          this.ejecucionExito.set(codigoDefecto);
          this.descargarWordDefecto(res?.defecto?.id);
        } else {
          this.limpiarSeleccion();
        }
      },
      error: (err: any) => {
        this.guardandoEjec.set(false);
        this.errorEjecucion = 'Error al registrar la ejecución: ' + (err?.error?.message ?? 'Error desconocido');
      },
    });
  }

  /**
   * Al crear un defecto (ejecución Fallida), descarga automáticamente el reporte Word
   * de evidencias — el mismo que genera el botón "Word" de la lista de Defectos.
   * Se pide el defecto completo (getById) porque la respuesta de create() no trae
   * `evidencias`. Si falla, no interrumpe el flujo — el tester igual puede generarlo
   * después manualmente desde la lista.
   */
  private descargarWordDefecto(defectoId?: number): void {
    if (!defectoId) return;
    this.defectService.getById(defectoId).subscribe({
      next: (d) => { this.wordExport.exportarDefecto(d).catch(() => {}); },
      error: () => {},
    });
  }

  nombreUsuario(u: Usuario): string {
    return `${u.nombre} ${u.apellido}`;
  }

  private pasosATexto(pasos: any[]): string {
    if (!pasos?.length) return '';
    return pasos.map((p: any) => `${p.orden}. ${p.descripcion}`).join('\n');
  }
}
