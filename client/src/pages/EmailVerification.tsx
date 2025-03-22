
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PageTransition } from '../components/PageTransition';

export default function EmailVerification() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const navigate = useNavigate();
  
  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      return;
    }

    fetch('/api/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
    .then(res => {
      if (res.ok) {
        setStatus('success');
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        setStatus('error');
      }
    })
    .catch(() => setStatus('error'));
  }, []);

  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-[#1A1B21]/50 backdrop-blur-sm p-8 rounded-lg border border-[#2A2B31] max-w-md w-full">
          {status === 'verifying' && (
            <div className="text-center">
              <h1 className="text-2xl font-heading text-white mb-4">Verifying Email...</h1>
              <div className="animate-spin h-8 w-8 border-4 border-[#D7FF00] border-t-transparent rounded-full mx-auto"></div>
            </div>
          )}
          {status === 'success' && (
            <div className="text-center">
              <h1 className="text-2xl font-heading text-[#D7FF00] mb-4">Email Verified!</h1>
              <p className="text-white">Redirecting to dashboard...</p>
            </div>
          )}
          {status === 'error' && (
            <div className="text-center">
              <h1 className="text-2xl font-heading text-red-500 mb-4">Verification Failed</h1>
              <p className="text-white mb-4">Unable to verify your email. The link may be expired or invalid.</p>
              <button 
                onClick={() => navigate('/dashboard')}
                className="bg-[#D7FF00] text-black px-6 py-2 rounded-lg font-semibold"
              >
                Return to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
