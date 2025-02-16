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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { SiTelegram } from "react-icons/si";

// Define TypeScript interfaces
interface User {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  emailVerified: boolean;
  // New Telegram fields
  telegramId?: string;
  telegramVerifiedAt?: string;
  // New Analytics fields
  lastLoginIp?: string;
  registrationIp?: string;
  lastActive?: string;
  country?: string;
  city?: string;
  ipHistory: Array<{
    ip: string;
    timestamp: string;
    userAgent?: string;
  }>;
  loginHistory: Array<{
    timestamp: string;
    ip: string;
    success: boolean;
    userAgent?: string;
  }>;
}

interface VerificationRequest {
  id: number;
  userId: number;
  requestedUsername: string;
  createdAt: string;
}

export default function UserManagement() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", {
        headers: {
          'X-Admin-View': 'true'
        }
      });
      return res.json();
    }
  });

  const { data: verificationRequests = [], isLoading: verificationsLoading } = useQuery<VerificationRequest[]>({
    queryKey: ["/api/admin/verification-requests"],
    queryFn: async () => {
      const res = await fetch("/api/admin/verification-requests");
      return res.json();
    }
  });

  const handleVerify = async (id: number) => {
    // Implement verification logic
  };

  const handleReject = async (id: number) => {
    // Implement rejection logic
  };

  if (usersLoading || verificationsLoading) {
    return <LoadingSpinner />;
  }

  const filteredUsers = users.filter(
    (user) =>
      user.username?.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase()) ||
      user.lastLoginIp?.includes(search),
  );

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>

      {verificationRequests.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <h2 className="text-xl font-bold mb-4">Pending Verifications</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Requested Username</TableHead>
                  <TableHead>Requested At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {verificationRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>{req.userId}</TableCell>
                    <TableCell>{req.requestedUsername}</TableCell>
                    <TableCell>{format(new Date(req.createdAt), 'PPpp')}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleVerify(req.id)}>
                          Verify
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleReject(req.id)}>
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardContent className="p-4">
          <Input
            placeholder="Search users by username, email, or IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Last IP</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Telegram</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.isAdmin ? "default" : "secondary"}>
                        {user.isAdmin ? "Admin" : "User"}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.lastLoginIp || "N/A"}</TableCell>
                    <TableCell>
                      {user.country && user.city 
                        ? `${user.city}, ${user.country}` 
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {user.lastActive
                        ? format(new Date(user.lastActive), 'PPpp')
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      {user.telegramId ? (
                        <Badge variant="default" className="flex items-center gap-1">
                          <SiTelegram className="h-4 w-4" />
                          {user.telegramVerifiedAt ? "Verified" : "Linked"}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Not Linked</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="space-y-6">
            {filteredUsers.map((user) => (
              <Card key={user.id}>
                <CardHeader>
                  <CardTitle>{user.username}'s Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">IP History</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>IP Address</TableHead>
                            <TableHead>Timestamp</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>User Agent</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {user.ipHistory.map((entry, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{entry.ip}</TableCell>
                              <TableCell>
                                {format(new Date(entry.timestamp), 'PPpp')}
                              </TableCell>
                              <TableCell>
                                {user.country && user.city 
                                  ? `${user.city}, ${user.country}`
                                  : "N/A"}
                              </TableCell>
                              <TableCell className="truncate max-w-md" title={entry.userAgent}>
                                {entry.userAgent || "N/A"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Login History</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Timestamp</TableHead>
                            <TableHead>IP Address</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>User Agent</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {user.loginHistory.map((entry, idx) => (
                            <TableRow key={idx}>
                              <TableCell>
                                {format(new Date(entry.timestamp), 'PPpp')}
                              </TableCell>
                              <TableCell>{entry.ip}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={entry.success ? "default" : "destructive"}
                                >
                                  {entry.success ? "Success" : "Failed"}
                                </Badge>
                              </TableCell>
                              <TableCell className="truncate max-w-md" title={entry.userAgent}>
                                {entry.userAgent || "N/A"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="security">
          <div className="space-y-6">
            {filteredUsers.map((user) => (
              <Card key={user.id}>
                <CardHeader>
                  <CardTitle>{user.username}'s Security Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold mb-2">Account Status</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Email Verified:</span>
                          <Badge variant={user.emailVerified ? "default" : "destructive"}>
                            {user.emailVerified ? "Verified" : "Unverified"}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Telegram Status:</span>
                          <Badge variant={user.telegramVerifiedAt ? "default" : user.telegramId ? "secondary" : "outline"}>
                            {user.telegramVerifiedAt 
                              ? "Verified" 
                              : user.telegramId 
                                ? "Linked" 
                                : "Not Linked"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Registration Info</h3>
                      <div className="space-y-2">
                        <div>Registration IP: {user.registrationIp || "N/A"}</div>
                        <div>Created: {format(new Date(user.createdAt), 'PPpp')}</div>
                        <div>Last Login IP: {user.lastLoginIp || "N/A"}</div>
                        <div>
                          Last Active: {user.lastActive 
                            ? format(new Date(user.lastActive), 'PPpp')
                            : "Never"}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}