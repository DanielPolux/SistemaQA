import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { TestCaseService } from '../../../core/services/test-case.service';
import { ProjectService } from '../../../core/services/project.service';
import { RequirementService } from '../../../core/services/requirement.service';
import {
  EstadoCasoPrueba, PrioridadCasoPrueba, ResultadoCasoPrueba, TipoPrueba,
  ImportacionResultado, Proyecto, Paso, Requerimiento
} from '../../../core/models';

interface FilaPrevia {
  fila: number;
  codigoCP: string;
  nombreCasoPrueba: string;
  claveProyecto: string;
  tipoPrueba: string;
  descripcionCasoPrueba: string;
  prioridad: string;
  estadoQA: string;
  resultadoEsperado: string;
  pasosDePrueba: string;
  requerimientoRF: string;
  requerimientoId: number | null;
  resultado: string;
  observaciones: string;
  evidenciaUrl: string;
  errores: string[];
  valido: boolean;
}

@Component({
  selector: 'app-test-case-import',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './test-case-import.component.html'
})
export class TestCaseImportComponent implements OnInit {
  private service            = inject(TestCaseService);
  private projectService     = inject(ProjectService);
  private requirementService = inject(RequirementService);

  // Valores permitidos — alineados con el backend
  private readonly TIPOS_VALIDOS      = Object.values(TipoPrueba);
  private readonly PRIORIDADES_VALIDAS= Object.values(PrioridadCasoPrueba);
  private readonly ESTADOS_VALIDOS    = Object.values(EstadoCasoPrueba);
  private readonly RESULTADOS_VALIDOS = Object.values(ResultadoCasoPrueba);

  readonly COLUMNAS_TEMPLATE = [
    'Codigo CP', 'Nombre del Caso de Prueba *', 'Clave Proyecto',
    'Tipo de Prueba *', 'Descripcion del Caso de Prueba *', 'Prioridad *',
    'Estado QA *', 'Resultado Esperado *', 'Pasos de Prueba *',
    'Requerimiento RF', 'Resultado', 'Observaciones', 'Evidencia URL'
  ];

  proyectos: Proyecto[]              = [];
  proyectoActual: Proyecto | null    = null;
  requerimientosProyecto: Requerimiento[] = [];
  proyectoId: number | null          = null;
  archivo: File | null               = null;
  filas: FilaPrevia[]                = [];
  private rawRows: string[][]        = [];
  importando                         = false;
  resultadoImport: ImportacionResultado | null = null;
  errorArchivo                       = '';

  get filasValidas(): FilaPrevia[]  { return this.filas.filter(f => f.valido); }
  get filasConError(): FilaPrevia[] { return this.filas.filter(f => !f.valido); }

  ngOnInit(): void {
    this.projectService.getAll({ porPagina: 200 }).subscribe(r => { this.proyectos = r.datos; });
  }

  onProyectoChange(): void {
    this.proyectoActual = this.proyectos.find(p => p.id === Number(this.proyectoId)) ?? null;
    this.requerimientosProyecto = [];
    if (this.proyectoId) {
      this.requirementService.getAll({ proyectoId: this.proyectoId, porPagina: 500 }).subscribe(r => {
        this.requerimientosProyecto = r.datos;
        if (this.rawRows.length) this.parsearFilas(this.rawRows);
      });
    } else if (this.rawRows.length) {
      this.parsearFilas(this.rawRows);
    }
  }

  // ─── Plantilla ───────────────────────────────────────────────────────────

  descargarPlantilla(): void {
    const wb = XLSX.utils.book_new();

    const instruccion = [['Sistema QA DLWLatam — Plantilla de Carga de Casos de Prueba']];
    const encabezados = [this.COLUMNAS_TEMPLATE];
    const ejemplo = [[
      'CP-001',
      'Verificar login con credenciales válidas',
      'PWC-2024',
      'Funcional',
      'Comprobar que un usuario registrado pueda iniciar sesión correctamente',
      'Alta',
      'Pendiente',
      'El sistema muestra el dashboard del usuario',
      '1. Ir a /login\n2. Ingresar email: usuario@test.com\n3. Ingresar contraseña: 123456\n4. Clic en Iniciar Sesión',
      'RF-001',
      'Sin Ejecutar',
      '',
      ''
    ]];

    const wsData = [...instruccion, [], encabezados[0], ...ejemplo];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!cols'] = [
      { wch: 12 }, { wch: 40 }, { wch: 14 }, { wch: 16 }, { wch: 40 },
      { wch: 10 }, { wch: 16 }, { wch: 40 }, { wch: 50 }, { wch: 14 },
      { wch: 16 }, { wch: 30 }, { wch: 30 }
    ];
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 12 } }];

    XLSX.utils.book_append_sheet(wb, ws, 'Casos de Prueba');

    const wsValores = XLSX.utils.aoa_to_sheet([
      ['Campo', 'Valores Permitidos'],
      ['Tipo de Prueba', this.TIPOS_VALIDOS.join(' | ')],
      ['Prioridad',      this.PRIORIDADES_VALIDAS.join(' | ')],
      ['Estado QA',      this.ESTADOS_VALIDOS.join(' | ')],
      ['Resultado',      this.RESULTADOS_VALIDOS.join(' | ')]
    ]);
    wsValores['!cols'] = [{ wch: 18 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsValores, 'Valores Válidos');

    XLSX.writeFile(wb, 'plantilla_casos_prueba_DLWLatam.xlsx');
  }

  // ─── Carga de archivo ────────────────────────────────────────────────────

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    this.archivo = input.files[0];
    this.errorArchivo = '';
    this.filas = [];
    this.resultadoImport = null;

    const extension = this.archivo.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls'].includes(extension ?? '')) {
      this.errorArchivo = 'Solo se permiten archivos .xlsx o .xls';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const wb   = XLSX.read(data, { type: 'array' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][];
      this.parsearFilas(rows);
    };
    reader.readAsArrayBuffer(this.archivo);
  }

  private parsearFilas(rows: string[][]): void {
    this.rawRows = rows;

    const headerIdx = rows.findIndex(r =>
      r.some(c => String(c).includes('Nombre del Caso de Prueba'))
    );
    if (headerIdx === -1) {
      this.errorArchivo = 'No se encontró la fila de encabezados. Use la plantilla oficial.';
      return;
    }

    const dataRows = rows.slice(headerIdx + 1).filter(r => r.some(c => String(c).trim()));

    this.filas = dataRows.map((row, i) => {
      const [
        codigoCP = '', nombreCasoPrueba = '', claveProyecto = '', tipoPrueba = '',
        descripcionCasoPrueba = '', prioridad = '', estadoQA = '', resultadoEsperado = '',
        pasosDePrueba = '', requerimientoRF = '', resultado = '', observaciones = '', evidenciaUrl = ''
      ] = row.map(c => String(c ?? '').trim());

      const errores: string[] = [];

      if (!nombreCasoPrueba) errores.push('Nombre del Caso de Prueba es requerido');
      if (!tipoPrueba)
        errores.push('Tipo de Prueba es requerido');
      else if (!this.TIPOS_VALIDOS.includes(tipoPrueba as TipoPrueba))
        errores.push(`Tipo de Prueba inválido: "${tipoPrueba}". Valores: ${this.TIPOS_VALIDOS.join(', ')}`);
      if (!descripcionCasoPrueba) errores.push('Descripción es requerida');
      if (!prioridad)
        errores.push('Prioridad es requerida');
      else if (!this.PRIORIDADES_VALIDAS.includes(prioridad as PrioridadCasoPrueba))
        errores.push(`Prioridad inválida: "${prioridad}". Valores: ${this.PRIORIDADES_VALIDAS.join(', ')}`);
      if (!estadoQA)
        errores.push('Estado QA es requerido');
      else if (!this.ESTADOS_VALIDOS.includes(estadoQA as EstadoCasoPrueba))
        errores.push(`Estado QA inválido: "${estadoQA}". Valores: ${this.ESTADOS_VALIDOS.join(', ')}`);
      if (!resultadoEsperado) errores.push('Resultado Esperado es requerido');
      if (!pasosDePrueba)     errores.push('Pasos de Prueba es requerido');
      if (resultado && !this.RESULTADOS_VALIDOS.includes(resultado as ResultadoCasoPrueba))
        errores.push(`Resultado inválido: "${resultado}". Valores: ${this.RESULTADOS_VALIDOS.join(', ')}`);

      // Validate Clave Proyecto against selected project
      if (claveProyecto && this.proyectoActual && claveProyecto !== this.proyectoActual.codigo) {
        errores.push(`Clave Proyecto "${claveProyecto}" no coincide con el proyecto seleccionado (${this.proyectoActual.codigo})`);
      }

      // Resolve Requerimiento RF → requerimientoId
      let requerimientoId: number | null = null;
      if (requerimientoRF) {
        const req = this.requerimientosProyecto.find(r => r.codigo === requerimientoRF);
        if (req) {
          requerimientoId = req.id;
        } else if (this.requerimientosProyecto.length > 0) {
          errores.push(`Requerimiento "${requerimientoRF}" no existe en el proyecto seleccionado`);
        }
      }

      return {
        fila: headerIdx + i + 2,
        codigoCP, nombreCasoPrueba, claveProyecto, tipoPrueba, descripcionCasoPrueba,
        prioridad, estadoQA, resultadoEsperado, pasosDePrueba, requerimientoRF, requerimientoId,
        resultado, observaciones, evidenciaUrl,
        errores,
        valido: errores.length === 0
      };
    });
  }

  // ─── Importación ─────────────────────────────────────────────────────────

  importar(): void {
    if (!this.filasValidas.length || !this.proyectoId) return;
    this.importando = true;
    this.resultadoImport = null;

    const casos = this.filasValidas.map(f => ({
      codigo:            f.codigoCP           || undefined,
      nombre:            f.nombreCasoPrueba,
      proyectoId:        this.proyectoId!,
      claveProyecto:     f.claveProyecto      || undefined,
      tipo:              f.tipoPrueba          as TipoPrueba,
      descripcion:       f.descripcionCasoPrueba,
      prioridad:         f.prioridad           as PrioridadCasoPrueba,
      estado:            f.estadoQA            as EstadoCasoPrueba,
      resultado:        (f.resultado           as ResultadoCasoPrueba) || ResultadoCasoPrueba.SIN_EJECUTAR,
      resultadoEsperado: f.resultadoEsperado,
      pasos:             this.parsearPasos(f.pasosDePrueba),
      requerimientoRf:   f.requerimientoRF    || undefined,
      requerimientoId:   f.requerimientoId    ?? undefined,
      observaciones:     f.observaciones      || undefined,
      evidenciaUrl:      f.evidenciaUrl       || undefined
    }));

    this.service.importarDesdeExcel({ casos }).subscribe({
      next: (res) => { this.resultadoImport = res; this.importando = false; },
      error: (err) => {
        this.resultadoImport = {
          importados: 0,
          errores: [{ fila: 0, mensaje: err.error?.message || 'Error al importar' }]
        };
        this.importando = false;
      }
    });
  }

  private parsearPasos(texto: string): Paso[] {
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

  limpiar(): void {
    this.archivo = null;
    this.filas   = [];
    this.rawRows = [];
    this.resultadoImport = null;
    this.errorArchivo    = '';
  }
}
