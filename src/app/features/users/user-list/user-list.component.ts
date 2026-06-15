import { Component, OnInit, inject } from '@angular/core';
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
  total = 0;
  pagina = 1;
  porPagina = 15;
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
      next: (res) => { this.usuarios = res.datos; this.total = res.total; this.cargando = false; },
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
}
