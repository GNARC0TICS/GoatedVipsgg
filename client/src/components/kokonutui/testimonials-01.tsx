import * as React from "react";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

interface Testimonial {
  quote: string;
  author: string;
  role?: string;
  avatar?: string;
  rating?: number;
}

interface TestimonialsProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  testimonials?: Testimonial[];
}

export default function Testimonials01({
  className,
  title = "What Our Users Say",
  subtitle = "Don't just take our word for it. Hear from some of our amazing customers who have transformed their gaming experience with us.",
  testimonials,
  ...props
}: TestimonialsProps) {
  const defaultTestimonials: Testimonial[] = [
    {
      quote: "Goated has completely changed how I think about online gaming. The rewards are incredible, and the platform is so easy to use!",
      author: "Alex Johnson",
      role: "VIP Player",
      rating: 5,
      avatar: "https://i.pravatar.cc/100?img=1",
    },
    {
      quote: "I've won multiple daily races and the prizes are actually worth competing for. Their customer support is also top-notch!",
      author: "Sarah Williams",
      role: "Silver Tier",
      rating: 5,
      avatar: "https://i.pravatar.cc/100?img=2",
    },
    {
      quote: "The weekly tournaments are my favorite feature. They're well-organized and the prize pools are impressively large.",
      author: "Michael Chen",
      role: "Gold Tier",
      rating: 4,
      avatar: "https://i.pravatar.cc/100?img=3",
    },
  ];

  const displayTestimonials = testimonials || defaultTestimonials;

  return (
    <section
      className={cn("bg-zinc-900 py-16 md:py-24", className)}
      {...props}
    >
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter text-white sm:text-4xl md:text-5xl">
              {title}
            </h2>
            <p className="mx-auto max-w-[700px] text-zinc-400 md:text-xl">
              {subtitle}
            </p>
          </div>
        </div>
        <div className="mx-auto mt-12 grid gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
          {displayTestimonials.map((testimonial, index) => (
            <div
              key={index}
              className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-md"
            >
              <div className="space-y-4">
                {testimonial.rating && (
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-5 w-5",
                          i < testimonial.rating!
                            ? "fill-[#D7FF00] text-[#D7FF00]"
                            : "fill-zinc-800 text-zinc-800"
                        )}
                      />
                    ))}
                  </div>
                )}
                <p className="text-lg text-white">"{testimonial.quote}"</p>
              </div>
              <div className="mt-6 flex items-center space-x-4">
                {testimonial.avatar && (
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.author}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="font-medium text-white">{testimonial.author}</p>
                  {testimonial.role && (
                    <p className="text-sm text-zinc-400">{testimonial.role}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}