import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ShieldCheck, AlertTriangle, CheckCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface AdminSetupProps {
  onBack: () => void;
  onAdminCreated: () => void;
}

export function AdminSetup({ onBack, onAdminCreated }: AdminSetupProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminKey, setAdminKey] = useState('');
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
      const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-cd4019c8`;
      
      const response = await fetch(`${serverUrl}/auth/admin/signup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, adminKey })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          // Handle existing user case
          toast.error(data.error || 'User already exists');
          if (data.suggestion) {
            toast.info(data.suggestion);
          }
        } else if (response.status === 403) {
          toast.error('Invalid admin setup key');
        } else {
          toast.error(data.error || 'Failed to create admin account');
        }
        return;
      }

      toast.success(data.message || 'Admin account created successfully!');
      
      // Clear form
      setEmail('');
      setPassword('');
      setAdminKey('');
      
      onAdminCreated();

    } catch (error) {
      console.error('Admin setup error:', error);
      toast.error('Network error: Please check your connection and try again');
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
              <AlertTriangle className="h-6 w-6 text-amber-400 absolute -bottom-1 -right-1" />
            </div>
          </div>
          <CardTitle className="text-2xl text-slate-100">
            {hasExistingAdmins ? 'Create Additional Admin' : 'Create Admin Account'}
          </CardTitle>
          <CardDescription className="text-slate-400">
            {hasExistingAdmins 
              ? 'Create another administrator account for TruthGuard AI'
              : 'Set up the first administrator account for TruthGuard AI'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {hasExistingAdmins && (
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-200">
                  <p className="font-medium mb-1">Admin Users Already Exist</p>
                  <p>You can create additional admin accounts or return to login if you already have access.</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-200">
                <p className="font-medium mb-1">Admin Setup Key Required</p>
                <p>Use: <code className="bg-amber-900/40 px-1 py-0.5 rounded text-xs">truthguard-admin-2024</code></p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="admin-key" className="text-slate-200">Admin Setup Key</Label>
              <Input
                id="admin-key"
                type="password"
                placeholder="Enter admin setup key"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                required
                disabled={isLoading}
                className="bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-400"
              />
            </div>

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
              <Label htmlFor="admin-password" className="text-slate-200">Admin Password</Label>
              <Input
                id="admin-password"
                type="password"
                placeholder="Create a secure password"
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
              {isLoading ? 'Creating Admin Account...' : 'Create Admin Account'}
            </Button>
          </form>

          <div className="text-center">
            <button
              onClick={onBack}
              className="text-sm text-slate-400 hover:text-slate-300"
              disabled={isLoading}
            >
              ← Back to Admin Login
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}