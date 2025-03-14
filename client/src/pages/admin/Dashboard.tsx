import React from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition } from "@/components/PageTransition";
import { useUser } from "@/hooks/use-user";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Users,
  Trophy,
  Bell,
  Gift,
  MessageSquare,
  BarChart,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function AdminDashboard() {
  const { user, loading } = useUser();
  const isMobile = useIsMobile();

  if (loading) {
    return <PageTransition isLoading={true} />;
  }

  if (!user?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-heading text-white mb-4">
          Admin Access Required
        </h1>
        <p className="text-[#8A8B91] mb-6">
          You need admin privileges to view this page.
        </p>
        <Link href="/">
          <Button>Return to Home</Button>
        </Link>
      </div>
    );
  }

  const adminModules = [
    {
      title: "User Management",
      icon: <Users className="h-6 w-6 text-[#D7FF00]" />,
      description: "Manage users, permissions and roles",
      link: "/admin/users",
    },
    {
      title: "Wager Races",
      icon: <Trophy className="h-6 w-6 text-[#D7FF00]" />,
      description: "Configure and manage wager races",
      link: "/admin/wager-races",
    },
    {
      title: "Notifications",
      icon: <Bell className="h-6 w-6 text-[#D7FF00]" />,
      description: "Send and manage platform notifications",
      link: "/admin/notifications",
    },
    {
      title: "Bonus Codes",
      icon: <Gift className="h-6 w-6 text-[#D7FF00]" />,
      description: "Create and manage bonus codes",
      link: "/admin/bonus-codes",
    },
    {
      title: "Support",
      icon: <MessageSquare className="h-6 w-6 text-[#D7FF00]" />,
      description: "Manage support tickets and requests",
      link: "/admin/support",
    },
    {
      title: "Analytics",
      icon: <BarChart className="h-6 w-6 text-[#D7FF00]" />,
      description: "View platform metrics and statistics",
      link: "/admin/analytics",
    },
  ];

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/">
              <Button
                variant="ghost"
                className="p-2 hover:bg-transparent hover:text-[#D7FF00]"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                <span>Back to Site</span>
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-heading text-white">Admin Panel</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {adminModules.map((module, index) => (
            <Link key={index} href={module.link}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="h-full"
              >
                <Card className="cursor-pointer border-[#2A2B31] bg-[#1A1B21] hover:bg-[#1A1B21]/80 transition-all h-full">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="mb-3">{module.icon}</div>
                        <h3 className="text-lg font-heading text-white mb-1">
                          {module.title}
                        </h3>
                        <p className="text-sm text-[#8A8B91]">
                          {module.description}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-[#8A8B91]" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
