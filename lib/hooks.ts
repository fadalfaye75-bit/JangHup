import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  QueryConstraint,
  limit,
  orderBy,
  FirestoreError,
  getDocs,
  startAfter,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db, auth } from '../firebase';

/**
 * Senior Architecture Pattern: Firestore Error Handling
 * Conforms to the FirestoreErrorInfo specification for system diagnostics.
 */

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: any[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof FirestoreError ? error.code + ': ' + error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  
  const errorString = JSON.stringify(errInfo);
  console.error('🔥 Firestore Security/Operation Error:', errorString);
  throw new Error(errorString);
}

/**
 * Real-time Table Hook with Enhanced Error Handling and Performance
 */
export function useTable<T>(collectionName: string, constraints: QueryConstraint[] = [], maxItems = 50, enabled = true) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser || !enabled) {
      if (!enabled) setLoading(false);
      return;
    }

    setLoading(true);
    // Optimization: Always apply a limit and order by createdAt if not specified
    const q = query(
      collection(db, collectionName), 
      ...constraints,
      limit(maxItems)
    );
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as T[];
        setData(items);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
        // Only report if it's not a permission error due to missing data (which we should have caught with 'enabled')
        handleFirestoreError(err, OperationType.LIST, collectionName);
      }
    );

    return () => unsubscribe();
  }, [collectionName, JSON.stringify(constraints), enabled]);

  return { data, loading, error };
}

/**
 * Paginated Fetch Hook (No active listener, better for large lists)
 */
export function usePaginatedTable<T>(collectionName: string, constraints: QueryConstraint[] = [], pageSize = 20, enabled = true) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  const fetchInitial = useCallback(async () => {
    if (!auth.currentUser || !enabled) {
      if (!enabled) setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const q = query(collection(db, collectionName), ...constraints, limit(pageSize));
      const snapshot = await getDocs(q);
      
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as T[];
      setData(items);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === pageSize);
    } catch (err: any) {
      setError(err.message);
      handleFirestoreError(err, OperationType.LIST, collectionName);
    } finally {
      setLoading(false);
    }
  }, [collectionName, JSON.stringify(constraints), pageSize, enabled]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !lastDoc || !auth.currentUser) return;
    setLoadingMore(true);
    try {
      const q = query(collection(db, collectionName), ...constraints, startAfter(lastDoc), limit(pageSize));
      const snapshot = await getDocs(q);
      
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as T[];
      setData(prev => [...prev, ...items]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === pageSize);
    } catch (err: any) {
      setError(err.message);
      handleFirestoreError(err, OperationType.LIST, collectionName);
    } finally {
      setLoadingMore(false);
    }
  }, [collectionName, JSON.stringify(constraints), pageSize, hasMore, loadingMore, lastDoc]);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  return { data, loading, loadingMore, error, hasMore, loadMore, refetch: fetchInitial };
}

/**
 * CRUD Operations with Enhanced Error Handling
 */
export const insertRow = async (collectionName: string, data: any) => {
  try {
    return await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, collectionName);
  }
};

export const updateRow = async (collectionName: string, id: string, data: any) => {
  try {
    const docRef = doc(db, collectionName, id);
    return await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${collectionName}/${id}`);
  }
};

export const deleteRow = async (collectionName: string, id: string) => {
  try {
    const docRef = doc(db, collectionName, id);
    return await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${id}`);
  }
};

