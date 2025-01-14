
import { Twitter, Facebook, Link as LinkIcon } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "./ui/use-toast";

export function SocialShare() {
  const shareUrl = window.location.href;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({ description: "Link copied to clipboard!" });
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="icon" onClick={copyLink}>
        <LinkIcon className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" onClick={() => window.open(`https://twitter.com/intent/tweet?url=${shareUrl}`)}>
        <Twitter className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`)}>
        <Facebook className="h-4 w-4" />
      </Button>
    </div>
  );
}
