import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { AlertCircle, Clock } from 'lucide-react';

const CODE_LENGTH = 6;

export default function Verify2FA() {
  const navigate = useNavigate();
  const { tempSession, setUser, setToken, setNeedsTwoFactor, setTempSession } = useAuthStore();
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if no temp session
  useEffect(() => {
    if (!tempSession) {
      navigate('/login');
    }
  }, [tempSession, navigate]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setError('Code expired. Please request a new one.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1); // Take only the last character
    setCode(newCode);
    setError(null);

    // Auto-focus next input
    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (newCode.every((digit) => digit !== '') && !isLoading) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    // Handle paste
    else if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handlePaste();
    }
  };

  const handlePaste = async () => {
    try {
      const pastedText = await navigator.clipboard.readText();
      const digits = pastedText.replace(/\D/g, '').slice(0, CODE_LENGTH);
      
      if (digits.length === CODE_LENGTH) {
        const newCode = digits.split('');
        setCode(newCode);
        setError(null);
        handleVerify(digits);
      }
    } catch (err) {
      // Clipboard access denied or failed
    }
  };

  const handleVerify = async (codeString: string) => {
    if (!tempSession) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.verify2FA({
        temp_session_id: tempSession,
        code: codeString,
      });

      if (!response.success) {
        setError(response.error || 'Invalid code');
        setCode(Array(CODE_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
        return;
      }

      if (response.data?.user && response.data?.token) {
        setUser(response.data.user);
        setToken(response.data.token);
        setNeedsTwoFactor(false);
        setTempSession(null);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed. Please try again.');
      setCode(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!tempSession) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.resend2FACode(tempSession);

      if (response.success) {
        setTimeRemaining(300); // Reset timer
        alert('New code sent!');
      } else {
        setError(response.error || 'Failed to resend code');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-primary-600 flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">METCON FLOWS - 2FA</CardTitle>
          <CardDescription>
            A 6-digit code has been sent to your registered device
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-danger-50 border border-danger-200 rounded-md">
              <AlertCircle className="h-5 w-5 text-danger-600 flex-shrink-0" />
              <p className="text-sm text-danger-700">{error}</p>
            </div>
          )}

          {/* Code input boxes */}
          <div className="flex gap-2 justify-center">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-14 text-center text-2xl font-semibold border-2 border-gray-300 rounded-md focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-colors"
                disabled={isLoading}
                autoFocus={index === 0}
              />
            ))}
          </div>

          {/* Timer */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>
              Code expires in: <span className="font-semibold">{formatTime(timeRemaining)}</span>
            </span>
          </div>

          {/* Verify button */}
          <Button
            variant="primary"
            className="w-full"
            isLoading={isLoading}
            disabled={code.some((digit) => digit === '') || isLoading}
            onClick={() => handleVerify(code.join(''))}
          >
            {isLoading ? 'Verifying...' : 'Verify Code'}
          </Button>

          {/* Resend / Try another method */}
          <div className="space-y-2 text-center text-sm">
            <p className="text-gray-600">Didn't receive code?</p>
            <div className="flex gap-4 justify-center">
              <button
                type="button"
                onClick={handleResend}
                className="text-primary-600 hover:text-primary-700 hover:underline font-medium"
                disabled={isLoading || timeRemaining === 0}
              >
                Resend
              </button>
              <span className="text-gray-400">|</span>
              <button
                type="button"
                onClick={() => {
                  // TODO: Implement alternative 2FA method selection
                  alert('Try another method - to be implemented');
                }}
                className="text-primary-600 hover:text-primary-700 hover:underline font-medium"
                disabled={isLoading}
              >
                Try another method
              </button>
            </div>
          </div>

          {/* Back to login */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setTempSession(null);
                setNeedsTwoFactor(false);
                navigate('/login');
              }}
              className="text-sm text-gray-600 hover:text-gray-700 hover:underline"
            >
              ← Back to login
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

