import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { CountdownTimer } from "@/components/CountdownTimer";

const createWagerRaceSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum(["weekly", "monthly", "weekend"]),
  prizePool: z.string().transform(Number),
  minWager: z.string().transform(Number),
  startDate: z.string(),
  endDate: z.string(),
  prizeDistribution: z.record(z.string(), z.number()),
});

type CreateWagerRaceSchema = z.infer<typeof createWagerRaceSchema>;

export default function WagerRaceManagement() {
  const { toast } = useToast();
  const [selectedRace, setSelectedRace] = useState<number | null>(null);

  const form = useForm<CreateWagerRaceSchema>({
    resolver: zodResolver(createWagerRaceSchema),
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

  const { data: races, isLoading } = useQuery({
    queryKey: ["/api/admin/wager-races"],
  });

  const createRace = useMutation({
    mutationFn: async (data: CreateWagerRaceSchema) => {
      const response = await fetch("/api/admin/wager-races", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Wager race created successfully",
      });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create wager race",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateWagerRaceSchema) => {
    createRace.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D7FF00]" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1A1B21]/50 backdrop-blur-sm p-8 rounded-xl border border-[#2A2B31]"
        >
          <h1 className="text-3xl font-heading font-bold text-[#D7FF00] mb-6">
            Wager Race Management
          </h1>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

              <div className="grid md:grid-cols-2 gap-6">
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
              </div>

              <div className="grid md:grid-cols-2 gap-6">
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

              <div className="flex justify-end">
                <Button
                  type="submit"
                  className="bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90"
                  disabled={createRace.isPending}
                >
                  {createRace.isPending ? "Creating..." : "Create Race"}
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
            <h2 className="text-2xl font-heading font-bold text-white">Active Races</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {races.map((race: any) => (
                <Card key={race.id} className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>{race.title}</span>
                      <span className="text-sm font-normal bg-[#D7FF00]/10 text-[#D7FF00] px-2 py-1 rounded">
                        {race.type}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Time Remaining</span>
                        <CountdownTimer endDate={race.endDate} />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Prize Pool</span>
                        <span>${race.prizePool.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Min Wager</span>
                        <span>${race.minWager.toLocaleString()}</span>
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
