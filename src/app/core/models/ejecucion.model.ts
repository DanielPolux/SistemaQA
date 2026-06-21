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

export interface EjecucionCasoPrueba {
  id: number;
  casoPruebaId: number;
  casoPruebaCodigo?: string;
  casoPruebaNombre?: string;
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
  version: string;
  resultado: ResultadoEjecucion;
  resultadoObtenido: string;
  evidenciaUrl?: string;
  defectoId?: number;
  defectoCodigo?: string;
  defectoTitulo?: string;
  desarrolladorId?: number;
  desarrolladorNombre?: string;
  observaciones?: string;
  creadoEn: Date;
}
