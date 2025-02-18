import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

declare global {
  interface Window {
    onTelegramAuth: (user: TelegramUser) => void;
  }
}

interface TelegramUser {
  id: number;
  first_name: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface Props {
  botName: string;
  buttonSize?: 'large' | 'medium' | 'small';
  showUserPic?: boolean;
  cornerRadius?: number;
  requestAccess?: boolean;
}

export function TelegramLoginWidget({
  botName,
  buttonSize = 'large',
  showUserPic = true,
  cornerRadius = 8,
  requestAccess = true,
}: Props) {
  const widgetRef = useRef<HTMLDivElement>(null);
  const { login } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Remove any existing script
    const existingScript = document.getElementById('telegram-login-script');
    if (existingScript) {
      existingScript.remove();
    }

    // Create new script
    const script = document.createElement('script');
    script.id = 'telegram-login-script';
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', buttonSize);
    script.setAttribute('data-radius', cornerRadius.toString());
    script.setAttribute('data-auth-url', '/api/auth/telegram/callback');
    script.setAttribute('data-request-access', requestAccess.toString());
    if (showUserPic) {
      script.setAttribute('data-userpic', 'true');
    }
    script.async = true;

    // Add script to widget container
    if (widgetRef.current) {
      widgetRef.current.appendChild(script);
    }

    // Cleanup on unmount
    return () => {
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [botName, buttonSize, showUserPic, cornerRadius, requestAccess]);

  return <div ref={widgetRef} />;
}

export default TelegramLoginWidget;
