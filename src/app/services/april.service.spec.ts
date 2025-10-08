import { TestBed } from '@angular/core/testing';

import { AprilService } from './april.service';

describe('AprilService', () => {
  let service: AprilService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AprilService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
