import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { NewsletterForm } from './NewsletterForm';
import { FooterLinks } from './FooterLinks';
import { footerClasses } from '../styles';

interface FooterProps {
  footerRef: React.RefObject<HTMLElement>;
}

export function Footer({ footerRef }: FooterProps) {
  return (
    <footer ref={footerRef} className={footerClasses.wrapper}>
      <div className="absolute inset-0 bg-gradient-to-b from-[#D7FF00]/20 to-transparent pointer-events-none" />
      <div className={footerClasses.container}>
        <div className={footerClasses.grid}>
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h4 className={footerClasses.heading}>Ready to get Goated?</h4>
              <a
                href="https://www.goated.com/r/VIPBOOST"
                target="_blank"
                rel="noopener noreferrer"
                className="transform transition-transform duration-300 hover:scale-110"
              >
                <img
                  src="/images/Goated Logo - Black.png"
                  alt="Goated"
                  className="h-8 w-auto"
                />
              </a>
            </div>
            <p className="text-[#14151A] mb-6">
              Sign up now and enjoy additional rewards from our platform.
              Start your journey to becoming a casino legend!
            </p>
            <Button
              onClick={() =>
                window.open("https://www.goated.com/r/EARLYACCESS", "_blank")
              }
              className="bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 font-medium gap-2 flex items-center"
            >
              <span>Sign Up Now</span>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h4 className={footerClasses.heading}>Stay Updated</h4>
              <a
                href="https://t.me/+iFlHl5V9VcszZTVh"
                target="_blank"
                rel="noopener noreferrer"
                className="transform transition-transform duration-300 hover:scale-110"
              >
                <img
                  src="/images/Goated logo with text.png"
                  alt="Goated"
                  className="h-[4.5rem] w-auto object-contain"
                />
              </a>
            </div>
            <p className="text-[#14151A] mb-6">
              Subscribe to our newsletter for exclusive offers and updates!
            </p>
            <NewsletterForm />
          </div>
        </div>
      </div>
      <div className="bg-[#14151A] text-[#8A8B91] text-sm py-6">
        <div className="container mx-auto px-4 text-center">
          <FooterLinks />
          <p className="mb-2">© 2024 GoatedVips.gg. All rights reserved.</p>
          <p className="mb-2">
            Disclaimer: This is an independent platform not affiliated with or
            operated by Goated.com.
          </p>
          <p>Gamble responsibly. 18+ only. BeGambleAware.org</p>
        </div>
      </div>
    </footer>
  );
}
