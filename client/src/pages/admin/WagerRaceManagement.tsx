import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
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
  Trophy,
  DollarSign,
  Users,
  X,
  AlertCircle
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const form = useForm<WagerRace>({
    resolver: zodResolver(wagerRaceSchema),
    defaultValues: {
      title: "",
      type: "weekly",
      prizePool: 200,
      minWager: 100,
      startDate: new Date().toISOString().split('T')[0],
      endDate: "",
      prizeDistribution: {
        "1": 50,
        "2": 15,
        "3": 10,
        "4": 5,
        "5": 5,
        "6": 3.75,
        "7": 3.75,
        "8": 2.5,
        "9": 2.5,
        "10": 2.5,
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateTimeLeft = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) {
      return `Starts in ${Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days`;
    } else if (now > end) {
      return 'Completed';
    } else {
      return `${Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days left`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'text-blue-400';
      case 'live':
        return 'text-green-400';
      case 'completed':
        return 'text-gray-400';
      default:
        return 'text-white';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header with Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-5 w-5 text-[#D7FF00]" />
                <span className="text-sm text-muted-foreground">Active Races</span>
              </div>
              <p className="text-2xl font-bold">
                {races.filter(r => r.status === 'live').length}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 text-[#D7FF00]" />
                <span className="text-sm text-muted-foreground">Total Prize Pool</span>
              </div>
              <p className="text-2xl font-bold">
                ${races.reduce((acc, race) => acc + Number(race.prizePool), 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-[#D7FF00]" />
                <span className="text-sm text-muted-foreground">Total Participants</span>
              </div>
              <p className="text-2xl font-bold">
                428
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Header with Create Button */}
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
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Basic Information */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Race Title</FormLabel>
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
                            <FormLabel>Race Type</FormLabel>
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

                    {/* Prize Configuration */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="prizePool"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Prize Pool ($)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="200"
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
                            <FormLabel>Minimum Wager ($)</FormLabel>
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

                    {/* Date Configuration */}
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

                    {/* Prize Distribution Sliders */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold mb-4">Prize Distribution</h3>
                      {[1, 2, 3].map((position) => (
                        <FormField
                          key={position}
                          control={form.control}
                          name={`prizeDistribution.${position}`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Position #{position} (%)</FormLabel>
                              <FormControl>
                                <div className="flex items-center gap-4">
                                  <Slider
                                    min={0}
                                    max={100}
                                    step={1}
                                    value={[field.value]}
                                    onValueChange={(value) => field.onChange(value[0])}
                                    className="flex-1"
                                  />
                                  <span className="w-12 text-right">{field.value}%</span>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
                      <div className="text-sm text-muted-foreground">
                        Remaining percentage will be distributed among positions 4-10.
                      </div>
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
                <Card key={race.id} className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31] hover:border-[#D7FF00]/50 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1">
                        <CardTitle className="text-lg md:text-xl line-clamp-1">{race.title}</CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{calculateTimeLeft(race.startDate, race.endDate)}</span>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="shrink-0"
                        onClick={() => setEditingRace(race)}
                      >
                        <PencilIcon className="h-4 w-4" />
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
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <span className={`font-medium ${getStatusColor(race.status)}`}>
                          {race.status.charAt(0).toUpperCase() + race.status.slice(1)}
                        </span>
                      </div>
                      <div className="pt-2 flex justify-end gap-2">
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
                          onClick={() => setDeleteConfirm(race.id)}
                        >
                          <TrashIcon className="h-4 w-4" />
                          <span className="hidden sm:inline">Delete</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteConfirm !== null} onOpenChange={setDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the race and remove all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground"
                onClick={() => {
                  if (deleteConfirm) {
                    deleteRace.mutate(deleteConfirm);
                    setDeleteConfirm(null);
                  }
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>


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