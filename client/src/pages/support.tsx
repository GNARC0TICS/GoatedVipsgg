import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export default function SupportPage() {
  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>VIP Support</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-[#8A8B91]">
            For the fastest support, please contact us directly on Telegram:
          </p>
          <a
            href="https://t.me/xGoombas"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button className="w-full bg-[#D7FF00] text-[#14151A] hover:bg-[#D7FF00]/90">
              Contact on Telegram <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </a>
          <div className="mt-6 pt-6 border-t border-[#2A2B31]">
            <h3 className="text-lg font-medium mb-4">Other Support Options</h3>
            <div className="space-y-3">
              <p className="text-[#8A8B91]">
                You can also reach us through these channels:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-[#8A8B91]">
                <li>Join our <a href="/telegram" className="text-[#D7FF00] hover:underline">Telegram Community</a></li>
                <li>Check our <a href="/faq" className="text-[#D7FF00] hover:underline">FAQ</a> for quick answers</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
