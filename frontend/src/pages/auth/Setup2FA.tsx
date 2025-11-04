import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '../../services/authService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Settings, Smartphone, Mail, QrCode, AlertCircle, CheckCircle } from 'lucide-react';

const setup2FASchema = z.object({
  method: z.enum(['sms', 'authenticator', 'email']),
  phone_number: z.string().optional(),
  email: z.string().email().optional(),
  verification_code: z.string().length(6, 'Code must be 6 digits').optional(),
});

type Setup2FAFormData = z.infer<typeof setup2FASchema>;

export default function Setup2FA() {
  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] = useState<'sms' | 'authenticator' | 'email' | null>(null);
  const [step, setStep] = useState<'select' | 'configure' | 'verify' | 'complete'>('select');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Setup2FAFormData>({
    resolver: zodResolver(setup2FASchema),
  });

  const handleMethodSelect = async (method: 'sms' | 'authenticator' | 'email') => {
    setSelectedMethod(method);
    setStep('configure');
    setError(null);
  };

  const onConfigure = async (data: Setup2FAFormData) => {
    if (!selectedMethod) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.setup2FA({
        method: selectedMethod,
        phone_number: data.phone_number,
        email: data.email,
      });

      if (!response.success) {
        setError(response.error || 'Setup failed');
        return;
      }

      if (selectedMethod === 'authenticator' && response.data) {
        setQrCode(response.data.qr_code || null);
        setSecret(response.data.secret || null);
      }

      setStep('verify');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Setup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onVerify = async (data: Setup2FAFormData) => {
    if (!data.verification_code) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.complete2FASetup(data.verification_code);

      if (!response.success) {
        setError(response.error || 'Verification failed');
        return;
      }

      if (response.backup_codes) {
        setBackupCodes(response.backup_codes);
      }

      setStep('complete');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4 py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-primary-600 flex items-center justify-center">
              <Settings className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">METCON FLOWS - Setup 2FA</CardTitle>
          <CardDescription>
            {step === 'select' && 'Choose your preferred verification method'}
            {step === 'configure' && 'Configure your 2FA method'}
            {step === 'verify' && 'Verify your setup'}
            {step === 'complete' && 'Setup complete!'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-danger-50 border border-danger-200 rounded-md">
              <AlertCircle className="h-5 w-5 text-danger-600 flex-shrink-0" />
              <p className="text-sm text-danger-700">{error}</p>
            </div>
          )}

          {/* Step 1: Select Method */}
          {step === 'select' && (
            <div className="space-y-4">
              <div className="grid gap-4">
                {/* SMS Option */}
                <button
                  onClick={() => handleMethodSelect('sms')}
                  className="flex items-start gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left"
                >
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <Smartphone className="h-5 w-5 text-primary-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Text message (SMS)</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Receive a verification code via SMS on your phone
                    </p>
                  </div>
                </button>

                {/* Authenticator App Option */}
                <button
                  onClick={() => handleMethodSelect('authenticator')}
                  className="flex items-start gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left"
                >
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <QrCode className="h-5 w-5 text-primary-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Authenticator app</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Use Google Authenticator, Authy, or similar app
                    </p>
                  </div>
                </button>

                {/* Email Option */}
                <button
                  onClick={() => handleMethodSelect('email')}
                  className="flex items-start gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left"
                >
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-primary-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Email</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Receive a verification code via email
                    </p>
                  </div>
                </button>
              </div>

              <div className="mt-6 text-center">
                <button
                  onClick={() => navigate(-1)}
                  className="text-sm text-gray-600 hover:text-gray-700 hover:underline"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Configure */}
          {step === 'configure' && (
            <form onSubmit={handleSubmit(onConfigure)} className="space-y-4">
              {selectedMethod === 'sms' && (
                <Input
                  {...register('phone_number')}
                  label="Phone Number"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  error={errors.phone_number?.message}
                  helperText="Enter your phone number with country code"
                />
              )}

              {selectedMethod === 'authenticator' && (
                <div className="text-center space-y-4">
                  <p className="text-sm text-gray-600">
                    Scan the QR code with your authenticator app
                  </p>
                  <div className="flex justify-center">
                    <div className="h-48 w-48 bg-gray-100 rounded-lg flex items-center justify-center">
                      {qrCode ? (
                        <img src={qrCode} alt="QR Code" className="h-full w-full" />
                      ) : (
                        <QrCode className="h-24 w-24 text-gray-400" />
                      )}
                    </div>
                  </div>
                  {secret && (
                    <div className="text-sm">
                      <p className="text-gray-600 mb-1">Or enter this code manually:</p>
                      <code className="bg-gray-100 px-3 py-1 rounded text-gray-900 font-mono">
                        {secret}
                      </code>
                    </div>
                  )}
                </div>
              )}

              {selectedMethod === 'email' && (
                <Input
                  {...register('email')}
                  label="Email Address"
                  type="email"
                  placeholder="your.email@example.com"
                  error={errors.email?.message}
                  helperText="We'll send verification codes to this email"
                />
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isLoading}
              >
                Continue
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep('select')}
                  className="text-sm text-gray-600 hover:text-gray-700 hover:underline"
                >
                  ← Choose different method
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Verify */}
          {step === 'verify' && (
            <form onSubmit={handleSubmit(onVerify)} className="space-y-4">
              <Input
                {...register('verification_code')}
                label="Verification Code"
                type="text"
                placeholder="Enter 6-digit code"
                maxLength={6}
                error={errors.verification_code?.message}
                helperText="Enter the code from your chosen method"
                autoFocus
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isLoading}
              >
                Verify and Complete Setup
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep('configure')}
                  className="text-sm text-gray-600 hover:text-gray-700 hover:underline"
                >
                  ← Back
                </button>
              </div>
            </form>
          )}

          {/* Step 4: Complete (with backup codes) */}
          {step === 'complete' && (
            <div className="space-y-6">
              <div className="flex items-center justify-center">
                <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-primary-600" />
                </div>
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">Setup Complete!</h3>
                <p className="text-sm text-gray-600">
                  Two-factor authentication has been enabled for your account
                </p>
              </div>

              {backupCodes.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-yellow-900">
                        Save your backup codes
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Store these codes in a safe place. You can use them to access your account
                        if you lose your device.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {backupCodes.map((code, index) => (
                      <code
                        key={index}
                        className="bg-white px-3 py-2 rounded text-sm font-mono text-gray-900 border border-yellow-300"
                      >
                        {code}
                      </code>
                    ))}
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      const text = backupCodes.join('\n');
                      navigator.clipboard.writeText(text);
                      alert('Backup codes copied to clipboard!');
                    }}
                  >
                    Copy Codes
                  </Button>
                </div>
              )}

              <Button variant="primary" className="w-full" onClick={handleComplete}>
                Continue to Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

