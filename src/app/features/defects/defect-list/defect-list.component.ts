import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DefectService } from '../../../core/services/defect.service';
import { Defecto, EstadoDefecto, SeveridadDefecto } from '../../../core/models';

@Component({
  selector: 'app-defect-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './defect-list.component.html'
})
export class DefectListComponent implements OnInit {
  private service = inject(DefectService);
  private route = inject(ActivatedRoute);

  defectos: Defecto[] = [];
  total = 0;
  pagina = 1;
  porPagina = 15;
  proyectoId?: number;
  estadoFiltro = '';
  severidadFiltro = '';
  busqueda = '';
  cargando = false;

  readonly estados = Object.values(EstadoDefecto);
  readonly severidades = Object.values(SeveridadDefecto);

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
      severidad: this.severidadFiltro || undefined,
      busqueda: this.busqueda || undefined,
      pagina: this.pagina,
      porPagina: this.porPagina
    }).subscribe({
      next: (res) => { this.defectos = res.datos; this.total = res.total; this.cargando = false; },
      error: () => { this.cargando = false; }
    });
  }

  buscar(): void { this.pagina = 1; this.cargar(); }
}
