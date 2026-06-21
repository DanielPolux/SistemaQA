import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuditoriaRegistro {
  id: number;
  entidad: string;
  entidadId: number;
  usuarioId: number | null;
  usuarioNombre: string | null;
  accion: string;
  campo: string | null;
  valorAnterior: string | null;
  valorNuevo: string | null;
  fecha: string;
}

@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private readonly url = `${environment.apiUrl}/auditoria`;

  constructor(private http: HttpClient) {}

  getByCasoPrueba(casoPruebaId: number): Observable<AuditoriaRegistro[]> {
    return this.http.get<AuditoriaRegistro[]>(`${this.url}/caso-prueba/${casoPruebaId}`);
  }

  getByDefecto(defectoId: number): Observable<AuditoriaRegistro[]> {
    return this.http.get<AuditoriaRegistro[]>(`${this.url}/defecto/${defectoId}`);
  }
}
