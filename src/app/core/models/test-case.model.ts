export enum TipoPrueba {
  FUNCIONAL = 'Funcional',
  REGRESION = 'Regresión',
  HUMO = 'Humo',
  INTEGRACION = 'Integración',
  RENDIMIENTO = 'Rendimiento',
  SEGURIDAD = 'Seguridad',
  USABILIDAD = 'Usabilidad',
  EXPLORATORIA = 'Exploratoria'
}

export enum PrioridadCasoPrueba {
  ALTA = 'Alta',
  MEDIA = 'Media',
  BAJA = 'Baja'
}

export enum EstadoQA {
  PENDIENTE = 'Pendiente',
  EN_EJECUCION = 'En Ejecución',
  BLOQUEADO = 'Bloqueado',
  COMPLETADO = 'Completado'
}

export enum ResultadoCasoPrueba {
  NO_EJECUTADO = 'No Ejecutado',
  APROBADO = 'Aprobado',
  FALLIDO = 'Fallido',
  BLOQUEADO = 'Bloqueado'
}

export interface CasoPrueba {
  id: number;

  // Identificación
  codigoCP?: string;                  // Codigo CP
  nombreCasoPrueba: string;           // Nombre del Caso de Prueba (requerido)
  proyectoId: number;                 // Proyecto — Búsqueda (requerido)
  proyectoNombre?: string;
  claveProyecto?: string;             // ClaveProyecto (texto)

  // Tipo y descripción
  tipoPrueba: TipoPrueba;             // Tipo de Prueba (requerido)
  descripcionCasoPrueba: string;      // Descripción del Caso de Prueba (requerido)

  // Pasos y resultado
  pasosDePrueba: string;              // Pasos de Prueba (texto libre, requerido)
  resultadoEsperado: string;          // Resultado Esperado (requerido)

  // Clasificación
  prioridad: PrioridadCasoPrueba;     // Prioridad (requerido)
  estadoQA: EstadoQA;                 // Estado QA (requerido)
  resultado?: ResultadoCasoPrueba;    // Resultado

  // Ejecución
  responsableQAId?: number;
  responsableQANombre?: string;       // Responsable QA
  fechaEjecucion?: Date;             // Fecha Ejecución
  evidenciaUrl?: string;             // Evidencia (hipervínculo)
  observaciones?: string;            // Observaciones

  // Requerimiento
  requerimientoRF?: string;          // Requerimiento RF (texto, requerido)
  rfId?: number;                     // RF — Búsqueda

  // Defectos
  defectosAsociadosIds?: number[];
  totalDefectos?: number;

  // Auditoría
  creadoEn: Date;
  actualizadoEn: Date;
  creadoPor?: number;
}

export interface ImportacionResultado {
  importados: number;
  errores: { fila: number; mensaje: string }[];
}
