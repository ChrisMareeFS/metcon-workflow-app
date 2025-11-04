import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { authService } from '../../services/authService';
import { Lock, User, AlertCircle, Shield } from 'lucide-react';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const { setUser, setToken, setNeedsTwoFactor, setTempSession } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.login(data);

      if (!response.success) {
        setError(response.error || 'Login failed');
        return;
      }

      // Check if 2FA is required
      if (response.data?.requires_2fa) {
        setNeedsTwoFactor(true);
        setTempSession(response.data.temp_session_id || null);
        navigate('/verify-2fa');
      } else {
        // Direct login (no 2FA)
        if (response.data?.user && response.data?.token) {
          setUser(response.data.user);
          setToken(response.data.token);
          navigate('/');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md">
        {/* Logo/Header Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-500 rounded-2xl mb-6">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-semibold text-gray-900">MetCon Flows</h1>
          <p className="text-gray-600 mt-2">Precious Metals Processing</p>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-gray-200">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-900">Welcome Back</h2>
            <p className="text-gray-600 mt-2">Sign in to continue</p>
          </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

            <div className="space-y-5">
                <div className="relative">
                <User className="absolute left-4 top-[50px] h-5 w-5 text-gray-400 pointer-events-none z-10 transform -translate-y-1/2" />
                  <Input
                    {...register('username')}
                    type="text"
                    label="Username"
                    placeholder="Enter your username"
                    className="pl-12"
                    error={errors.username?.message}
                    autoComplete="username"
                    autoFocus
                  />
                </div>

                <div className="relative">
                <Lock className="absolute left-4 top-[50px] h-5 w-5 text-gray-400 pointer-events-none z-10 transform -translate-y-1/2" />
                  <Input
                    {...register('password')}
                    type="password"
                    label="Password"
                    placeholder="Enter your password"
                    className="pl-12"
                    error={errors.password?.message}
                    autoComplete="current-password"
                  />
                </div>
              </div>

            <Button type="submit" variant="primary" size="lg" className="w-full btn-touch" isLoading={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            {/* Test Credentials Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="bg-gray-50 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                  Test Credentials
                </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg">
                  <span className="font-medium text-gray-700">Admin</span>
                  <span className="font-mono text-gray-600">admin / Admin123!</span>
                  </div>
                <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg">
                  <span className="font-medium text-gray-700">Supervisor</span>
                  <span className="font-mono text-gray-600">supervisor1 / Supervisor123!</span>
                  </div>
                <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg">
                  <span className="font-medium text-gray-700">Operator</span>
                  <span className="font-mono text-gray-600">operator1 / Operator123!</span>
                  </div>
                <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg">
                  <span className="font-medium text-gray-700">Analyst</span>
                  <span className="font-mono text-gray-600">analyst1 / Analyst123!</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-center text-gray-500">
                © {new Date().getFullYear()} MetCon. All rights reserved.
              </p>
            </div>
        </div>
      </div>
    </div>
  );
}
