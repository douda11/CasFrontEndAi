import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { PanelModule } from 'primeng/panel';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { InputTextModule } from 'primeng/inputtext';
import { InputMaskModule } from 'primeng/inputmask';

@Component({
  selector: 'app-common-fields',
  templateUrl: './common-fields.component.html',
  standalone: true,
  imports: [
    PanelModule,
    DropdownModule,
    CalendarModule,
    InputTextModule,
    InputMaskModule
  ]
})
export class CommonFieldsComponent {
  @Input() formGroup!: FormGroup;
  @Input() civiliteOptions: any[] = [];
  @Input() professionOptions: any[] = [];
  @Input() paysOptions: any[] = [];
}
