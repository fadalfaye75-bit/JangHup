import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string, email: string) => {
    try {
      const docRef = doc(db, 'profiles', userId);
      const docSnap = await getDoc(docRef);
      
      const isAdminEmail = email === "fadalfaye75@gmail.com";

      if (docSnap.exists()) {
        const data = docSnap.data();
        let role = (data.role as UserRole) || UserRole.STUDENT;
        
        if (isAdminEmail && role !== UserRole.ADMIN) {
          role = UserRole.ADMIN;
          await updateDoc(docRef, { role: UserRole.ADMIN });
        }

        setUser({
          id: userId,
          name: data.name || email.split('@')[0],
          email: data.email || email,
          role: role,
          className: data.className || 'Non assignée',
          schoolName: data.schoolName || 'JangHup Academy',
          isActive: data.isActive ?? true,
          passwordChanged: data.passwordChanged ?? false,
          avatar: data.avatar || `https://ui-avatars.com/api/?name=${data.name || email}&background=6C63FF&color=fff`,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString()
        });
      } else {
        const newUser: User = {
          id: userId,
          name: email.split('@')[0],
          email: email,
          role: isAdminEmail ? UserRole.ADMIN : UserRole.STUDENT,
          className: 'Non assignée',
          schoolName: 'JangHup Academy',
          isActive: true,
          passwordChanged: false,
          avatar: `https://ui-avatars.com/api/?name=${email.split('@')[0]}&background=6C63FF&color=fff`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(docRef, newUser);
        setUser(newUser);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        fetchUserProfile(firebaseUser.uid, firebaseUser.email || '');
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const refreshUser = async () => {
    if (auth.currentUser) {
      await fetchUserProfile(auth.currentUser.uid, auth.currentUser.email || '');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser }}>
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
