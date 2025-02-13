import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Webhook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

interface BonusCode {
  id: string;
  code: string;
  description: string;
  bonusAmount: string;
  requiredWager: string;
  totalClaims: number;
  currentClaims: number;
  expiresAt: string;
  status: string;
  source: string;
  createdBy: string;
}

interface FormData {
  code: string;
  description: string;
  bonusAmount: string;
  requiredWager: string;
  totalClaims: number;
  expiresAt: string;
}

export default function BonusCodeManagement() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCode, setSelectedCode] = useState<BonusCode | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState<FormData>({
    code: "",
    description: "",
    bonusAmount: "",
    requiredWager: "",
    totalClaims: 0,
    expiresAt: "",
  });

  const { data: codes, isLoading } = useQuery<BonusCode[]>({
    queryKey: ["bonus-codes"],
    queryFn: async () => {
      const response = await fetch("/api/admin/bonus-codes");
      if (!response.ok) throw new Error("Failed to fetch bonus codes");
      return response.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/admin/bonus-codes" + (isEditing ? `/${selectedCode?.id}` : ""), {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to save bonus code");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bonus-codes"] });
      toast({
        title: `Bonus code ${isEditing ? "updated" : "created"} successfully`,
        variant: "default",
      });
      setFormData({
        code: "",
        description: "",
        bonusAmount: "",
        requiredWager: "",
        totalClaims: 0,
        expiresAt: "",
      });
      setIsEditing(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save bonus code",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/bonus-codes/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete bonus code");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bonus-codes"] });
      toast({
        title: "Bonus code deleted successfully",
        variant: "default",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete bonus code",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-white">Bonus Code Management</h2>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-[#D7FF00] text-black hover:bg-[#D7FF00]/80">
                <Plus className="h-4 w-4 mr-2" />
                Add New Code
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isEditing ? "Edit" : "Add"} Bonus Code</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  placeholder="Code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                />
                <Input
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
                <Input
                  placeholder="Bonus Amount (e.g. $10)"
                  value={formData.bonusAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, bonusAmount: e.target.value })
                  }
                />
                <Input
                  placeholder="Required Wager"
                  value={formData.requiredWager}
                  onChange={(e) =>
                    setFormData({ ...formData, requiredWager: e.target.value })
                  }
                />
                <Input
                  type="number"
                  placeholder="Total Claims Allowed"
                  value={formData.totalClaims}
                  onChange={(e) =>
                    setFormData({ ...formData, totalClaims: parseInt(e.target.value) })
                  }
                />
                <Input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) =>
                    setFormData({ ...formData, expiresAt: e.target.value })
                  }
                />
                <Button type="submit" className="w-full">
                  {isEditing ? "Update" : "Create"} Code
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {isLoading ? (
            <div className="text-center py-4">Loading...</div>
          ) : (
            codes?.map((code) => (
              <Card
                key={code.id}
                className="p-4 bg-[#1A1B21]/50 border-[#2A2B31]"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-white">{code.code}</h3>
                      <Badge variant={code.source === 'telegram' ? 'secondary' : 'default'}>
                        {code.source === 'telegram' ? (
                          <Webhook className="h-3 w-3 mr-1" />
                        ) : null}
                        {code.source}
                      </Badge>
                    </div>
                    <p className="text-[#8A8B91]">{code.description}</p>
                    <p className="text-[#D7FF00]">{code.bonusAmount}</p>
                    <div className="text-sm text-[#8A8B91] mt-1">
                      Claims: {code.currentClaims}/{code.totalClaims} • 
                      Expires: {new Date(code.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setIsEditing(true);
                        setSelectedCode(code);
                        setFormData({
                          code: code.code,
                          description: code.description,
                          bonusAmount: code.bonusAmount,
                          requiredWager: code.requiredWager,
                          totalClaims: code.totalClaims,
                          expiresAt: new Date(code.expiresAt)
                            .toISOString()
                            .slice(0, 16),
                        });
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(code.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}