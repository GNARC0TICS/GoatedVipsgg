
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "./ui/use-toast";

export default function UsernameSearch() {
  const [search, setSearch] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["users", search],
    queryFn: async () => {
      const response = await fetch(`/api/users/search?username=${search}`);
      return response.json();
    },
    enabled: search.length > 2
  });

  const verifyMutation = useMutation({
    mutationFn: async (username: string) => {
      const response = await fetch("/api/verification/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
      });
      if (!response.ok) throw new Error("Failed to submit verification request");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Verification Requested",
        description: "An admin will review your request shortly."
      });
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input 
          placeholder="Search Goated usernames..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      
      {isLoading && <div>Searching...</div>}
      
      <div className="space-y-2">
        {users?.map((user: any) => (
          <div key={user.username} className="flex items-center justify-between p-4 bg-[#1A1B21] rounded-lg">
            <span>{user.username}</span>
            <Button 
              onClick={() => verifyMutation.mutate(user.username)}
              disabled={verifyMutation.isPending}
            >
              Request Verification
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
