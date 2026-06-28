import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { EjecucionService } from '../../../core/services/ejecucion.service';
import { ProjectService } from '../../../core/services/project.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { EjecucionCasoPrueba, Proyecto, Usuario, ResultadoEjecucion, AmbienteEjecucion } from '../../../core/models';
import { ToastService } from '../../../core/services/toast.service';

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
  auth                   = inject(AuthService);

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

  abrirVer(e: EjecucionCasoPrueba): void {
    this.ejecucionVer = e;
    this.modalVerAbierto.set(true);
  }

  cerrarVer(): void {
    this.modalVerAbierto.set(false);
    this.ejecucionVer = null;
  }
}
