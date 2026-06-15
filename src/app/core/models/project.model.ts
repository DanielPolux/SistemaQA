export enum EstadoProyecto {
  ACTIVO = 'Activo',
  INACTIVO = 'Inactivo',
  COMPLETADO = 'Completado',
  EN_PAUSA = 'En Pausa'
}

export interface Proyecto {
  id: number;
  nombre: string;
  descripcion: string;
  codigo: string;
  fechaInicio: Date;
  fechaFin?: Date;
  estado: EstadoProyecto;
  responsableId: number;
  responsableNombre?: string;
  creadoPor: number;
  creadoEn: Date;
  actualizadoEn: Date;
}

export interface ProyectoResumen {
  id: number;
  nombre: string;
  codigo: string;
  estado: EstadoProyecto;
  totalRequerimientos: number;
  totalCasosPrueba: number;
  totalDefectos: number;
  defectosAbiertos: number;
}
