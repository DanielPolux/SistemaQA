import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  mensaje: string;
  tipo: 'error' | 'success' | 'warning' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);

  mostrar(mensaje: string, tipo: Toast['tipo'] = 'error', duracion = 4000): void {
    const id = Date.now();
    this.toasts.update(t => [...t, { id, mensaje, tipo }]);
    setTimeout(() => this.cerrar(id), duracion);
  }

  cerrar(id: number): void {
    this.toasts.update(t => t.filter(x => x.id !== id));
  }

  error(mensaje: string): void   { this.mostrar(mensaje, 'error'); }
  exito(mensaje: string): void   { this.mostrar(mensaje, 'success'); }
  aviso(mensaje: string): void   { this.mostrar(mensaje, 'warning'); }
  info(mensaje: string): void    { this.mostrar(mensaje, 'info'); }
}
