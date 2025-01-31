import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";

interface User {
  id: number;
  username: string;
  email: string;
  telegramUsername?: string;
  isVerified: boolean;
}

interface UserResponse {
  status: string;
  data: User[];
}

export default function UserManagement() {
  const [search, setSearch] = useState("");

  const { data: response, isLoading } = useQuery<UserResponse>({
    queryKey: ["/api/admin/users"],
  });

  const verifyUser = async (userId: number) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/verify`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // Refetch user data after successful verification
      // This will update the UI automatically thanks to react-query
    } catch (error) {
      console.error("Error verifying user:", error);
      // Handle error appropriately (e.g., display an error message)
    }
  };

  if (isLoading) return <LoadingSpinner />;

  const filteredUsers = response?.data.filter(
    (user) =>
      user.username.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>

      <Card className="mb-6">
        <CardContent className="p-4">
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </CardContent>
      </Card>

      <div className="rounded-md border">
        <Table className="mb-6">
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telegram</TableHead>
              <TableHead>Verification</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers?.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.telegramUsername || '-'}</TableCell>
                <TableCell>
                  <Badge variant={user.isVerified ? "default" : "secondary"}>
                    {user.isVerified ? "Verified" : "Pending"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => verifyUser(user.id)}
                    disabled={user.isVerified}
                  >
                    Verify User
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}