export enum TipoCasoPrueba {
  FUNCIONAL = 'Funcional',
  REGRESION = 'Regresión',
  HUMO = 'Humo',
  INTEGRACION = 'Integración',
  RENDIMIENTO = 'Rendimiento',
  SEGURIDAD = 'Seguridad',
  USABILIDAD = 'Usabilidad'
}

export enum PrioridadCasoPrueba {
  ALTA = 'Alta',
  MEDIA = 'Media',
  BAJA = 'Baja'
}

export enum EstadoCasoPrueba {
  PENDIENTE = 'Pendiente',
  EN_EJECUCION = 'En Ejecución',
  APROBADO = 'Aprobado',
  FALLIDO = 'Fallido',
  BLOQUEADO = 'Bloqueado',
  OMITIDO = 'Omitido'
}

export interface PasoPrueba {
  orden: number;
  descripcion: string;
  resultadoEsperado: string;
}

export interface CasoPrueba {
  id: number;
  proyectoId: number;
  proyectoNombre?: string;
  requerimientoId?: number;
  requerimientoCodigo?: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  precondiciones: string;
  pasos: PasoPrueba[];
  resultadoEsperado: string;
  tipo: TipoCasoPrueba;
  prioridad: PrioridadCasoPrueba;
  estado: EstadoCasoPrueba;
  asignadoA?: number;
  asignadoANombre?: string;
  creadoPor: number;
  creadoPorNombre?: string;
  creadoEn: Date;
  actualizadoEn: Date;
  totalDefectos?: number;
}
