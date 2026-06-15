import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import * as XLSX from 'xlsx';
import { TestCaseService } from '../../../core/services/test-case.service';
import { CasoPrueba, EstadoQA, PrioridadCasoPrueba, ResultadoCasoPrueba, TipoPrueba, ImportacionResultado } from '../../../core/models';

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
  resultado: string;
  observaciones: string;
  evidenciaUrl: string;
  errores: string[];
  valido: boolean;
}

@Component({
  selector: 'app-test-case-import',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './test-case-import.component.html'
})
export class TestCaseImportComponent {
  private service = inject(TestCaseService);

  // Valores permitidos para validación
  private readonly TIPOS_VALIDOS = Object.values(TipoPrueba);
  private readonly PRIORIDADES_VALIDAS = Object.values(PrioridadCasoPrueba);
  private readonly ESTADOS_QA_VALIDOS = Object.values(EstadoQA);
  private readonly RESULTADOS_VALIDOS = Object.values(ResultadoCasoPrueba);

  // Columnas del template en orden
  readonly COLUMNAS_TEMPLATE = [
    'Codigo CP', 'Nombre del Caso de Prueba *', 'Clave Proyecto *',
    'Tipo de Prueba *', 'Descripcion del Caso de Prueba *', 'Prioridad *',
    'Estado QA *', 'Resultado Esperado *', 'Pasos de Prueba *',
    'Requerimiento RF *', 'Resultado', 'Observaciones', 'Evidencia URL'
  ];

  archivo: File | null = null;
  filas: FilaPrevia[] = [];
  importando = false;
  resultadoImport: ImportacionResultado | null = null;
  errorArchivo = '';

  get filasValidas(): FilaPrevia[] { return this.filas.filter(f => f.valido); }
  get filasConError(): FilaPrevia[] { return this.filas.filter(f => !f.valido); }

  // ─── Plantilla ───────────────────────────────────────────────────────────

  descargarPlantilla(): void {
    const wb = XLSX.utils.book_new();

    // Hoja 1: Plantilla
    const instruccion = [['Sistema QA DLWLatam — Plantilla de Carga de Casos de Prueba']];
    const encabezados = [this.COLUMNAS_TEMPLATE];
    const ejemplo = [[
      'CP-001',
      'Verificar login con credenciales válidas',
      'PROJ-01',
      'Funcional',
      'Comprobar que un usuario registrado pueda iniciar sesión correctamente',
      'Alta',
      'Pendiente',
      'El sistema muestra el dashboard del usuario',
      '1. Ir a /login\n2. Ingresar email: usuario@test.com\n3. Ingresar contraseña: 123456\n4. Clic en Iniciar Sesión',
      'RF-001',
      'No Ejecutado',
      '',
      ''
    ]];

    const wsData = [...instruccion, [], encabezados[0], ...ejemplo];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Anchos de columna
    ws['!cols'] = [
      { wch: 12 }, { wch: 40 }, { wch: 14 }, { wch: 16 }, { wch: 40 },
      { wch: 10 }, { wch: 16 }, { wch: 40 }, { wch: 50 }, { wch: 14 },
      { wch: 16 }, { wch: 30 }, { wch: 30 }
    ];
    // Fusionar celda de título
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 12 } }];

    XLSX.utils.book_append_sheet(wb, ws, 'Casos de Prueba');

    // Hoja 2: Valores válidos
    const wsValores = XLSX.utils.aoa_to_sheet([
      ['Campo', 'Valores Permitidos'],
      ['Tipo de Prueba', this.TIPOS_VALIDOS.join(' | ')],
      ['Prioridad', this.PRIORIDADES_VALIDAS.join(' | ')],
      ['Estado QA', this.ESTADOS_QA_VALIDOS.join(' | ')],
      ['Resultado', this.RESULTADOS_VALIDOS.join(' | ')]
    ]);
    wsValores['!cols'] = [{ wch: 18 }, { wch: 70 }];
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
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][];
      this.parsearFilas(rows);
    };
    reader.readAsArrayBuffer(this.archivo);
  }

  private parsearFilas(rows: string[][]): void {
    // Buscar fila de encabezados (contiene "Nombre del Caso de Prueba")
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
      if (!claveProyecto)    errores.push('Clave Proyecto es requerido');
      if (!tipoPrueba)       errores.push('Tipo de Prueba es requerido');
      else if (!this.TIPOS_VALIDOS.includes(tipoPrueba as TipoPrueba))
        errores.push(`Tipo de Prueba inválido: "${tipoPrueba}"`);
      if (!descripcionCasoPrueba) errores.push('Descripción es requerida');
      if (!prioridad) errores.push('Prioridad es requerida');
      else if (!this.PRIORIDADES_VALIDAS.includes(prioridad as PrioridadCasoPrueba))
        errores.push(`Prioridad inválida: "${prioridad}"`);
      if (!estadoQA) errores.push('Estado QA es requerido');
      else if (!this.ESTADOS_QA_VALIDOS.includes(estadoQA as EstadoQA))
        errores.push(`Estado QA inválido: "${estadoQA}"`);
      if (!resultadoEsperado) errores.push('Resultado Esperado es requerido');
      if (!pasosDePrueba)     errores.push('Pasos de Prueba es requerido');
      if (!requerimientoRF)   errores.push('Requerimiento RF es requerido');
      if (resultado && !this.RESULTADOS_VALIDOS.includes(resultado as ResultadoCasoPrueba))
        errores.push(`Resultado inválido: "${resultado}"`);

      return {
        fila: headerIdx + i + 2,
        codigoCP, nombreCasoPrueba, claveProyecto, tipoPrueba, descripcionCasoPrueba,
        prioridad, estadoQA, resultadoEsperado, pasosDePrueba, requerimientoRF,
        resultado, observaciones, evidenciaUrl,
        errores,
        valido: errores.length === 0
      };
    });
  }

  // ─── Importación ─────────────────────────────────────────────────────────

  importar(): void {
    if (!this.filasValidas.length) return;
    this.importando = true;
    this.resultadoImport = null;

    const casos: Partial<CasoPrueba>[] = this.filasValidas.map(f => ({
      codigoCP: f.codigoCP || undefined,
      nombreCasoPrueba: f.nombreCasoPrueba,
      claveProyecto: f.claveProyecto,
      tipoPrueba: f.tipoPrueba as TipoPrueba,
      descripcionCasoPrueba: f.descripcionCasoPrueba,
      prioridad: f.prioridad as PrioridadCasoPrueba,
      estadoQA: f.estadoQA as EstadoQA,
      resultadoEsperado: f.resultadoEsperado,
      pasosDePrueba: f.pasosDePrueba,
      requerimientoRF: f.requerimientoRF,
      resultado: (f.resultado as ResultadoCasoPrueba) || ResultadoCasoPrueba.NO_EJECUTADO,
      observaciones: f.observaciones || undefined,
      evidenciaUrl: f.evidenciaUrl || undefined
    }));

    this.service.importarDesdeExcel(casos).subscribe({
      next: (res) => { this.resultadoImport = res; this.importando = false; },
      error: (err) => {
        this.resultadoImport = { importados: 0, errores: [{ fila: 0, mensaje: err.error?.message || 'Error al importar' }] };
        this.importando = false;
      }
    });
  }

  limpiar(): void {
    this.archivo = null;
    this.filas = [];
    this.resultadoImport = null;
    this.errorArchivo = '';
  }
}
