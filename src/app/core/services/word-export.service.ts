import { Injectable, inject } from '@angular/core';
import { Defecto, PlanPrueba } from '../models';
import { DefectoWordExportService } from './word-export-defecto.service';
import { PlanWordExportService } from './word-export-plan.service';
import { EjecucionEvidenciaWord, EjecucionWordExportService } from './word-export-ejecucion.service';

@Injectable({ providedIn: 'root' })
export class WordExportService {
  private defectoExport = inject(DefectoWordExportService);
  private planExport    = inject(PlanWordExportService);
  private ejecucionExport = inject(EjecucionWordExportService);

  exportarDefecto(d: Defecto): Promise<void> {
    return this.defectoExport.exportarDefecto(d);
  }

  exportarPlan(plan: PlanPrueba): Promise<void> {
    return this.planExport.exportarPlan(plan);
  }

  exportarEjecucion(data: EjecucionEvidenciaWord): Promise<void> {
    return this.ejecucionExport.exportar(data);
  }
}
