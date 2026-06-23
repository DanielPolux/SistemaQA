import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { Rol, Usuario } from '../../../core/models';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './user-list.component.html'
})
export class UserListComponent implements OnInit {
  private service = inject(UserService);

  usuarios: Usuario[] = [];
  total     = 0;
  pagina    = 1;
  porPagina = 10;

  get totalPaginas(): number { return Math.ceil(this.total / this.porPagina); }
  rolFiltro = '';
  busqueda = '';
  cargando = false;

  readonly roles = Object.values(Rol);

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando = true;
    this.service.getAll({
      rol: this.rolFiltro || undefined,
      busqueda: this.busqueda || undefined,
      pagina: this.pagina,
      porPagina: this.porPagina
    }).subscribe({
      next: (res) => {
        this.usuarios = res.datos; this.total = res.total; this.cargando = false;
        if (res.datos.length === 0 && this.pagina > 1) { this.pagina = Math.max(1, this.totalPaginas); this.cargar(); }
      },
      error: () => { this.cargando = false; }
    });
  }

  cambiarEstado(usuario: Usuario): void {
    this.service.cambiarEstado(usuario.id, !usuario.activo).subscribe(u => {
      const idx = this.usuarios.findIndex(x => x.id === u.id);
      if (idx !== -1) this.usuarios[idx] = u;
    });
  }

  buscar(): void { this.pagina = 1; this.cargar(); }
  cambiarPagina(p: number): void { this.pagina = p; this.cargar(); }
  get paginas(): number[] { return Array.from({ length: this.totalPaginas }, (_, i) => i + 1); }

  // ─── Modal confirmación eliminar ─────────────────────────────────────────
  modalConfirmarAbierto = signal(false);
  confirmPendiente: { id: number; nombre: string } | null = null;

  eliminar(id: number, nombre: string): void {
    this.confirmPendiente = { id, nombre };
    this.modalConfirmarAbierto.set(true);
  }

  cerrarConfirmar(): void {
    this.modalConfirmarAbierto.set(false);
    this.confirmPendiente = null;
  }

  confirmarEliminar(): void {
    if (!this.confirmPendiente) return;
    this.service.delete(this.confirmPendiente.id).subscribe({ next: () => { this.cerrarConfirmar(); this.cargar(); } });
  }
}
