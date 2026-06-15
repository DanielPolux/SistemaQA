import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TestCaseService } from '../../../core/services/test-case.service';
import { CasoPrueba, EstadoCasoPrueba, PrioridadCasoPrueba, TipoCasoPrueba } from '../../../core/models';

@Component({
  selector: 'app-test-case-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './test-case-list.component.html'
})
export class TestCaseListComponent implements OnInit {
  private service = inject(TestCaseService);
  private route = inject(ActivatedRoute);

  casos: CasoPrueba[] = [];
  total = 0;
  pagina = 1;
  porPagina = 15;
  proyectoId?: number;
  estadoFiltro = '';
  tipoFiltro = '';
  busqueda = '';
  cargando = false;

  readonly estados = Object.values(EstadoCasoPrueba);
  readonly tipos = Object.values(TipoCasoPrueba);

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
      next: (res) => { this.casos = res.datos; this.total = res.total; this.cargando = false; },
      error: () => { this.cargando = false; }
    });
  }

  buscar(): void { this.pagina = 1; this.cargar(); }
}
