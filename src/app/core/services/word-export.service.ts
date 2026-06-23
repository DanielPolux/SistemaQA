import { Injectable, inject } from '@angular/core';
import { Defecto, PlanPrueba } from '../models';
import { DefectoWordExportService } from './word-export-defecto.service';
import { PlanWordExportService } from './word-export-plan.service';

@Injectable({ providedIn: 'root' })
export class WordExportService {
  private defectoExport = inject(DefectoWordExportService);
  private planExport    = inject(PlanWordExportService);

  exportarDefecto(d: Defecto): Promise<void> {
    return this.defectoExport.exportarDefecto(d);
  }

  exportarPlan(plan: PlanPrueba): Promise<void> {
    return this.planExport.exportarPlan(plan);
  }
}
