import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ShieldCheck, AlertTriangle, CheckCircle } from 'lucide-react';
import { db, auth } from '../../utils/firebase';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { toast } from 'sonner';

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
      const adminsRef = collection(db, 'admins');
      const q = query(adminsRef, where('isAdmin', '==', true));
      const querySnapshot = await getDocs(q);

      setHasExistingAdmins(!querySnapshot.empty);
    } catch (error) {
      console.error('Failed to check existing admins:', error);
      setHasExistingAdmins(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate admin setup key
      if (adminKey !== 'truthguard-admin-2024') {
        toast.error('Invalid admin setup key');
        return;
      }

      // Check if user already exists in Firebase Auth
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const existingUsers = await getDocs(q);

      if (!existingUsers.empty) {
        toast.error('User already exists');
        return;
      }

      // Create Firebase Auth user account first
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Create admin user in Firestore
      await addDoc(usersRef, {
        uid: userCredential.user.uid,
        email: email,
        isAdmin: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      toast.success('Admin account created successfully!');

      // Clear form
      setEmail('');
      setPassword('');
      setAdminKey('');

      onAdminCreated();

    } catch (error: any) {
      console.error('Admin setup error:', error);

      // Handle specific Firebase errors
      if (error.code === 'auth/email-already-in-use') {
        toast.error('An account with this email already exists');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Password is too weak. Please choose a stronger password');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Invalid email address');
      } else {
        toast.error('Network error: Please check your connection and try again');
      }
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