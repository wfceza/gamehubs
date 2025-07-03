
import React from 'react';
import { Progress } from '@/components/ui/progress';

interface PasswordStrengthIndicatorProps {
  password: string;
}

const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const calculateStrength = (password: string) => {
    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      longEnough: password.length >= 12
    };

    // Basic requirements
    if (checks.length) score += 20;
    if (checks.lowercase) score += 15;
    if (checks.uppercase) score += 15;
    if (checks.number) score += 15;
    if (checks.special) score += 20;
    if (checks.longEnough) score += 15;

    return { score, checks };
  };

  const { score, checks } = calculateStrength(password);
  
  const getStrengthLabel = (score: number) => {
    if (score < 40) return { label: 'Weak', color: 'bg-red-500' };
    if (score < 70) return { label: 'Fair', color: 'bg-yellow-500' };
    if (score < 90) return { label: 'Good', color: 'bg-blue-500' };
    return { label: 'Strong', color: 'bg-green-500' };
  };

  if (!password) return null;

  const { label, color } = getStrengthLabel(score);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Password Strength</span>
        <span className={`text-sm font-medium ${
          score < 40 ? 'text-red-600' : 
          score < 70 ? 'text-yellow-600' : 
          score < 90 ? 'text-blue-600' : 'text-green-600'
        }`}>
          {label}
        </span>
      </div>
      <Progress value={score} className="h-2" />
      
      <div className="text-xs text-gray-500 space-y-1">
        <div className={checks.length ? 'text-green-600' : 'text-red-600'}>
          ✓ At least 8 characters
        </div>
        <div className={checks.lowercase ? 'text-green-600' : 'text-red-600'}>
          ✓ One lowercase letter
        </div>
        <div className={checks.uppercase ? 'text-green-600' : 'text-red-600'}>
          ✓ One uppercase letter
        </div>
        <div className={checks.number ? 'text-green-600' : 'text-red-600'}>
          ✓ One number
        </div>
        <div className={checks.special ? 'text-green-600' : 'text-gray-500'}>
          ✓ Special character (recommended)
        </div>
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator;
