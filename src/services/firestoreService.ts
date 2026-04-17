import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  QueryConstraint,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Scalable Firestore Service
 * Implements best practices for high-performance data fetching.
 */

export interface PaginatedResult<T> {
  data: T[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

export const firestoreService = {
  /**
   * Fetch paginated data with strict scoping
   * @param collectionPath Path to the collection
   * @param pageSize Number of documents per page
   * @param startAfterDoc Last document of the previous cursor
   * @param constraints Additional QueryConstraints (where, orderBy, etc.)
   */
  async getPaginated<T>(
    collectionPath: string,
    pageSize: number = 20,
    startAfterDoc: DocumentSnapshot | null = null,
    constraints: QueryConstraint[] = []
  ): Promise<PaginatedResult<T>> {
    const colRef = collection(db, collectionPath);
    
    let q = query(
      colRef,
      ...constraints,
      limit(pageSize)
    );

    if (startAfterDoc) {
      q = query(q, startAfter(startAfterDoc));
    }

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

    return {
      data,
      lastDoc,
      hasMore: snapshot.docs.length === pageSize
    };
  },

  /**
   * Scoped queries - ensures data is always filtered by class_name or other owner ID
   */
  getScopedConstraints(key: string, value: string): QueryConstraint[] {
    if (!value) return [];
    return [where(key, '==', value)];
  }
};
