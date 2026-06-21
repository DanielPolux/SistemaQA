export enum EstadoPlan {
  ACTIVO  = 'Activo',
  CERRADO = 'Cerrado',
}

export interface PlanPrueba {
  id: number;
  proyectoId: number;
  proyectoNombre?: string;
  proyectoCodigo?: string;
  nombre: string;
  descripcion?: string;
  objetivo: string;
  alcance?: string;
  fueraAlcance?: string;
  criteriosEntrada?: string;
  criteriosSalida?: string;
  riesgos?: string;
  responsableId?: number | null;
  responsableNombre?: string | null;
  estado: EstadoPlan;
  fechaInicio?: string;
  fechaObjetivo?: string;
  creadoEn: Date;
  actualizadoEn: Date;
  // Stats (list)
  totalCiclos?: number;
  ciclosCerrados?: number;
  totalEjecuciones?: number;
  aprobados?: number;
  fallidos?: number;
  // Detail only
  ciclos?: PlanCicloResumen[];
  requerimientos?: PlanReqCobertura[];
  requerimientoIds?: number[];
  totalRequerimientos?: number;
}

export interface PlanReqCobertura {
  id: number;
  codigo: string;
  titulo: string;
  prioridad: string;
  estadoReq: string;
  totalCasos: number;
  casosEjecutados: number;
  casosAprobados: number;
  casosFallidos: number;
  estadoValidacion: 'Validado' | 'Con fallas' | 'En progreso' | 'Sin ejecutar' | 'Sin casos';
}

export interface PlanCicloResumen {
  id: number;
  nombre: string;
  ambiente?: string;
  estado: string;
  fechaInicio?: string;
  fechaFin?: string;
  creadoEn: Date;
  totalEjecuciones: number;
  aprobados: number;
  fallidos: number;
  omitidos: number;
}
