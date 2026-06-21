export interface DocumentoRequerimiento {
  itemId: string;
  nombre: string;
  url: string;
  tamano: number;
  subidoEn: string;
}

export enum EstadoProyecto {
  POR_ESTIMAR   = 'Por estimar',
  ESTIMADO      = 'Estimado',
  OBSERVADO     = 'Observado',
  PLANIFICADO   = 'Planificado',
  EN_EJECUCION  = 'En Ejecución',
  FINALIZADO    = 'Finalizado',
  EN_PRODUCCION = 'En Produccion',
}

export interface Proyecto {
  id: number;

  // Identificación
  codigo: string;           // campo "Proyecto" en SharePoint
  nombre: string;           // Nombre Proyecto (requerido)
  cliente: string;          // Cliente (requerido)
  sistema?: string;         // Sistema

  // Responsables
  responsableQaId?: number;
  responsableQaNombre?: string;    // Responsable QA
  jefeProyectoId: number;
  jefeProyectoNombre?: string;     // Jefe de Proyecto (requerido)
  jefeQaId: number;
  jefeQaNombre?: string;           // Jefe QA (requerido)

  // Estado y avance
  estado: EstadoProyecto;          // Estado (requerido)
  porcentajeAvance: number;        // % casos ejecutados / total
  porcentajeAprobacion?: number;   // % casos aprobados / ejecutados
  horasQa?: number;                // HorasQA

  // Fechas planificadas
  fechaEstimacion?: Date;          // Fecha estimacion
  fechaInicioPlanificada?: Date;   // Fecha inicio planificada
  fechaFinPlanificada?: Date;      // Fecha fin planificada

  // Fechas reales
  fechaInicioReal?: Date;          // Fecha inicio real
  fechaFinReal?: Date;             // Fecha fin real

  // Otros
  repositorioUrl?: string;         // Repositorio URL
  documentoUrl?: string;           // URL documento estimación / planificación
  notas?: string;                  // Notas
  documentosRequerimientos?: DocumentoRequerimiento[];

  // Auditoría (SharePoint las genera automáticamente)
  creadoEn: Date;
  actualizadoEn: Date;
  creadoPor?: number;
}

export interface ProyectoResumen {
  id: number;
  nombre: string;
  codigo: string;
  cliente: string;
  estado: EstadoProyecto;
  porcentajeAvance: number;
  totalRequerimientos: number;
  totalCasosPrueba: number;
  totalDefectos: number;
  defectosAbiertos: number;
}
