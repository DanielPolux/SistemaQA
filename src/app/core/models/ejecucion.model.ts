export enum ResultadoEjecucion {
  APROBADO  = 'Aprobado',
  FALLIDO   = 'Fallido',
  BLOQUEADO = 'Bloqueado',
  OMITIDO   = 'Omitido',
}

export enum AmbienteEjecucion {
  DESARROLLO = 'Desarrollo',
  QA         = 'QA',
  STAGING    = 'Staging',
  PRODUCCION = 'Producción',
}

export enum TipoEjecucion {
  MANUAL       = 'Manual',
  AUTOMATIZADA = 'Automatizada',
}

export interface EjecucionCasoPrueba {
  id: number;
  casoPruebaId: number;
  casoPruebaCodigo?: string;
  casoPruebaNombre?: string;
  casoPruebaDescripcion?: string;
  proyectoId: number;
  proyectoNombre?: string;
  proyectoCodigo?: string;
  cicloPrueba?: string;
  cicloId?: number;
  cicloNombre?: string;
  cicloEstado?: string;
  testerId: number;
  testerNombre?: string;
  fecha: Date;
  ambiente: AmbienteEjecucion;
  tipoEjecucion?: TipoEjecucion;
  version: string;
  resultado: ResultadoEjecucion;
  resultadoObtenido: string;
  evidencias?: { url: string; nombre: string }[];
  defectoId?: number;
  defectoCodigo?: string;
  defectoTitulo?: string;
  bloqueadoPorCasoId?: number;
  bloqueadoPorCasoCodigo?: string;
  bloqueadoPorCasoNombre?: string;
  desarrolladorId?: number;
  desarrolladorNombre?: string;
  observaciones?: string;
  creadoEn: Date;
}
