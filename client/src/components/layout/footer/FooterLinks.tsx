export function FooterLinks() {
  return (
    <div className="flex flex-col items-center gap-4 mb-6">
      <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 px-4">
        <a
          href="https://www.goated.com/r/VIPBOOST"
          target="_blank"
          rel="noopener noreferrer"
          className="transform transition-all duration-300 hover:scale-105 hover:brightness-110"
        >
          <img
            src="/images/Goated logo with text.png"
            alt="Goated"
            className="h-10 md:h-12 w-auto object-contain max-w-[200px]"
          />
        </a>
        <a
          href="https://t.me/+iFlHl5V9VcszZTVh"
          target="_blank"
          rel="noopener noreferrer"
          className="transform transition-all duration-300 hover:scale-105 hover:brightness-110"
        >
          <img
            src="/images/Goated logo with text1.png"
            alt="Goated Partner"
            className="h-10 md:h-12 w-auto object-contain max-w-[200px]"
          />
        </a>
      </div>
    </div>
  );
}
