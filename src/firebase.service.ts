import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { environment } from './environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  public auth;
  public db;
  public storage;

  constructor() {
    const app = initializeApp(environment.firebaseConfig);
    
    this.auth = getAuth(app);
    this.db = getFirestore(app);
    this.storage = getStorage(app);
  }
}