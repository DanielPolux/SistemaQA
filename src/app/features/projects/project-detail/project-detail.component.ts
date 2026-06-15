import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
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

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.service.getById(id).subscribe(p => { this.proyecto = p; });
    this.service.getResumen(id).subscribe(r => { this.resumen = r; this.cargando = false; });
  }
}
