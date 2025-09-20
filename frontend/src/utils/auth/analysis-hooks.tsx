import { useState } from 'react';
import { useAuth } from './auth-context';
import { db } from '../firebase';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { toast } from 'sonner';

interface AnalysisResult {
  id?: string;
  type: 'url' | 'text' | 'image' | 'youtube';
  title: string;
  content: string;
  credibilityScore: number;
  status: 'verified' | 'questionable' | 'debunked';
  date?: string;
  timeSpent?: string;
  userId?: string;
  createdAt?: Timestamp;
}

export function useAnalysisHistory() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveAnalysis = async (analysis: Omit<AnalysisResult, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const analysisWithUser = {
        ...analysis,
        userId: user.id,
        createdAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, "analyses"), analysisWithUser);
      return docRef.id;

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to save analysis';
      setError(errorMessage);
      toast.error(`Failed to save analysis: ${errorMessage}`);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getAnalysisHistory = async (): Promise<AnalysisResult[]> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const analysesRef = collection(db, 'analyses');
      const q = query(
        analysesRef,
        where('userId', '==', user.id),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const analyses = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AnalysisResult[];

      return analyses;

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch analysis history';
      setError(errorMessage);
      toast.error(`Failed to fetch analysis history: ${errorMessage}`);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    saveAnalysis,
    getAnalysisHistory,
    loading,
    error
  };
}
