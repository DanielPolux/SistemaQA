export enum TipoRequerimiento {
  FUNCIONAL = 'Funcional',
  NO_FUNCIONAL = 'No Funcional',
  NEGOCIO = 'Negocio',
  TECNICO = 'Técnico'
}

export enum PrioridadRequerimiento {
  CRITICA = 'Crítica',
  ALTA = 'Alta',
  MEDIA = 'Media',
  BAJA = 'Baja'
}

export enum EstadoRequerimiento {
  PENDIENTE = 'Pendiente',
  EN_ANALISIS = 'En Análisis',
  APROBADO = 'Aprobado',
  EN_DESARROLLO = 'En Desarrollo',
  COMPLETADO = 'Completado',
  RECHAZADO = 'Rechazado'
}

export interface Requerimiento {
  id: number;
  proyectoId: number;
  proyectoNombre?: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  criteriosAceptacion: string;
  tipo: TipoRequerimiento;
  prioridad: PrioridadRequerimiento;
  estado: EstadoRequerimiento;
  creadoPor: number;
  creadoPorNombre?: string;
  creadoEn: Date;
  actualizadoEn: Date;
}
