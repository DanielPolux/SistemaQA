export enum SeveridadDefecto {
  CRITICO = 'Crítico',
  ALTO = 'Alto',
  MEDIO = 'Medio',
  BAJO = 'Bajo'
}

export enum PrioridadDefecto {
  URGENTE = 'Urgente',
  ALTA = 'Alta',
  MEDIA = 'Media',
  BAJA = 'Baja'
}

export enum EstadoDefecto {
  NUEVO = 'Nuevo',
  ASIGNADO = 'Asignado',
  EN_PROGRESO = 'En Progreso',
  EN_REVISION = 'En Revisión',
  RESUELTO = 'Resuelto',
  CERRADO = 'Cerrado',
  REABIERTO = 'Reabierto',
  RECHAZADO = 'Rechazado'
}

export enum AmbienteDefecto {
  DESARROLLO = 'Desarrollo',
  QA = 'QA',
  STAGING = 'Staging',
  PRODUCCION = 'Producción'
}

export enum EstadoDesarrollo {
  ATENDIDO = 'Atendido',
  NO_APLICA = 'No Aplica'
}

export interface Defecto {
  id: number;
  proyectoId: number;
  proyectoNombre?: string;
  casoPruebaId: number;
  casoPruebaCodigo?: string;
  requerimientoId?: number;
  codigo: string;
  titulo: string;
  descripcion: string;
  pasosReproduccion: string;
  resultadoObtenido: string;
  resultadoEsperado: string;
  ambiente: AmbienteDefecto;
  version: string;
  severidad: SeveridadDefecto;
  prioridad: PrioridadDefecto;
  estado: EstadoDefecto;
  asignadoA?: number;
  asignadoANombre?: string;
  reportadoPor: number;
  reportadoPorNombre?: string;
  creadoEn: Date;
  actualizadoEn: Date;
  fechaResolucion?: Date;
  estadoDesarrollo?: EstadoDesarrollo | null;
  comentarios?: ComentarioDefecto[];
}

export interface ComentarioDefecto {
  id: number;
  defectoId: number;
  usuarioId: number;
  usuarioNombre?: string;
  comentario: string;
  creadoEn: Date;
}
