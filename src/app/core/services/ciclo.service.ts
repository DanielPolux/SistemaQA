import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CicloPrueba } from '../models';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from './project.service';

export interface FiltroCiclo {
  proyectoId?: number;
  estado?: string;
  pagina?: number;
  porPagina?: number;
}

export interface CasoPrevio {
  id: number;
  codigo: string;
  nombre: string;
  resultado: 'Aprobado' | 'Fallido' | 'Bloqueado' | 'Omitido';
  cicloNombre: string;
}

export interface CasoCiclo {
  id: number;
  codigo: string;
  nombre: string;
  tipo: string;
  prioridad: string;
  estado: string;
  descripcion?: string;
  pasos?: any[];
  resultadoEsperado?: string;
  proyectoId?: number;
  resultadoCiclo?: 'Aprobado' | 'Fallido' | 'Bloqueado' | 'Omitido';
  ejecucionId?: number;
  fechaEjecucion?: string;
}

@Injectable({ providedIn: 'root' })
export class CicloService {
  private readonly url = `${environment.apiUrl}/ciclos-prueba`;

  constructor(private http: HttpClient) {}

  getAll(filtro?: FiltroCiclo): Observable<PaginatedResponse<CicloPrueba>> {
    let params = new HttpParams();
    if (filtro) {
      Object.entries(filtro).forEach(([k, v]) => {
        if (v !== undefined && v !== null) params = params.set(k, String(v));
      });
    }
    return this.http.get<PaginatedResponse<CicloPrueba>>(this.url, { params });
  }

  getById(id: number): Observable<CicloPrueba> {
    return this.http.get<CicloPrueba>(`${this.url}/${id}`);
  }

  getActivoByProyecto(proyectoId: number): Observable<CicloPrueba | null> {
    return this.http.get<CicloPrueba | null>(`${this.url}/activo/${proyectoId}`);
  }

  getCasosPrevios(proyectoId: number): Observable<{ tieneHistorial: boolean; casos: CasoPrevio[] }> {
    return this.http.get<{ tieneHistorial: boolean; casos: CasoPrevio[] }>(
      `${this.url}/casos-previos/${proyectoId}`,
    );
  }

  getCasosDeCiclo(cicloId: number): Observable<CasoCiclo[]> {
    return this.http.get<CasoCiclo[]>(`${this.url}/${cicloId}/casos`);
  }

  create(ciclo: any): Observable<CicloPrueba> {
    return this.http.post<CicloPrueba>(this.url, ciclo);
  }

  update(id: number, ciclo: Partial<CicloPrueba>): Observable<CicloPrueba> {
    return this.http.put<CicloPrueba>(`${this.url}/${id}`, ciclo);
  }

  cerrar(id: number): Observable<CicloPrueba> {
    return this.http.patch<CicloPrueba>(`${this.url}/${id}/cerrar`, {});
  }

  reabrir(id: number): Observable<CicloPrueba> {
    return this.http.patch<CicloPrueba>(`${this.url}/${id}/reabrir`, {});
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
