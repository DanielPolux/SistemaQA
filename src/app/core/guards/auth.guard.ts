import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Login temporalmente inactivo — devuelve siempre true
export const authGuard: CanActivateFn = () => true;
