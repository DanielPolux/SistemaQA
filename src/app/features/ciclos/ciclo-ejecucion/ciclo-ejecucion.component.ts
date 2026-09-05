import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { CicloService, CasoCiclo, InformeCierreCiclo } from '../../../core/services/ciclo.service';
import { EjecucionService } from '../../../core/services/ejecucion.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { ProjectService } from '../../../core/services/project.service';
import { UploadService, Evidencia } from '../../../core/services/upload.service';
import { mensajeErrorSubida } from '../../../core/utils/http-error.util';
import { DefectService } from '../../../core/services/defect.service';
import { WordExportService } from '../../../core/services/word-export.service';
import {
  CicloPrueba, EstadoCiclo, EstadoProyecto, Usuario, Rol,
  ResultadoEjecucion, AmbienteEjecucion, TipoEjecucion,
  SeveridadDefecto, PrioridadDefecto, Defecto, EstadoDefecto,
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
  modalFinalizarCiclo = signal(false);
  finalizandoCiclo = signal(false);
  errorFinalizarCiclo = '';
  conclusionQa = '';
  recomendacionQa: 'Liberar' | 'Liberar con observaciones' | 'No liberar' = 'Liberar';
  justificacionBloqueados = '';
  informesCierre: InformeCierreCiclo[] = [];
  descargandoInforme = signal<number | null>(null);

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
  registroExitoso = signal<{ resultado: ResultadoEjecucion; codigoDefecto?: string } | null>(null);
  casoSeleccionado: CasoCiclo | null = null;
  pasosEjecucion: { orden: number; descripcion: string; resultadoEsperado: string; estado: 'pendiente' | 'ok' | 'no_ok' | 'bloqueado'; imagenes: string[]; evidencias: Evidencia[] }[] = [];
  decisionFalloAbierta = signal(false);
  pasoFallidoIdx: number | null = null;
  motivoBloqueo = '';
  errorDecisionFallo = '';
  defectosBloqueantes: Defecto[] = [];
  private resultadoObtenidoAutogenerado: string | null = null;

  formEjecucion = {
    testerId:             0,
    ambiente:             '' as AmbienteEjecucion | '',
    tipoEjecucion:        TipoEjecucion.MANUAL,
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
    bloqueadoPorCasoId:   null as number | null,
    defectoBloqueanteId:  null as number | null,
  };

  get esFallido(): boolean {
    return this.formEjecucion.resultado === ResultadoEjecucion.FALLIDO;
  }

  get hayPasoNoOk(): boolean {
    return this.pasosEjecucion.some(p => p.estado === 'no_ok');
  }

  get esBloqueado(): boolean { return this.formEjecucion.resultado === ResultadoEjecucion.BLOQUEADO; }

  get casosFallidosDelCiclo(): CasoCiclo[] {
    return this.casos.filter(c => c.id !== this.casoSeleccionado?.id && c.resultadoCiclo === ResultadoEjecucion.FALLIDO);
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
    this.registroExitoso.set(null);
    this.errorEjecucion = '';
    this.resultadoObtenidoAutogenerado = null;
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

  get totalFallidosExactos(): number { return this.casos.filter(c => c.resultadoCiclo === 'Fallido').length; }
  get totalBloqueados(): number { return this.casos.filter(c => c.resultadoCiclo === 'Bloqueado').length; }
  get totalOmitidos(): number { return this.casos.filter(c => c.resultadoCiclo === 'Omitido').length; }
  get totalPendientes(): number { return this.casos.filter(c => !c.resultadoCiclo).length; }

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

  abrirFinalizarCiclo(): void {
    if (!this.casos.length || this.totalPendientes > 0) return;
    this.errorFinalizarCiclo = '';
    this.recomendacionQa = this.totalFallidosExactos || this.totalBloqueados ? 'No liberar' : this.totalOmitidos ? 'Liberar con observaciones' : 'Liberar';
    this.modalFinalizarCiclo.set(true);
  }

  cerrarFinalizarCiclo(): void {
    if (!this.finalizandoCiclo()) this.modalFinalizarCiclo.set(false);
  }

  confirmarFinalizarCiclo(): void {
    if (!this.conclusionQa.trim()) {
      this.errorFinalizarCiclo = 'Ingresa la conclusión del responsable QA.';
      return;
    }
    if (this.totalBloqueados > 0 && !this.justificacionBloqueados.trim()) {
      this.errorFinalizarCiclo = 'Justifica los casos bloqueados antes de finalizar.';
      return;
    }
    this.finalizandoCiclo.set(true);
    this.errorFinalizarCiclo = '';
    this.cicloService.cerrar(this.cicloId, {
      conclusionQa: this.conclusionQa.trim(),
      recomendacionQa: this.recomendacionQa,
      justificacionBloqueados: this.justificacionBloqueados.trim() || undefined,
    }).subscribe({
      next: ciclo => {
        this.ciclo = ciclo;
        this.finalizandoCiclo.set(false);
        this.modalFinalizarCiclo.set(false);
        this.limpiarSeleccion();
        this.cargarInformesCierre();
        this.toast.exito('Ciclo de pruebas finalizado correctamente.');
      },
      error: err => {
        this.finalizandoCiclo.set(false);
        this.errorFinalizarCiclo = err?.error?.message ?? 'No se pudo finalizar el ciclo.';
      },
    });
  }

  cargarInformesCierre(): void {
    this.cicloService.getInformes(this.cicloId).subscribe(informes => this.informesCierre = informes);
  }

  descargarInformeCierre(informe: InformeCierreCiclo): void {
    this.descargandoInforme.set(informe.id);
    this.cicloService.descargarInforme(this.cicloId, informe.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.ciclo?.proyectoCodigo}-${this.ciclo?.nombre}-INFORME-CIERRE-E${String(informe.version).padStart(2, '0')}.docx`.replace(/[^a-zA-Z0-9_.-]+/g, '-');
        a.click();
        URL.revokeObjectURL(url);
        this.descargandoInforme.set(null);
      },
      error: () => { this.descargandoInforme.set(null); this.toast.error('No se pudo descargar el informe.'); },
    });
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
    this.cargarInformesCierre();

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
    if (this.casoSeleccionado?.id === caso.id && !this.registroExitoso()) return;

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

    this.registroExitoso.set(null);
    this.casoSeleccionado = caso;
    this.errorEjecucion = '';
    this.resultadoObtenidoAutogenerado = null;
    this.pasosEjecucion = (caso.pasos ?? []).map((p: any) => ({
      orden: p.orden,
      descripcion: p.descripcion,
      resultadoEsperado: p.resultadoEsperado ?? '',
      estado: 'pendiente' as const,
      imagenes: [] as string[],
      evidencias: [] as Evidencia[],
    }));
    const userId     = this.auth.usuarioActual()?.id ?? 0;
    const pasosTexto = this.pasosATexto(caso.pasos ?? []);
    this.formEjecucion = {
      testerId:             userId,
      ambiente:             (this.ciclo?.ambiente as AmbienteEjecucion | '') ?? '',
      tipoEjecucion:        TipoEjecucion.MANUAL,
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
      bloqueadoPorCasoId:   null,
      defectoBloqueanteId:  null,
    };
    this.ejecucionService.getByCasoPrueba(caso.id, this.cicloId).subscribe(ejecuciones => {
      this.formEjecucion.version = `E${String(ejecuciones.length + 1).padStart(2, '0')}`;
    });
  }

  limpiarSeleccion(): void {
    this.casoSeleccionado = null;
    this.errorEjecucion = '';
    this.errorEvidencia = '';
    this.registroExitoso.set(null);
    this.pasosEjecucion = [];
    this.resultadoObtenidoAutogenerado = null;
    this.cerrarDecisionFallo();
  }

  limpiarImagenPaso(pasoIdx: number, imgIdx: number): void {
    const paso = this.pasosEjecucion[pasoIdx];
    const imgs = [...paso.imagenes];
    const evidencias = [...paso.evidencias];
    const evidenciaEliminada = evidencias[imgIdx];
    imgs.splice(imgIdx, 1);
    evidencias.splice(imgIdx, 1);
    this.pasosEjecucion[pasoIdx] = { ...paso, imagenes: imgs, evidencias };
    if (evidenciaEliminada) {
      this.formEjecucion.evidencias = this.formEjecucion.evidencias
        .filter(e => e.url !== evidenciaEliminada.url);
    }
  }

  pegarImagenPaso(idx: number, event: ClipboardEvent): void {
    if (this.esBloqueado) return;
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
    if (this.esBloqueado) return;
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
    this.agregarEvidencia([file], idx);
  }

  // ─── Evidencia (archivos subidos) ──────────────────────────────────────────
  agregarEvidencia(files: FileList | File[], pasoIdx?: number): void {
    const lista = Array.from(files);
    if (!lista.length) return;
    this.errorEvidencia = '';
    this.subiendoEvidencia.set(true);
    let pendientes = lista.length;
    lista.forEach(file => {
      this.uploadService.subir(file).subscribe({
        next: (evidencia) => {
          this.formEjecucion.evidencias = [...this.formEjecucion.evidencias, evidencia];
          if (pasoIdx !== undefined) {
            const paso = this.pasosEjecucion[pasoIdx];
            this.pasosEjecucion[pasoIdx] = {
              ...paso,
              evidencias: [...paso.evidencias, evidencia],
            };
          }
          if (--pendientes === 0) this.subiendoEvidencia.set(false);
        },
        error: (err) => {
          this.errorEvidencia = `No se pudo subir "${file.name}": ${mensajeErrorSubida(err)}`;
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
    const activaNoOk = estado === 'no_ok' && this.pasosEjecucion[idx].estado !== 'no_ok';
    this.pasosEjecucion[idx].estado =
      this.pasosEjecucion[idx].estado === estado ? 'pendiente' : estado;
    this.recalcularResultadoPasos();

    if (activaNoOk) {
      this.pasoFallidoIdx = idx;
      this.motivoBloqueo = '';
      this.errorDecisionFallo = '';
      this.decisionFalloAbierta.set(true);
    }
  }

  alternarBloqueado(): void {
    if (this.esBloqueado) {
      this.formEjecucion.resultado = '';
      this.formEjecucion.bloqueadoPorCasoId = null;
      this.formEjecucion.defectoBloqueanteId = null;
      this.defectosBloqueantes = [];
      return;
    }
    this.limpiarResultadoObtenidoAutomatico();
    this.pasosEjecucion = this.pasosEjecucion.map(p => ({ ...p, estado: 'pendiente' }));
    this.formEjecucion.resultado = ResultadoEjecucion.BLOQUEADO;
  }

  cargarDefectosBloqueantes(): void {
    this.formEjecucion.defectoBloqueanteId = null;
    this.defectosBloqueantes = [];
    const casoId = this.formEjecucion.bloqueadoPorCasoId;
    if (casoId) {
      this.defectService.getByCasoPrueba(casoId).subscribe(ds => {
        // Un defecto ya cerrado no puede seguir bloqueando la ejecución de otro caso.
        this.defectosBloqueantes = ds.filter(d => d.estado !== EstadoDefecto.CERRADO);
        if (this.defectosBloqueantes.length === 1) this.formEjecucion.defectoBloqueanteId = this.defectosBloqueantes[0].id;
      });
    }
  }

  continuarTrasFallo(): void {
    this.cerrarDecisionFallo();
  }

  finalizarTrasFallo(): void {
    const motivo = this.motivoBloqueo.trim();
    if (!motivo) {
      this.errorDecisionFallo = 'Indica por qué no se continuarán ejecutando los pasos restantes.';
      return;
    }

    const idx = this.pasoFallidoIdx;
    if (idx === null) return;
    this.pasosEjecucion = this.pasosEjecucion.map((paso, pasoIdx) => ({
      ...paso,
      estado: pasoIdx > idx && paso.estado === 'pendiente' ? 'bloqueado' : paso.estado,
    }));
    const nota = `Ejecución finalizada en el paso ${this.pasosEjecucion[idx].orden}. Motivo: ${motivo}`;
    this.formEjecucion.observaciones = this.formEjecucion.observaciones.trim()
      ? `${this.formEjecucion.observaciones.trim()}\n${nota}`
      : nota;
    this.recalcularResultadoPasos();
    this.cerrarDecisionFallo();
  }

  cerrarDecisionFallo(): void {
    this.decisionFalloAbierta.set(false);
    this.pasoFallidoIdx = null;
    this.motivoBloqueo = '';
    this.errorDecisionFallo = '';
  }

  private recalcularResultadoPasos(): void {
    const pasos    = this.pasosEjecucion;
    const hayNoOk  = pasos.some(p => p.estado === 'no_ok');
    const todosOk  = pasos.every(p => p.estado === 'ok');
    if (hayNoOk) {
      this.limpiarResultadoObtenidoAutomatico();
      this.formEjecucion.resultado = ResultadoEjecucion.FALLIDO;
      this.formEjecucion.defPasosReproduccion = this.pasosATexto(pasos);
    } else {
      this.pasosEjecucion = pasos.map(p => p.estado === 'bloqueado' ? { ...p, estado: 'pendiente' } : p);
      // Al corregir el último NO OK, el formulario de defecto debe ocultarse
      // incluso si todavía quedan pasos pendientes por ejecutar.
      this.formEjecucion.resultado = todosOk
        ? ResultadoEjecucion.APROBADO
        : '';
      if (todosOk) {
        const esperado = this.casoSeleccionado?.resultadoEsperado?.trim() ?? '';
        if (esperado && (!this.formEjecucion.resultadoObtenido.trim()
          || this.formEjecucion.resultadoObtenido === this.resultadoObtenidoAutogenerado)) {
          this.formEjecucion.resultadoObtenido = esperado;
          this.resultadoObtenidoAutogenerado = esperado;
        }
      } else {
        this.limpiarResultadoObtenidoAutomatico();
      }
    }
  }

  private limpiarResultadoObtenidoAutomatico(): void {
    if (this.resultadoObtenidoAutogenerado !== null
      && this.formEjecucion.resultadoObtenido === this.resultadoObtenidoAutogenerado) {
      this.formEjecucion.resultadoObtenido = '';
    }
    this.resultadoObtenidoAutogenerado = null;
  }

  async generarEvidenciaWord(): Promise<void> {
    if (!this.casoSeleccionado) return;
    this.generandoWord.set(true);
    try {
      const usuario = this.auth.usuarioActual();
      const asignado = this.usuarios.find(u => u.id === this.formEjecucion.defAsignadoA);
      await this.wordExport.exportarEjecucion({
        esReporteDefecto:   this.hayPasoNoOk,
        codigoProyecto:    this.ciclo?.proyectoCodigo,
        proyecto:          this.ciclo?.proyectoNombre ?? '—',
        requerimiento:     [this.casoSeleccionado.requerimientoCodigo, this.casoSeleccionado.requerimientoTitulo]
          .filter(Boolean).join(' - ') || '—',
        ciclo:             this.ciclo?.nombre ?? '—',
        codigoCaso:        this.casoSeleccionado.codigo,
        nombreCaso:        this.casoSeleccionado.nombre,
        descripcionCaso:   this.casoSeleccionado.descripcion,
        tester:            usuario ? `${usuario.nombre} ${usuario.apellido}` : '—',
        ambiente:          this.formEjecucion.ambiente,
        tipoEjecucion:     this.formEjecucion.tipoEjecucion,
        version:           this.formEjecucion.version,
        resultado:         this.formEjecucion.resultado,
        resultadoEsperado: this.casoSeleccionado.resultadoEsperado,
        resultadoObtenido: this.resultadoObtenidoEfectivo(),
        observaciones:     this.formEjecucion.observaciones,
        defectoTitulo:     this.formEjecucion.defTitulo,
        defectoDescripcion:this.formEjecucion.defDescripcion,
        defectoPasos:      this.formEjecucion.defPasosReproduccion,
        defectoSeveridad:  this.formEjecucion.defSeveridad,
        defectoPrioridad:  this.formEjecucion.defPrioridad,
        defectoAsignadoA:  asignado ? this.nombreUsuario(asignado) : undefined,
        bloqueadoPorCaso:  this.casoBloqueanteTexto(),
        defectoBloqueante: this.defectoBloqueanteTexto(),
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
    if (!f.ambiente || !f.resultado || !f.testerId) {
      this.errorEjecucion = !f.ambiente
        ? 'El ciclo no tiene ambiente configurado. Edita el ciclo y asigna un ambiente antes de registrar ejecuciones.'
        : 'No se pudo determinar el Tester o el Resultado de la ejecución.';
      return;
    }
    if (!this.esBloqueado && !f.resultadoObtenido.trim()) {
      this.errorEjecucion = 'Completa el campo Resultado Obtenido.';
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
    if (this.esBloqueado && (!f.bloqueadoPorCasoId || !f.defectoBloqueanteId)) {
      this.errorEjecucion = 'Para un caso Bloqueado selecciona el caso fallido y el defecto que impiden su ejecución.';
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
      tipoEjecucion:     f.tipoEjecucion,
      version:           f.version,
      resultado:         f.resultado,
      resultadoObtenido: this.resultadoObtenidoEfectivo(),
      evidencias:        esFallido
        ? this.pasosEjecucion.filter(p => p.estado === 'no_ok').flatMap(p => p.evidencias)
        : (f.evidencias.length ? f.evidencias : undefined),
      observaciones:     f.observaciones || undefined,
      desarrolladorId:   esFallido && f.defAsignadoA ? f.defAsignadoA : undefined,
      bloqueadoPorCasoId: this.esBloqueado ? f.bloqueadoPorCasoId : undefined,
      defectoId:          this.esBloqueado ? f.defectoBloqueanteId : undefined,
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
          requerimientoId:   caso.requerimientoId ?? undefined,
        },
      }),
    };

    this.ejecucionService.create(ejPayload).subscribe({
      next: (res: any) => {
        this.guardandoEjec.set(false);
        this.cargarCasos();
        this.formEjecucion.version = res?.version ?? this.formEjecucion.version;
        const codigoDefecto = esFallido
          ? res?.defecto?.codigoProyecto ?? res?.defecto?.codigo ?? 'INC-???'
          : undefined;
        this.registroExitoso.set({ resultado: f.resultado as ResultadoEjecucion, codigoDefecto });
      },
      error: (err: any) => {
        this.guardandoEjec.set(false);
        this.errorEjecucion = 'Error al registrar la ejecución: ' + (err?.error?.message ?? 'Error desconocido');
      },
    });
  }

  nombreUsuario(u: Usuario): string {
    return `${u.nombre} ${u.apellido}`;
  }

  private casoBloqueanteTexto(): string | undefined {
    const caso = this.casos.find(c => c.id === this.formEjecucion.bloqueadoPorCasoId);
    return caso ? `${caso.codigo} - ${caso.nombre}` : undefined;
  }

  private defectoBloqueanteTexto(): string | undefined {
    const defecto = this.defectosBloqueantes.find(d => d.id === this.formEjecucion.defectoBloqueanteId);
    return defecto ? `${defecto.codigoProyecto ?? defecto.codigo} - ${defecto.titulo}` : undefined;
  }

  private resultadoObtenidoEfectivo(): string {
    if (!this.esBloqueado) return this.formEjecucion.resultadoObtenido;
    const caso = this.casoBloqueanteTexto() ?? 'caso no identificado';
    const defecto = this.defectoBloqueanteTexto() ?? 'defecto no identificado';
    return `Ejecución bloqueada por el caso ${caso}. Defecto asociado: ${defecto}.`;
  }

  private pasosATexto(pasos: any[]): string {
    if (!pasos?.length) return '';
    return pasos.map((p: any) => `${p.orden}. ${p.descripcion}`).join('\n');
  }
}
