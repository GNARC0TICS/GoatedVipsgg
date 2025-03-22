import { Button } from '@/components/ui/button';

export function NewsletterForm() {
  return (
    <form onSubmit={(e) => e.preventDefault()} className="flex gap-2">
      <input
        type="email"
        placeholder="Enter your email"
        className="flex-1 px-4 py-2 rounded-lg border border-[#14151A]/20 focus:outline-none focus:border-[#14151A] focus:ring-1 focus:ring-[#14151A]/30 transition-all duration-300 bg-white/95"
      />
      <Button className="bg-[#14151A] text-black hover:bg-[#14151A]/80 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 font-medium">
        Subscribe
      </Button>
    </form>
  );
}
