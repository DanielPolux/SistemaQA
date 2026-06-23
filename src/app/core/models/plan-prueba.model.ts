export enum EstadoPlan {
  BORRADOR     = 'Borrador',
  PLANIFICADO  = 'Planificado',
  EN_EJECUCION = 'En ejecución',
  CERRADO      = 'Cerrado',
}

export const TIPOS_PRUEBA = [
  'Funcional',
  'Regresión',
  'Humo',
  'Integración',
  'UAT',
  'Performance',
  'Seguridad',
  'Exploratorio',
] as const;

export const AMBIENTES_PLAN = [
  'Desarrollo',
  'QA',
  'Staging',
  'Pre-producción',
  'Producción',
] as const;

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
  sprint?: string | null;
  tipoPrueba?: string | null;
  ambiente?: string | null;
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

export interface TrazabilidadDefecto {
  id: number;
  codigoProyecto: string;
  titulo: string;
  estado: string;
  severidad: string;
}

export interface TrazabilidadCaso {
  id: number;
  codigo: string;
  titulo: string;
  tipo: string;
  prioridad: string;
  ultimoResultado: string | null;
  ultimaEjecucionFecha: string | null;
  defectos: TrazabilidadDefecto[];
}

export interface TrazabilidadReq {
  id: number;
  codigo: string;
  titulo: string;
  prioridad: string;
  estado: string;
  casos: TrazabilidadCaso[];
}

export interface TrazabilidadPlan {
  planId: number;
  planNombre: string;
  proyectoNombre: string | null;
  requerimientos: TrazabilidadReq[];
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
