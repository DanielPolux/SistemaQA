import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DashboardStats {
  resumen: {
    proyectos_activos: number;
    casos_totales: number;
    casos_ejecutados: number;
    defectos_abiertos: number;
    avance_promedio: number;
    mis_casos: number;
    mis_defectos_abiertos: number;
    mis_defectos_reportados: number;
    defectos_pendientes_verificacion: number;
  };
  casosPorEstado:        { estado: string; total: number }[];
  defectosPorSeveridad:  { severidad: string; total: number }[];
  defectosPorEstado:     { estado: string; total: number }[];
  proyectosAvance: {
    id: number; codigo: string; nombre: string; estado: string;
    porcentaje_avance: number; casos_totales: number;
    casos_ejecutados: number; defectos_abiertos: number;
  }[];
  misCasos:              { estado: string; total: number }[];
  misDefectosAsignados:  { severidad?: string; estado?: string; total: number }[];
  misDefectosPendientesVerificacion: {
    id: number; codigo: string; codigoProyecto: string; titulo: string;
    severidad: string; estadoDesarrollo: string; comentariosDesarrollo: string | null;
    proyecto_nombre: string; desarrollador_nombre: string; actualizado_en: string;
  }[];
  ultimosDefectos: {
    id: number; codigo: string; titulo: string; severidad: string;
    estado: string; prioridad: string; proyecto_nombre: string;
    reportado_por_nombre: string; creado_en: string;
  }[];
  ultimasEjecuciones: {
    id: number; caso_codigo: string; caso_nombre: string;
    resultado: string; ambiente: string; fecha: string;
    tester_nombre: string; proyecto_nombre: string;
  }[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly url = `${environment.apiUrl}/dashboard`;
  constructor(private http: HttpClient) {}

  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(this.url);
  }
}
