import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { EjecucionService } from '../../../core/services/ejecucion.service';
import { ProjectService } from '../../../core/services/project.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { UploadService } from '../../../core/services/upload.service';
import { EjecucionCasoPrueba, Proyecto, Usuario, ResultadoEjecucion, AmbienteEjecucion } from '../../../core/models';
import { ToastService } from '../../../core/services/toast.service';
import { DefectService } from '../../../core/services/defect.service';
import { TestCaseService } from '../../../core/services/test-case.service';
import { WordExportService } from '../../../core/services/word-export.service';

@Component({
  selector: 'app-ejecucion-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ejecucion-list.component.html'
})
export class EjecucionListComponent implements OnInit {
  private service        = inject(EjecucionService);
  private projectService = inject(ProjectService);
  private userService    = inject(UserService);
  private toast          = inject(ToastService);
  private uploadService  = inject(UploadService);
  private defectService  = inject(DefectService);
  private testCaseService = inject(TestCaseService);
  private wordExport     = inject(WordExportService);
  auth                   = inject(AuthService);

  urlEvidencia(rutaRelativa: string): string {
    return this.uploadService.resolverUrl(rutaRelativa);
  }

  ejecuciones: EjecucionCasoPrueba[] = [];
  proyectos: Proyecto[]              = [];
  usuarios: Usuario[]                = [];

  total     = 0;
  pagina    = 1;
  porPagina = 10;
  cargando  = false;

  // Filtros
  proyectoFiltroId?: number;
  resultadoFiltro  = '';
  ambienteFiltro   = '';
  testerFiltroId?: number;
  fechaDesde = '';
  fechaHasta = '';

  readonly resultados = Object.values(ResultadoEjecucion);
  readonly ambientes  = Object.values(AmbienteEjecucion);

  readonly resultadoClase: Record<string, string> = {
    [ResultadoEjecucion.APROBADO]:  'badge-resultado-aprobado',
    [ResultadoEjecucion.FALLIDO]:   'badge-resultado-fallido',
    [ResultadoEjecucion.BLOQUEADO]: 'badge-resultado-bloqueado',
    [ResultadoEjecucion.OMITIDO]:   'badge-resultado-no-ejecutado',
  };

  ngOnInit(): void {
    this.projectService.getAll({ porPagina: 500 }).subscribe(r => {
      this.proyectos = r.datos;
    });
    this.userService.getAll({ porPagina: 500 }).subscribe(r => {
      this.usuarios = r.datos;
    });
  }

  cargar(): void {
    if (!this.proyectoFiltroId) return;
    this.cargando = true;
    this.service.getAll({
      proyectoId:  this.proyectoFiltroId,
      resultado:   this.resultadoFiltro  || undefined,
      ambiente:    this.ambienteFiltro   || undefined,
      testerId:    this.testerFiltroId,
      fechaDesde:  this.fechaDesde       || undefined,
      fechaHasta:  this.fechaHasta       || undefined,
      pagina:      this.pagina,
      porPagina:   this.porPagina,
    }).subscribe({
      next: (res) => {
        this.ejecuciones = res.datos; this.total = res.total; this.cargando = false;
        if (res.datos.length === 0 && this.pagina > 1) { this.pagina = Math.max(1, this.totalPaginas); this.cargar(); }
      },
      error: ()   => { this.cargando = false; this.toast.error('Error al cargar ejecuciones'); }
    });
  }

  buscar(): void { this.pagina = 1; this.cargar(); }
  cambiarPagina(p: number): void { this.pagina = p; this.cargar(); }
  get paginas(): number[] { return Array.from({ length: this.totalPaginas }, (_, i) => i + 1); }

  limpiarFiltros(): void {
    this.proyectoFiltroId = undefined;
    this.resultadoFiltro  = '';
    this.ambienteFiltro   = '';
    this.testerFiltroId   = undefined;
    this.fechaDesde       = '';
    this.fechaHasta       = '';
    this.buscar();
  }

  exportarExcel(): void {
    const rows = this.ejecuciones.map((e: any) => ({
      'ID':           e.id,
      'Caso':         `${e.casoPruebaCodigo ?? ''} ${e.casoPruebaNombre ?? ''}`.trim(),
      'Proyecto':     e.proyectoCodigo ?? '',
      'Ciclo':        e.cicloNombre ?? '',
      'Tester':       e.testerNombre ?? '',
      'Fecha':        e.fecha ? new Date(e.fecha).toLocaleString('es-PE') : '',
      'Ambiente':     e.ambiente,
      'Versión':      e.version,
      'Resultado':    e.resultado,
      'Defecto':      e.defectoCodigo ?? '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ejecuciones');
    XLSX.writeFile(wb, 'ejecuciones.xlsx');
  }

  get totalPaginas(): number { return Math.ceil(this.total / this.porPagina); }

  // ─── Modal Ver ───────────────────────────────────────────────────────────
  modalVerAbierto  = signal(false);
  ejecucionVer: EjecucionCasoPrueba | null = null;
  generandoWord = signal(false);

  abrirVer(e: EjecucionCasoPrueba): void {
    this.ejecucionVer = e;
    this.modalVerAbierto.set(true);
  }

  cerrarVer(): void {
    this.modalVerAbierto.set(false);
    this.ejecucionVer = null;
  }

  descargarWord(e: EjecucionCasoPrueba): void {
    if (this.generandoWord()) return;
    this.generandoWord.set(true);
    if (e.resultado === ResultadoEjecucion.FALLIDO && e.defectoId) {
      this.defectService.getById(e.defectoId).subscribe({
        next: defecto => this.wordExport.exportarDefecto(defecto)
          .then(() => this.toast.exito('Reporte de defecto generado.'))
          .catch(() => this.toast.error('No se pudo generar el reporte.'))
          .finally(() => this.generandoWord.set(false)),
        error: () => { this.generandoWord.set(false); this.toast.error('No se pudo cargar el defecto asociado.'); },
      });
      return;
    }
    this.testCaseService.getById(e.casoPruebaId).subscribe({
      next: caso => this.wordExport.exportarEjecucion({
        esReporteDefecto: false,
        codigoProyecto: e.proyectoCodigo,
        proyecto: e.proyectoNombre ?? '—',
        ciclo: e.cicloNombre ?? '—',
        codigoCaso: e.casoPruebaCodigo ?? caso.codigo ?? 'caso-prueba',
        nombreCaso: e.casoPruebaNombre ?? caso.nombre,
        descripcionCaso: caso.descripcion,
        tester: e.testerNombre ?? '—',
        ambiente: e.ambiente,
        version: e.version,
        resultado: e.resultado,
        resultadoEsperado: caso.resultadoEsperado,
        resultadoObtenido: e.resultadoObtenido,
        observaciones: e.observaciones,
        pasos: (caso.pasos ?? []).map(p => ({
          orden: p.orden,
          descripcion: p.descripcion,
          resultadoEsperado: p.resultadoEsperado,
          estado: 'ok' as const,
          imagenes: [],
        })),
        evidencias: e.evidencias,
      }).then(() => this.toast.exito('Evidencia Word generada.'))
        .catch(() => this.toast.error('No se pudo generar la evidencia.'))
        .finally(() => this.generandoWord.set(false)),
      error: () => { this.generandoWord.set(false); this.toast.error('No se pudo cargar el caso de prueba.'); },
    });
  }
}
