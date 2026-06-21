import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ProjectService } from '../../../core/services/project.service';
import { Proyecto, ProyectoResumen } from '../../../core/models';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './project-detail.component.html'
})
export class ProjectDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private service = inject(ProjectService);

  proyecto?: Proyecto;
  resumen?: ProyectoResumen;
  cargando = true;
  error = '';

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    forkJoin({
      proyecto: this.service.getById(id),
      resumen:  this.service.getResumen(id),
    }).subscribe({
      next: ({ proyecto, resumen }) => {
        this.proyecto = proyecto;
        this.resumen  = resumen;
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        this.error = 'No se pudo cargar el proyecto. Verifica que existe y que tienes acceso.';
      },
    });
  }
}
