import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(username, password);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div 
        className="hidden lg:flex lg:w-1/2 bg-cover bg-center relative"
        style={{ backgroundImage: `url('https://images.pexels.com/photos/28716782/pexels-photo-28716782.jpeg')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/70"></div>
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <h1 className="text-5xl font-serif font-semibold mb-4">Gold Shop ERP</h1>
          <p className="text-lg opacity-90 font-mono">The Artisan Ledger</p>
          <p className="mt-8 text-sm leading-relaxed max-w-md">
            Precision management for your gold business. Track inventory, manage job cards, 
            generate invoices, and maintain complete financial control.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl font-serif font-semibold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-muted-foreground">Sign in to access your dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6" data-testid="login-form">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                data-testid="username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                data-testid="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <Button
              type="submit"
              data-testid="login-submit-button"
              disabled={isLoading}
              className="w-full h-11 bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-muted/50 rounded-md border border-border">
            <p className="text-xs text-muted-foreground font-mono mb-2">Demo Credentials:</p>
            <p className="text-xs font-mono"><strong>Username:</strong> admin</p>
            <p className="text-xs font-mono"><strong>Password:</strong> admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
