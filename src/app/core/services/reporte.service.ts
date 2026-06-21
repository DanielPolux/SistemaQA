import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ReporteResumen {
  casosTotales: number;
  casosEjecutados: number;
  casosAprobados: number;
  casosFallidos: number;
  totalDefectos: number;
  defectosAbiertos: number;
  porcentajeAvance: number;
  porcentajeAprobacion: number;
}

export interface ChartItem { label: string; valor: number; }

export interface AvanceCiclo {
  ciclo: string;
  aprobados: number;
  fallidos: number;
  bloqueados: number;
  omitidos: number;
  total: number;
}

export interface ReporteProyecto {
  proyecto: { id: number; nombre: string; codigo: string; cliente: string; estado: string };
  resumen: ReporteResumen;
  casosPorEstado: ChartItem[];
  resultadosEjecucion: ChartItem[];
  defectosPorSeveridad: ChartItem[];
  defectosPorEstado: ChartItem[];
  defectosPorPrioridad: ChartItem[];
  avancePorCiclo: AvanceCiclo[];
}

@Injectable({ providedIn: 'root' })
export class ReporteService {
  private readonly url = `${environment.apiUrl}/reportes`;

  constructor(private http: HttpClient) {}

  getReporteProyecto(id: number): Observable<ReporteProyecto> {
    return this.http.get<ReporteProyecto>(`${this.url}/proyecto/${id}`);
  }
}
