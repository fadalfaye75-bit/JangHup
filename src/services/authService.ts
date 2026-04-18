import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  collection, 
  where, 
  getDocs,
  writeBatch,
  getCountFromServer
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User, SchoolClass, UserRole } from '../types';
import { handleFirestoreError, OperationType } from '../lib/hooks';

export const authService = {
  async loginUser(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error("Profil utilisateur non trouvé.");
      }

      const userData = userDoc.data() as User;
      const classesRef = collection(db, 'classes');
      const q = query(classesRef, where('name', '==', userData.class_name));
      const querySnapshot = await getDocs(q);
      const classInfo = querySnapshot.empty ? null : querySnapshot.docs[0].data() as SchoolClass;

      return { user: userData, classInfo };
    } catch (error: any) {
      console.error("Login User Error:", error);
      throw error;
    }
  },

  async registerUser(email: string, password: string, name: string, classCode: string) {
    try {
      // 1. Validate class code first using the new registration_codes collection
      const codeDocRef = doc(db, 'registration_codes', classCode.toUpperCase().trim());
      let codeDoc;
      try {
        codeDoc = await getDoc(codeDocRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `registration_codes/${classCode}`);
      }
      
      if (!codeDoc?.exists()) {
        throw new Error("Code d'inscription invalide. Veuillez vérifier le code fourni par votre délégué.");
      }

      const { className, classId, capacity } = codeDoc.data() as { className: string, classId: string, capacity?: number };

      if (!className || !classId) {
        throw new Error("Données du code d'inscription corrompues. Veuillez contacter un administrateur.");
      }

      // 1.5. Capacity checking
      if (capacity && capacity > 0) {
        try {
          // Since user is unauthenticated at this stage and cannot list users_public,
          // we assume the admin tracks it, OR we could relax users_public strictly for counts
          // However, for immediate bypass while guaranteeing security, we perform this check 
          // AFTER creating the user but BEFORE completing setup, so they are authenticated
        } catch (err: any) {}
      }

      // 2. Create auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Now authenticated: we can perform the capacity checking
      if (capacity && capacity > 0) {
        try {
          const classUsersQ = query(collection(db, 'users_public'), where('class_name', '==', className));
          const snap = await getCountFromServer(classUsersQ);
          // snap.data().count reflects users in DB. Since this user isn't in DB yet, 
          // we check if count >= capacity.
          if (snap.data().count >= capacity) {
            // Delete the created auth user to rollback
            await firebaseUser.delete();
            throw new Error(`L'effectif maximum de la classe ${className} est atteint (${capacity} places). Inscription impossible.`);
          }
        } catch (err: any) {
          if (err.message && err.message.includes("effectif maximum")) throw err;
          console.warn("Capacity check could not complete:", err);
        }
      }

      // Fetch class info for the return value (now authenticated)
      let classData: SchoolClass | null = null;
      try {
        const classDoc = await getDoc(doc(db, 'classes', classId));
        classData = classDoc.exists() ? { id: classDoc.id, ...classDoc.data() } as SchoolClass : null;
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `classes/${classId}`);
      }

      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const publicDocRef = doc(db, 'users_public', firebaseUser.uid);
      
      const newUser: User = {
        id: firebaseUser.uid,
        name: name,
        email: email,
        role: UserRole.STUDENT,
        class_name: className,
        is_class_account: false,
        password_changed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Create public profile (no email)
      const { email: _, ...publicUser } = newUser;

      const batch = writeBatch(db);
      batch.set(userDocRef, newUser);
      batch.set(publicDocRef, publicUser);
      
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'registration_batch');
      }

      return { user: newUser, classInfo: classData };
    } catch (error: any) {
      console.error("Register User Error:", error);
      throw error;
    }
  },

  async loginAdmin() {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const publicDocRef = doc(db, 'users_public', firebaseUser.uid);
      let userDoc;
      try {
        userDoc = await getDoc(userDocRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
      }

      if (!userDoc?.exists()) {
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
        
        const { email: _, ...publicUser } = newUser;
        const batch = writeBatch(db);
        batch.set(userDocRef, newUser);
        batch.set(publicDocRef, publicUser);
        
        try {
          await batch.commit();
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'admin_init_batch');
        }
        
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

  async sendPasswordReset(email: string) {
    await sendPasswordResetEmail(auth, email);
  },

  async claimDelegate(userId: string, className: string, code: string) {
    try {
      // Validate delegate code using the new delegate_codes collection
      const codeDocRef = doc(db, 'delegate_codes', code.toUpperCase().trim());
      const codeDoc = await getDoc(codeDocRef);

      if (!codeDoc.exists()) {
        throw new Error("Code délégué invalide.");
      }

      const codeData = codeDoc.data();
      const matchByName = codeData?.className?.trim().toUpperCase() === className.trim().toUpperCase();
      
      // Fallback: check by classId if name doesn't match (handles renames or missing name field)
      if (!matchByName) {
        const classesRef = collection(db, 'classes');
        const q = query(classesRef, where('name', '==', className.trim()));
        const classSnap = await getDocs(q);
        
        if (classSnap.empty || classSnap.docs[0].id !== codeData?.classId) {
          throw new Error("Code délégué invalide.");
        }
      }

      const userDocRef = doc(db, 'users', userId);
      const publicDocRef = doc(db, 'users_public', userId);
      
      const batch = writeBatch(db);
      batch.update(userDocRef, {
        role: UserRole.DELEGATE,
        updated_at: new Date().toISOString(),
        _delegateCode: code.toUpperCase().trim()
      });
      
      // Use set with merge: true for public profile in case it's missing
      batch.set(publicDocRef, {
        role: UserRole.DELEGATE,
        updated_at: new Date().toISOString()
      }, { merge: true });

      await batch.commit();

      return true;
    } catch (error) {
      console.error("Claim Delegate Error:", error);
      throw error;
    }
  }
};
