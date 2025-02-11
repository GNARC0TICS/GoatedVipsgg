import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2 } from "lucide-react";
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

interface BonusCode {
  id: string;
  code: string;
  description: string;
  value: string;
  expiresAt: string;
}

interface FormData {
  code: string;
  description: string;
  value: string;
  expiresAt: string;
}

export default function BonusCodeManagement() {
  const [codes, setCodes] = useState<BonusCode[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCode, setSelectedCode] = useState<BonusCode | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState<FormData>({
    code: "",
    description: "",
    value: "",
    expiresAt: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/admin/bonus-codes", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEditing ? { ...formData, id: selectedCode?.id } : formData),
      });

      if (response.ok) {
        toast({
          title: `Bonus code ${isEditing ? "updated" : "created"} successfully`,
          variant: "default",
        });
        fetchCodes();
        setFormData({ code: "", description: "", value: "", expiresAt: "" });
        setIsEditing(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save bonus code",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/bonus-codes/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Bonus code deleted successfully",
          variant: "default",
        });
        fetchCodes();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete bonus code",
        variant: "destructive",
      });
    }
  };

  const fetchCodes = async () => {
    try {
      const response = await fetch("/api/admin/bonus-codes");
      const data = await response.json();
      setCodes(data);
    } catch (error) {
      console.error("Failed to fetch bonus codes:", error);
    }
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
                  placeholder="Value (e.g. $10 Free Bonus)"
                  value={formData.value}
                  onChange={(e) =>
                    setFormData({ ...formData, value: e.target.value })
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
          {codes.map((code) => (
            <Card
              key={code.id}
              className="p-4 bg-[#1A1B21]/50 border-[#2A2B31]"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-white">{code.code}</h3>
                  <p className="text-[#8A8B91]">{code.description}</p>
                  <p className="text-[#D7FF00]">{code.value}</p>
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
                        value: code.value,
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
                    onClick={() => handleDelete(code.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </motion.div>
    </div>
  );
}