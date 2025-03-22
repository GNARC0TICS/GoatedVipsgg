import { useState } from 'react';
import { Link } from 'wouter';
import { DesktopNavigation } from './DesktopNavigation';
import { MobileNavigation } from './MobileNavigation';
import { UserSection } from './UserSection';
import { useScrollPosition } from '../hooks/useScrollPosition';
import { useResponsive } from '../hooks/useResponsive';
import { headerClasses } from '../styles';
import type { SelectUser } from '@db/schema';

interface HeaderProps {
  user: SelectUser | undefined;
  onLogout: () => Promise<void>;
}

export function Header({ user, onLogout }: HeaderProps) {
  const [openMobile, setOpenMobile] = useState(false);
  const scrolled = useScrollPosition();
  const { isMobile } = useResponsive();
  
  return (
    <header className={`${headerClasses.container} ${scrolled ? "h-16 shadow-md" : "h-16"}`}>
      <nav className={headerClasses.nav}>
        {/* Navigation content */}
        <div className="flex items-center gap-8">
          <Link href="/" className="group relative">
            <img
              src="/images/logo-neon.png"
              alt="GOATED"
              className={headerClasses.logo}
            />
            <div className="absolute inset-0 bg-[#D7FF00]/0 rounded-full filter blur-md transition-all duration-300 group-hover:bg-[#D7FF00]/30 group-hover:blur-xl -z-10"></div>
          </Link>

          {/* Desktop Navigation */}
          <DesktopNavigation user={user} />

          {/* Mobile Navigation */}
          <MobileNavigation 
            user={user} 
            open={openMobile} 
            onOpenChange={setOpenMobile} 
          />
        </div>

        {/* User section */}
        <UserSection 
          user={user} 
          isMobile={isMobile} 
          onLogout={onLogout} 
        />
      </nav>
    </header>
  );
}
