import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrashIcon, 
  PencilIcon, 
  PlusCircle,
  Copy,
  Clock,
  X
} from "lucide-react";

interface WagerRaceBase {
  title: string;
  type: "weekly" | "monthly" | "weekend";
  prizePool: number;
  minWager: number;
  startDate: string;
  endDate: string;
  prizeDistribution: Record<string, number>;
}

interface WagerRaceDB extends WagerRaceBase {
  id: number;
  status: "upcoming" | "live" | "completed";
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

const wagerRaceSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum(["weekly", "monthly", "weekend"]),
  prizePool: z.number().min(1, "Prize pool must be greater than 0"),
  minWager: z.number().min(1, "Minimum wager must be greater than 0"),
  startDate: z.string(),
  endDate: z.string(),
  prizeDistribution: z.record(z.string(), z.number()),
});

type WagerRace = z.infer<typeof wagerRaceSchema>;

export default function WagerRaceManagement() {
  const { toast } = useToast();
  const [editingRace, setEditingRace] = useState<WagerRaceDB | null>(null);
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<WagerRace>({
    resolver: zodResolver(wagerRaceSchema),
    defaultValues: {
      title: "",
      type: "weekly",
      prizePool: 0,
      minWager: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: "",
      prizeDistribution: {
        "1": 25,
        "2": 15,
        "3": 10,
        "4": 7.5,
        "5": 7.5,
        "6": 7.5,
        "7": 7.5,
        "8": 5,
        "9": 5,
        "10": 5,
      },
    },
  });

  const { data: races = [], isLoading } = useQuery<WagerRaceDB[]>({
    queryKey: ["/api/admin/wager-races"],
  });

  const createRace = useMutation({
    mutationFn: async (data: WagerRace) => {
      const response = await fetch("/api/admin/wager-races", {
        method: editingRace ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wager-races"] });
      toast({
        title: `${editingRace ? "Updated" : "Created"} Successfully`,
        description: `Race has been ${editingRace ? "updated" : "created"}.`,
      });
      form.reset();
      setEditingRace(null);
      setShowForm(false);
    },
  });

  const deleteRace = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/wager-races/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error(await response.text());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wager-races"] });
      toast({
        title: "Deleted Successfully",
        description: "Race has been deleted.",
      });
    },
  });

  const onSubmit = (data: WagerRace) => {
    createRace.mutate(data);
  };

  // Quick Actions Component
  const QuickActions = ({ race }: { race: WagerRaceDB }) => (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="ghost"
        className="flex items-center gap-1"
        onClick={() => {
          form.reset({
            ...race,
            prizePool: race.prizePool,
            minWager: race.minWager,
          });
          setEditingRace(race);
          setShowForm(true);
        }}
      >
        <PencilIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Edit</span>
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="flex items-center gap-1"
        onClick={() => {
          const newRace = {
            ...race,
            title: `${race.title} (Copy)`,
            startDate: new Date().toISOString(),
          };
          form.reset(newRace);
          setShowForm(true);
        }}
      >
        <Copy className="h-4 w-4" />
        <span className="hidden sm:inline">Duplicate</span>
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="flex items-center gap-1 text-destructive"
        onClick={() => deleteRace.mutate(race.id)}
      >
        <TrashIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Delete</span>
      </Button>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header with Quick Create Button */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-[#D7FF00]">
            Wager Race Management
          </h1>
          <Button
            onClick={() => {
              form.reset();
              setEditingRace(null);
              setShowForm(true);
            }}
            className="bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            New Race
          </Button>
        </div>

        {/* Form Section */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-[#1A1B21]/50 backdrop-blur-sm p-4 md:p-8 rounded-xl border border-[#2A2B31]">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-heading font-bold text-[#D7FF00]">
                    {editingRace ? "Edit Race" : "Create New Race"}
                  </h2>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setShowForm(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Weekly Race #1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select race type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="weekend">Weekend</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="prizePool"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prize Pool</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="10000"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="minWager"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minimum Wager</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="100"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                              <Input type="datetime-local" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Date</FormLabel>
                            <FormControl>
                              <Input type="datetime-local" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowForm(false);
                          form.reset();
                          setEditingRace(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90"
                        disabled={createRace.isPending}
                      >
                        {createRace.isPending ? "Saving..." : editingRace ? "Update Race" : "Create Race"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Race List */}
        {races.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid gap-4"
          >
            <h2 className="text-xl md:text-2xl font-heading font-bold text-white">Active Races</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {races.map((race) => (
                <Card key={race.id} className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1">
                        <CardTitle className="text-lg md:text-xl line-clamp-1">{race.title}</CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{new Date(race.startDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="shrink-0"
                        onClick={() => {
                          const isExpanded = race.id === editingRace?.id;
                          setEditingRace(isExpanded ? null : race);
                        }}
                      >
                        {race.id === editingRace?.id ? (
                          <X className="h-4 w-4" />
                        ) : (
                          <PencilIcon className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Prize Pool</span>
                        <span className="font-medium">${race.prizePool.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Min Wager</span>
                        <span className="font-medium">${race.minWager.toLocaleString()}</span>
                      </div>
                      <div className="pt-2">
                        <QuickActions race={race} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* Mobile FAB */}
        <motion.div 
          className="fixed bottom-4 right-4 sm:hidden"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
        >
          <Button
            size="lg"
            className="h-14 w-14 rounded-full bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90 shadow-lg"
            onClick={() => {
              form.reset();
              setEditingRace(null);
              setShowForm(true);
            }}
          >
            <PlusCircle className="h-6 w-6" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}