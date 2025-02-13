import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { Link } from "wouter";

const faqCategories = [
  {
    title: "Getting Started",
    items: [
      {
        question: "How do I start earning rewards?",
        answer:
          "Start by registering on Goated.com under one of our codes. Once your account is linked, you'll automatically be able to track & earn rewards based on your gameplay and wagering activity.",
      },
      {
        question: "What are the VIP levels?",
        answer:
          "The VIP program features multiple tiers, each offering increasingly valuable benefits. Progress through levels by maintaining consistent gameplay and meeting wagering requirements.",
      },
    ],
  },
  {
    title: "Rewards & Benefits",
    items: [
      {
        question: "How are rewards calculated?",
        answer:
          "Rewards are calculated based on your wagering volume and VIP level. Higher levels receive enhanced rewards and exclusive perks.",
      },
      {
        question: "When do I receive my rewards?",
        answer:
          "Rewards are credited automatically to your account on a weekly basis. Special promotions and bonuses may have different distribution schedules.",
      },
    ],
  },
  {
    title: "Technical Support",
    items: [
      {
        question: "How do I contact support?",
        answer:
          "You can reach our VIP support team through live chat, Telegram (@xGoombas), or join our community group for assistance.",
      },
      {
        question: "What if I encounter technical issues?",
        answer:
          "If you experience any technical issues, please contact our VIP support team immediately. We're available 24/7 to assist you.",
      },
    ],
  },
];

export default function FAQPage() {
  const [selectedCategory, setSelectedCategory] = useState("Getting Started");

  return (
    <div className="min-h-screen bg-[#14151A] py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-[#8A8B91] text-lg">
              Find answers to common questions about our platform and services
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <Card className="md:col-span-1 bg-[#1A1B21] border-[#2A2B31]">
              <CardContent className="p-4">
                <nav className="space-y-2">
                  {faqCategories.map((category) => (
                    <Button
                      key={category.title}
                      variant={
                        selectedCategory === category.title
                          ? "secondary"
                          : "ghost"
                      }
                      className="w-full justify-start"
                      onClick={() => setSelectedCategory(category.title)}
                    >
                      {category.title}
                    </Button>
                  ))}
                </nav>
              </CardContent>
            </Card>

            <div className="md:col-span-3">
              <Card className="bg-[#1A1B21] border-[#2A2B31]">
                <CardHeader>
                  <CardTitle>{selectedCategory}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {faqCategories
                      .find((cat) => cat.title === selectedCategory)
                      ?.items.map((item, index) => (
                        <AccordionItem key={index} value={`item-${index}`}>
                          <AccordionTrigger className="text-white hover:text-[#D7FF00]">
                            {item.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-[#8A8B91]">
                            {item.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                  </Accordion>
                </CardContent>
              </Card>

              <Card className="mt-6 bg-[#1A1B21] border-[#2A2B31]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        Still have questions?
                      </h3>
                      <p className="text-[#8A8B91]">
                        Our VIP support team is here to help you 24/7
                      </p>
                    </div>
                    <Link href="/support">
                      <Button className="bg-[#D7FF00] text-[#14151A] hover:bg-[#D7FF00]/90">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Contact Support
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
