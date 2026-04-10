import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  collection, 
  where, 
  getDocs
} from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { User, SchoolClass, UserRole } from '../../types';

export const authService = {
  async loginClass(email: string, password: string) {
    try {
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (error: any) {
        // If user doesn't exist, try to create it (shared class account pattern)
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          try {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
          } catch (createError: any) {
            // If email already in use, then the original error was indeed wrong password
            if (createError.code === 'auth/email-already-in-use') {
              throw error;
            }
            throw createError;
          }
        } else {
          throw error;
        }
      }

      const firebaseUser = userCredential.user;

      // Check if user profile exists
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // Find class info
        const classesRef = collection(db, 'classes');
        const q = query(classesRef, where('class_email', '==', email));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          throw new Error("Classe non trouvée dans la base de données.");
        }

        const classData = querySnapshot.docs[0].data() as SchoolClass;
        
        // Create shared student profile
        const newUser: User = {
          id: firebaseUser.uid,
          name: `Étudiant ${classData.name}`,
          email: email,
          role: UserRole.STUDENT,
          class_name: classData.name,
          is_class_account: true,
          password_changed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        await setDoc(userDocRef, newUser);
        return { user: newUser, classInfo: classData };
      }

      const userData = userDoc.data() as User;
      
      // Get class info
      const classesRef = collection(db, 'classes');
      const q = query(classesRef, where('name', '==', userData.class_name));
      const querySnapshot = await getDocs(q);
      const classInfo = querySnapshot.empty ? null : querySnapshot.docs[0].data() as SchoolClass;

      return { user: userData, classInfo };
    } catch (error: any) {
      console.error("Login Class Error:", error);
      throw error;
    }
  },

  async loginAdmin() {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // First time admin login
        const newUser: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'Admin',
          email: firebaseUser.email || '',
          role: UserRole.ADMIN,
          class_name: 'ADMIN',
          is_class_account: false,
          password_changed: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        await setDoc(userDocRef, newUser);
        return newUser;
      }

      return userDoc.data() as User;
    } catch (error) {
      console.error("Login Admin Error:", error);
      throw error;
    }
  },

  async logout() {
    await signOut(auth);
  },

  async claimDelegate(userId: string, className: string, code: string) {
    try {
      const classesRef = collection(db, 'classes');
      const q = query(classesRef, where('name', '==', className), where('delegate_code', '==', code));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("Code délégué invalide.");
      }

      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        role: UserRole.DELEGATE,
        updated_at: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error("Claim Delegate Error:", error);
      throw error;
    }
  }
};
