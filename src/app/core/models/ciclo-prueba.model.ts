export enum EstadoCiclo {
  PLANIFICADO  = 'Planificado',
  EN_EJECUCION = 'En ejecución',
  CERRADO      = 'Cerrado',
}

export interface CicloPrueba {
  id: number;
  proyectoId: number;
  proyectoNombre?: string;
  proyectoCodigo?: string;
  nombre: string;
  descripcion?: string;
  ambiente?: string;
  estado: EstadoCiclo;
  fechaInicio?: string;
  fechaFin?: string;
  fechaInicioReal?: string | null;
  fechaFinReal?: string | null;
  creadoPor: number;
  creadoPorNombre?: string;
  responsableQaId?: number | null;
  responsableQaNombre?: string | null;
  creadoEn: Date;
  actualizadoEn: Date;
  totalEjecuciones?: number;
  planPruebaId?: number | null;
  planNombre?: string | null;
  resultadoGlobal?: string;
  recomendacionQa?: string;
  conclusionQa?: string;
  informeVersion?: number;
  informeId?: number;
  resumen?: any;
}
