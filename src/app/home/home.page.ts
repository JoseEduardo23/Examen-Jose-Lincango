import { Component, Inject } from '@angular/core';
import { signOut } from '@angular/fire/auth';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, 
  ToastController, IonButton, IonTextarea, IonIcon,
  IonChip, IonLabel, IonSpinner
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { CommonModule, DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FirebaseService } from 'src/firebase.service';
import { addDoc, collection, serverTimestamp, doc, updateDoc, getDocs } from '@angular/fire/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonTextarea, IonIcon, IonChip,
    IonLabel, IonSpinner,
    FormsModule,
    CommonModule
  ]
})
export class HomePage {
  message = '';
  photoFile: File | null = null;
  photoPreview: string | ArrayBuffer | null = null;
  latitude: number | null = null;
  longitude: number | null = null;
  isLoading = false;
  isEditing = false;
  currentPostId: string | null = null;
  
  // Variables para la paginación de personajes
  characters: any[] = [];
  selectedCharacter: any = null;
  showCharacters = false;
  apiLoading = false;
  currentPage = 1;
  totalPages = 1;
  hasNextPage = false;

  posts: any[] = [];

  constructor(
    private toastCtrl: ToastController,
    private http: HttpClient,
    @Inject(DOCUMENT) private document: Document,
    public firebaseService: FirebaseService
  ) {
    this.loadPosts();
  }

  async loadPosts() {
    try {
      const querySnapshot = await getDocs(collection(this.firebaseService.db, 'posts'));
      this.posts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  }


  async getLocation() {
    if (!navigator.geolocation) {
      this.showToast('GPS no disponible');
      return;
    }
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000
        });
      });
      
      this.latitude = position.coords.latitude;
      this.longitude = position.coords.longitude;
      this.showToast('Ubicación obtenida');
    } catch (err) {
      console.error('Error getting location:', err);
      this.showToast('Error al obtener ubicación');
    }
  }

  async takePicture() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt
      });
      
      if (image.webPath) {
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        this.photoFile = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
        
        const reader = new FileReader();
        reader.onload = () => this.photoPreview = reader.result;
        reader.readAsDataURL(this.photoFile);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
    }
  }

  async fetchCharacters(page: number = 1) {
    this.apiLoading = true;
    try {
      const response: any = await this.http.get(`https://rickandmortyapi.com/api/character?page=${page}`).toPromise();
      this.characters = response.results;
      this.currentPage = page;
      this.totalPages = response.info.pages;
      this.hasNextPage = !!response.info.next;
      this.showCharacters = true;
    } catch (error) {
      console.error('Error loading characters:', error);
      this.showToast('Error al cargar personajes');
    } finally {
      this.apiLoading = false;
    }
  }

  nextPage() {
    if (this.hasNextPage) {
      this.fetchCharacters(this.currentPage + 1);
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.fetchCharacters(this.currentPage - 1);
    }
  }

  selectCharacter(character: any) {
    this.selectedCharacter = character;
    this.message += `\n\nPersonaje de Rick y Morty: ${character.name}\nEspecie: ${character.species}\nEstado: ${character.status}`;
    this.showCharacters = false;
  }

  async savePost() {
    if (!this.message.trim()) {
      this.showToast('Escribe un mensaje');
      return;
    }

    this.isLoading = true;
    try {
      const user = this.firebaseService.auth.currentUser;
      if (!user) throw new Error('No autenticado');

      let photoURL = '';
      if (this.photoFile) {
        const fileExt = this.photoFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const photoRef = ref(this.firebaseService.storage, `posts/${user.uid}/${fileName}`);
        
        await uploadBytes(photoRef, this.photoFile);
        photoURL = await getDownloadURL(photoRef);
      }

      const postData = {
        uid: user.uid,
        username: user.displayName || user.email,
        userPhotoURL: user.photoURL || '',
        message: this.message,
        ...(photoURL && { photoURL }),
        ...(this.latitude && this.longitude && {
          location: { 
            lat: this.latitude,
            lng: this.longitude
          }
        }),
        ...(this.selectedCharacter && {
          characterInfo: {
            name: this.selectedCharacter.name,
            species: this.selectedCharacter.species,
            status: this.selectedCharacter.status,
            image: this.selectedCharacter.image
          }
        }),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (this.isEditing && this.currentPostId) {
        await updateDoc(doc(this.firebaseService.db, 'posts', this.currentPostId), postData);
        this.showToast('Publicación actualizada');
      } else {
        await addDoc(collection(this.firebaseService.db, 'posts'), postData);
        this.showToast('Publicación creada');
      }

      this.resetForm();
      await this.loadPosts();
    } catch (error: any) {
      console.error('Error saving post:', error);
      this.showToast(error.message || 'Error al guardar');
    } finally {
      this.isLoading = false;
    }
  }

  editPost(post: any) {
    this.isEditing = true;
    this.currentPostId = post.id;
    this.message = post.message;
    this.latitude = post.location?.lat || null;
    this.longitude = post.location?.lng || null;
    this.selectedCharacter = post.characterInfo || null;
    
    if (post.photoURL) {
      this.photoPreview = post.photoURL;
    }
  }

  cancelEdit() {
    this.resetForm();
  }

   resetForm() { 
    this.message = '';
    this.photoFile = null;
    this.photoPreview = null;
    this.latitude = null;
    this.longitude = null;
    this.selectedCharacter = null;
    this.isEditing = false;
    this.currentPostId = null;
  }

  async logout() {
  try {
    await signOut(this.firebaseService.auth);
    this.showToast('Sesión cerrada correctamente');
    // Redirige a la página de login o donde necesites
    // this.router.navigate(['/login']);
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    this.showToast('Error al cerrar sesión');
  }
}

  private async showToast(msg: string) {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 3000,
      position: 'top'
    });
    await toast.present();
  }
}