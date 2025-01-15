
import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "./ui/use-toast";

export function Newsletter() {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Success!",
      description: "Thank you for subscribing to our newsletter.",
    });
    setEmail("");
  };

  return (
    <div className="w-full bg-[#1A1B21]/50 backdrop-blur-sm p-8 rounded-xl border border-[#2A2B31]">
      <h3 className="text-2xl font-heading text-white mb-4">Stay Updated</h3>
      <p className="text-[#8A8B91] mb-6">Subscribe to receive exclusive offers and updates.</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-[#14151A]"
          required
        />
        <Button type="submit">Subscribe</Button>
      </form>
    </div>
  );
}
