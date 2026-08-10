import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Evidencia {
  url: string;
  nombre: string;
}

@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly url = `${environment.apiUrl}/uploads`;

  constructor(private http: HttpClient) {}

  subir(file: File): Observable<Evidencia> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<Evidencia>(this.url, formData);
  }

  /**
   * El backend devuelve una ruta relativa a su propio origen (ej: "/api/uploads/2026-08/x.png").
   * En producción `environment.apiUrl` es "/api" (mismo origen vía nginx) así que la ruta ya
   * funciona tal cual. En desarrollo `environment.apiUrl` apunta directo a "http://localhost:3000/api"
   * (sin proxy), así que hay que anteponer ese origen o el navegador la resuelve contra
   * localhost:4200 y da 404.
   */
  resolverUrl(rutaRelativa: string): string {
    const origen = environment.apiUrl.replace(/\/api\/?$/, '');
    return origen + rutaRelativa;
  }
}
