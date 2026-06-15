import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../../core/services/project.service';
import { Proyecto, EstadoProyecto } from '../../../core/models';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './project-list.component.html'
})
export class ProjectListComponent implements OnInit {
  private service = inject(ProjectService);

  proyectos: Proyecto[] = [];
  total = 0;
  pagina = 1;
  porPagina = 10;
  busqueda = '';
  estadoFiltro = '';
  cargando = false;

  readonly estados = Object.values(EstadoProyecto);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.service.getAll({
      busqueda: this.busqueda || undefined,
      estado: this.estadoFiltro || undefined,
      pagina: this.pagina,
      porPagina: this.porPagina
    }).subscribe({
      next: (res) => {
        this.proyectos = res.datos;
        this.total = res.total;
        this.cargando = false;
      },
      error: () => { this.cargando = false; }
    });
  }

  buscar(): void {
    this.pagina = 1;
    this.cargar();
  }

  cambiarPagina(p: number): void {
    this.pagina = p;
    this.cargar();
  }

  get totalPaginas(): number {
    return Math.ceil(this.total / this.porPagina);
  }
}
