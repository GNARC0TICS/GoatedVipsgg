
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
import { motion } from "framer-motion";
import { TrashIcon, PencilIcon } from "lucide-react";

const wagerRaceSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum(["weekly", "monthly", "weekend"]),
  prizePool: z.string().transform(Number),
  minWager: z.string().transform(Number),
  startDate: z.string(),
  endDate: z.string(),
  prizeDistribution: z.record(z.string(), z.number()),
});

type WagerRace = z.infer<typeof wagerRaceSchema>;

export default function WagerRaceManagement() {
  const { toast } = useToast();
  const [editingRace, setEditingRace] = useState<WagerRace | null>(null);
  const queryClient = useQueryClient();

  const form = useForm<WagerRace>({
    resolver: zodResolver(wagerRaceSchema),
    defaultValues: {
      title: "",
      type: "weekly",
      prizePool: "",
      minWager: "",
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

  const { data: races = [], isLoading } = useQuery({
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
    },
  });

  const deleteRace = useMutation({
    mutationFn: async (id: string) => {
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1A1B21]/50 backdrop-blur-sm p-4 md:p-8 rounded-xl border border-[#2A2B31]"
        >
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-[#D7FF00] mb-6">
            {editingRace ? "Edit Race" : "Create New Race"}
          </h1>

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
                {editingRace && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingRace(null);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                )}
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
        </motion.div>

        {races?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <h2 className="text-xl md:text-2xl font-heading font-bold text-white">Active Races</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {races.map((race: any) => (
                <Card key={race.id} className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg md:text-xl">{race.title}</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingRace(race)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteRace.mutate(race.id)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type</span>
                        <span className="font-medium">{race.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Prize Pool</span>
                        <span className="font-medium">${race.prizePool.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Min Wager</span>
                        <span className="font-medium">${race.minWager.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
