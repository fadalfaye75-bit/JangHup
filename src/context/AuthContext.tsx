import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User, SchoolClass, UserRole } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  classInfo: SchoolClass | null;
  role: UserRole | null;
  loading: boolean;
  loginUser: (email: string, password: string) => Promise<void>;
  registerUser: (email: string, password: string, name: string, classCode: string) => Promise<void>;
  loginAdmin: () => Promise<void>;
  logout: () => Promise<void>;
  claimDelegate: (code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [classInfo, setClassInfo] = useState<SchoolClass | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    let lastClassName: string | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Listen to user profile changes
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        unsubProfile = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as User;
            setUser(userData);

            // Fetch class info ONLY if class_name changed
            if (userData.role !== UserRole.ADMIN && userData.class_name) {
              if (userData.class_name !== lastClassName) {
                lastClassName = userData.class_name;
                const classesRef = collection(db, 'classes');
                const q = query(classesRef, where('name', '==', userData.class_name), limit(1));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                  setClassInfo(querySnapshot.docs[0].data() as SchoolClass);
                }
              }
            } else {
              lastClassName = null;
              setClassInfo(null);
            }
          } else {
            setUser(null);
            setClassInfo(null);
            lastClassName = null;
          }
          setLoading(false);
        }, (err) => {
          console.error("🔥 Auth Profile Snapshot Error:", err);
          setLoading(false);
        });
      } else {
        setUser(null);
        setClassInfo(null);
        lastClassName = null;
        setLoading(false);
        if (unsubProfile) {
          unsubProfile();
          unsubProfile = null;
        }
      }
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const loginUser = async (email: string, password: string) => {
    const result = await authService.loginUser(email, password);
    setUser(result.user);
    setClassInfo(result.classInfo);
  };

  const registerUser = async (email: string, password: string, name: string, classCode: string) => {
    const result = await authService.registerUser(email, password, name, classCode);
    setUser(result.user);
    setClassInfo(result.classInfo);
  };

  const loginAdmin = async () => {
    const userData = await authService.loginAdmin();
    setUser(userData);
    setClassInfo(null);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setClassInfo(null);
  };

  const claimDelegate = async (code: string) => {
    if (!user) throw new Error("Non authentifié");
    await authService.claimDelegate(user.id, user.class_name, code);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      classInfo, 
      role: user?.role || null, 
      loading, 
      loginUser,
      registerUser,
      loginAdmin, 
      logout, 
      claimDelegate 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
