import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
   private light = false;

  constructor() {
    const saved = localStorage.getItem('theme-light');
    if (saved === '1') this.enableLight(false); else this.enableDark(false);
  }

  private emitChange() {
    window.dispatchEvent(new CustomEvent('theme:changed', { detail: { light: this.light } }));
  }

  private overlayContainerClass(add: boolean) {
    try {
      const cont = document.querySelector('.cdk-overlay-container');
      if (!cont) return;
      if (add) cont.classList.add('light-theme');
      else cont.classList.remove('light-theme');
    } catch { /* safe no-op for SSR */ }
  }

  enableLight(emit = true) {
    document.documentElement.classList.add('light-theme');
    this.overlayContainerClass(true);   // <-- add here
    this.light = true;
    localStorage.setItem('theme-light', '1');
    if (emit) this.emitChange();
  }

  enableDark(emit = true) {
    document.documentElement.classList.remove('light-theme');
    this.overlayContainerClass(false);  // <-- add here
    this.light = false;
    localStorage.setItem('theme-light', '0');
    if (emit) this.emitChange();
  }

  toggle() {
    this.light ? this.enableDark() : this.enableLight();
  }

  isLight() {
    return this.light;
  }
}
