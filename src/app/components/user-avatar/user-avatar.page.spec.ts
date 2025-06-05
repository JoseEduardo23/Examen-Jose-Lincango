import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserAvatarPage } from './user-avatar.page';

describe('UserAvatarPage', () => {
  let component: UserAvatarPage;
  let fixture: ComponentFixture<UserAvatarPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(UserAvatarPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
