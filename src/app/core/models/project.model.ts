export enum EstadoProyecto {
  POR_ESTIMAR = 'Por estimar',
  ESTIMADO = 'Estimado',
  PLANIFICADO = 'Planificado',
  EN_EJECUCION = 'En ejecución',
  OBSERVADO = 'Observado',
  EN_PRODUCCION = 'En producción',
  FINALIZADO = 'Finalizado'
}

export interface Proyecto {
  id: number;

  // Identificación
  codigo: string;           // campo "Proyecto" en SharePoint
  nombre: string;           // Nombre Proyecto (requerido)
  cliente: string;          // Cliente (requerido)
  sistema?: string;         // Sistema

  // Responsables
  responsableQAId?: number;
  responsableQANombre?: string;    // Responsable QA
  jefeProyectoId: number;
  jefeProyectoNombre?: string;     // Jefe de Proyecto (requerido)
  jefeQAId: number;
  jefeQANombre?: string;           // Jefe QA (requerido)

  // Estado y avance
  estado: EstadoProyecto;          // Estado (requerido)
  iteracion?: number;              // Iteración
  porcentajeAvance: number;        // % Avance (requerido)
  horasQA?: number;                // HorasQA

  // Fechas planificadas
  fechaEstimacion?: Date;          // Fecha estimacion
  fechaInicioPlanificada?: Date;   // Fecha inicio planificada
  fechaFinPlanificada?: Date;      // Fecha fin planificada

  // Fechas reales
  fechaInicioReal?: Date;          // Fecha inicio real
  fechaFinReal?: Date;             // Fecha fin real

  // Otros
  repositorioUrl?: string;         // Repositorio URL
  notas?: string;                  // Notas

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
