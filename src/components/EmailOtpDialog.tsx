import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { CheckCircle2, Loader2, Mail } from 'lucide-react';

interface EmailOtpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  onVerified: () => void;
}

export default function EmailOtpDialog({ open, onOpenChange, email, onVerified }: EmailOtpDialogProps) {
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'send' | 'verify' | 'verified'>('send');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSendOtp = async () => {
    setError('');
    setLoading(true);
    try {
      const sendOtp = httpsCallable(functions, 'sendEmailOtp');
      await sendOtp({ email });
      setStep('verify');
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err: any) {
      setError(err?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const verifyOtp = httpsCallable(functions, 'verifyEmailOtp');
      const result = await verifyOtp({ email, otp });
      const data = result.data as { verified: boolean };
      if (data.verified) {
        setStep('verified');
        setTimeout(() => {
          onVerified();
          onOpenChange(false);
        }, 1200);
      } else {
        setError('Invalid or expired OTP. Please try again.');
      }
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setOtp('');
    setError('');
    setStep('send');
    handleSendOtp();
  };

  const handleClose = (val: boolean) => {
    if (step === 'verified') return;
    onOpenChange(val);
    if (!val) {
      setStep('send');
      setOtp('');
      setError('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xs rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Verify your email</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            We'll send a 6-digit code to <span className="font-medium text-foreground">{email}</span>
          </DialogDescription>
        </DialogHeader>

        {step === 'send' && (
          <div className="space-y-4 pt-2">
            <Button onClick={handleSendOtp} disabled={loading} className="w-full h-12 rounded-xl gradient-coral text-primary-foreground">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
              Send OTP
            </Button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4 pt-2">
            <Input
              ref={inputRef}
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              className="h-12 rounded-xl text-center text-lg tracking-widest font-mono"
              inputMode="numeric"
              autoComplete="one-time-code"
            />
            <Button onClick={handleVerifyOtp} disabled={loading || otp.length !== 6} className="w-full h-12 rounded-xl gradient-coral text-primary-foreground">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Verify
            </Button>
            <button type="button" onClick={handleResend} disabled={loading} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
              Didn't receive it? Resend
            </button>
          </div>
        )}

        {step === 'verified' && (
          <div className="flex flex-col items-center gap-2 py-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <p className="text-sm font-medium text-emerald-700">Email verified!</p>
          </div>
        )}

        {error && <p className="text-sm text-destructive text-center">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
