import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ShieldCheck, Lock, AlertCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface AdminLoginProps {
  onAdminLogin: (email: string, password: string) => void;
  onBack: () => void;
  onAdminSetup?: () => void;
}

export function AdminLogin({ onAdminLogin, onBack, onAdminSetup }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasExistingAdmins, setHasExistingAdmins] = useState<boolean | null>(null);

  useEffect(() => {
    checkExistingAdmins();
  }, []);

  const checkExistingAdmins = async () => {
    try {
      const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-cd4019c8`;
      const response = await fetch(`${serverUrl}/admin/exists`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setHasExistingAdmins(data.hasAdmins);
      }
    } catch (error) {
      console.error('Failed to check existing admins:', error);
      setHasExistingAdmins(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onAdminLogin(email, password);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-slate-700 bg-slate-800">
        <CardHeader className="text-center pb-8">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <ShieldCheck className="h-16 w-16 text-slate-300" />
              <Lock className="h-6 w-6 text-amber-400 absolute -bottom-1 -right-1" />
            </div>
          </div>
          <CardTitle className="text-2xl text-slate-100">Admin Portal Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {hasExistingAdmins === false && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-200">
                  <p className="font-medium mb-1">No Admin Users Found</p>
                  <p>You need to create the first admin account before you can log in.</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="admin-email" className="text-slate-200">Admin Email</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@truthguard.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password" className="text-slate-200">Password</Label>
              <Input
                id="admin-password"
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-400"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-amber-600 hover:bg-amber-700 text-white" 
              disabled={isLoading}
            >
              {isLoading ? 'Authenticating...' : 'Secure Login'}
            </Button>
          </form>

          <div className="text-center space-y-2">
            <button
              onClick={onBack}
              className="text-sm text-slate-400 hover:text-slate-300 block w-full"
              disabled={isLoading}
            >
              ← Back to Main Site
            </button>
            {onAdminSetup && (
              <button
                onClick={onAdminSetup}
                className="text-sm text-amber-400 hover:text-amber-300 block w-full"
                disabled={isLoading}
              >
                {hasExistingAdmins === false 
                  ? 'Create First Admin Account' 
                  : 'First time setup? Create Admin Account'
                }
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}