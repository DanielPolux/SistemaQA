export enum TipoPrueba {
  FUNCIONAL   = 'Funcional',
  REGRESION   = 'Regresión',
  HUMO        = 'Humo',
  INTEGRACION = 'Integración',
  RENDIMIENTO = 'Rendimiento',
  SEGURIDAD   = 'Seguridad',
  USABILIDAD  = 'Usabilidad'
}

export enum PrioridadCasoPrueba {
  ALTA  = 'Alta',
  MEDIA = 'Media',
  BAJA  = 'Baja'
}

export enum EstadoCasoPrueba {
  PENDIENTE    = 'Pendiente',
  EN_EJECUCION = 'En Ejecución',
  EJECUTADO    = 'Ejecutado',
  BLOQUEADO    = 'Bloqueado',
  OMITIDO      = 'Omitido'
}

export { EstadoCasoPrueba as EstadoQA };

export enum ResultadoCasoPrueba {
  SIN_EJECUTAR = 'Sin Ejecutar',
  APROBADO     = 'Aprobado',
  FALLIDO      = 'Fallido',
  BLOQUEADO    = 'Bloqueado',
  OMITIDO      = 'Omitido'
}

export interface Paso {
  orden: number;
  descripcion: string;
  resultadoEsperado: string;
}

export interface CasoPrueba {
  id: number;

  codigo?: string;
  nombre: string;
  proyectoId: number;
  proyectoNombre?: string;
  claveProyecto?: string;

  tipo: TipoPrueba;
  descripcion: string;

  pasos: Paso[];
  resultadoEsperado: string;

  prioridad: PrioridadCasoPrueba;
  estado: EstadoCasoPrueba;
  resultado?: ResultadoCasoPrueba;

  responsableQaId?: number;
  responsableQaNombre?: string;
  fechaEjecucion?: Date;
  evidenciaUrl?: string;
  observaciones?: string;

  requerimientoRf?: string;
  requerimientoId?: number;

  defectosAsociadosIds?: number[];
  totalDefectos?: number;

  creadoEn: Date;
  actualizadoEn: Date;
  creadoPor?: number;
}

export interface ImportacionResultado {
  importados: number;
  errores: { fila: number; mensaje: string }[];
}
