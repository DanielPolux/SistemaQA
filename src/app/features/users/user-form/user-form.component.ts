import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UserService } from '../../../core/services/user.service';
import { Rol } from '../../../core/models';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './user-form.component.html'
})
export class UserFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(UserService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  usuarioId?: number;
  guardando = false;
  error = '';

  readonly roles = Object.values(Rol);

  form = this.fb.group({
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.minLength(6)]],
    rol: [Rol.QA_TESTER, Validators.required],
    activo: [true]
  });

  get esEdicion(): boolean { return !!this.usuarioId; }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.usuarioId = Number(id);
      this.form.get('password')?.clearValidators();
      this.service.getById(this.usuarioId).subscribe(u => this.form.patchValue(u as any));
    } else {
      this.form.get('password')?.addValidators(Validators.required);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.guardando = true;
    const data = { ...this.form.value };
    if (!data.password) delete data.password;

    const op = this.esEdicion
      ? this.service.update(this.usuarioId!, data as any)
      : this.service.create(data as any);

    op.subscribe({
      next: () => this.router.navigate(['/usuarios']),
      error: (err) => { this.error = err.error?.message || 'Error al guardar'; this.guardando = false; }
    });
  }
}
