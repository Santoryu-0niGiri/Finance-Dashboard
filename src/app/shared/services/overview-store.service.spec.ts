/* tslint:disable:no-unused-variable */

import { TestBed, inject } from '@angular/core/testing';
import { OverviewStoreService } from './overview-store.service';

describe('Service: OverviewStore', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OverviewStoreService]
    });
  });

  it('should ...', inject([OverviewStoreService], (service: OverviewStoreService) => {
    expect(service).toBeTruthy();
  }));
});
