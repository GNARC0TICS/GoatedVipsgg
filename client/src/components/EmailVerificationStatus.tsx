
import React from 'react';

interface EmailVerificationStatusProps {
  isVerified: boolean;
}

export const EmailVerificationStatus: React.FC<EmailVerificationStatusProps> = ({ isVerified }) => {
  return (
    <div className={`rounded-md p-2 ${isVerified ? 'bg-green-100' : 'bg-yellow-100'}`}>
      <span className={`text-sm ${isVerified ? 'text-green-700' : 'text-yellow-700'}`}>
        {isVerified ? 'Email verified' : 'Email pending verification'}
      </span>
    </div>
  );
};

export default EmailVerificationStatus;
