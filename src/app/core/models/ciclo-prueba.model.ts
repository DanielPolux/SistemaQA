export enum EstadoCiclo {
  ACTIVO  = 'Activo',
  CERRADO = 'Cerrado',
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
  creadoPor: number;
  creadoPorNombre?: string;
  creadoEn: Date;
  actualizadoEn: Date;
  totalEjecuciones?: number;
  planPruebaId?: number | null;
  planNombre?: string | null;
}
