import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RequirementService } from '../../../core/services/requirement.service';
import { Requerimiento, EstadoRequerimiento, TipoRequerimiento } from '../../../core/models';

@Component({
  selector: 'app-requirement-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './requirement-list.component.html'
})
export class RequirementListComponent implements OnInit {
  private service = inject(RequirementService);
  private route = inject(ActivatedRoute);

  requerimientos: Requerimiento[] = [];
  total = 0;
  pagina = 1;
  porPagina = 15;
  proyectoId?: number;
  estadoFiltro = '';
  tipoFiltro = '';
  busqueda = '';
  cargando = false;

  readonly estados = Object.values(EstadoRequerimiento);
  readonly tipos = Object.values(TipoRequerimiento);

  ngOnInit(): void {
    this.proyectoId = this.route.snapshot.queryParams['proyectoId']
      ? Number(this.route.snapshot.queryParams['proyectoId'])
      : undefined;
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.service.getAll({
      proyectoId: this.proyectoId,
      estado: this.estadoFiltro || undefined,
      tipo: this.tipoFiltro || undefined,
      busqueda: this.busqueda || undefined,
      pagina: this.pagina,
      porPagina: this.porPagina
    }).subscribe({
      next: (res) => { this.requerimientos = res.datos; this.total = res.total; this.cargando = false; },
      error: () => { this.cargando = false; }
    });
  }

  buscar(): void { this.pagina = 1; this.cargar(); }
}
