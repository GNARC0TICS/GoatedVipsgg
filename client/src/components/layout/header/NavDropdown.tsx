import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { dropdownClasses } from '../styles';

interface NavDropdownProps {
  label: string | React.ReactNode;
  items: {
    href: string;
    label: string | React.ReactNode;
  }[];
  defaultHref?: string;
}

export function NavDropdown({ label, items, defaultHref }: NavDropdownProps) {
  return (
    <div className="relative group">
      <Link href={defaultHref || items[0].href}>
        <Button
          variant="ghost"
          className="flex items-center gap-1.5 font-heading text-white hover:text-[#D7FF00] transition-colors duration-300 hover:bg-transparent px-2"
        >
          <span className="font-bold">{label}</span>
        </Button>
      </Link>
      <div className="absolute left-0 mt-2 w-full min-w-[200px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 ease-in-out z-50">
        <div className={dropdownClasses.content}>
          {items.map((item, index) => (
            <Link key={index} href={item.href}>
              <div className={dropdownClasses.item}>
                {item.label}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
