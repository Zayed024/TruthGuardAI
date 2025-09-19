import { useState } from 'react';
import { useAuth } from './auth-context';
import { projectId } from '../supabase/info';

interface AnalysisResult {
  id?: string;
  type: 'url' | 'text' | 'image';
  title: string;
  content: string;
  credibilityScore: number;
  status: 'verified' | 'questionable' | 'debunked';
  date?: string;
  timeSpent?: string;
  userId?: string;
  createdAt?: string;
}

export function useAnalysisHistory() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-cd4019c8`;

  const saveAnalysis = async (analysis: Omit<AnalysisResult, 'id' | 'userId' | 'createdAt'>) => {
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${serverUrl}/analysis/history`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(analysis)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save analysis');
      }

      return data.analysisId;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save analysis';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getAnalysisHistory = async (): Promise<AnalysisResult[]> => {
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${serverUrl}/analysis/history`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch analysis history');
      }

      return data.analyses || [];

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analysis history';
      setError(errorMessage);
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