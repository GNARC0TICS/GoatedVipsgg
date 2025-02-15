import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, BarChart, Clock, Database, Download } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface TransformationLog {
  timestamp: string;
  type: 'info' | 'error' | 'warning';
  message: string;
  data?: any;
}

interface TransformationMetrics {
  totalTransformations: number;
  averageTimeMs: number;
  errorRate: number;
  lastUpdated: string;
}

export default function TransformationDebug() {
  const [logs, setLogs] = useState<TransformationLog[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data: metrics } = useQuery<TransformationMetrics>({
    queryKey: ["/api/admin/transformation-metrics"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  useEffect(() => {
    // Setup WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/transformation-logs`;
    const websocket = new WebSocket(wsUrl);

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'TRANSFORMATION_LOG') {
        setLogs(prev => [...prev, data.log].slice(-100)); // Keep last 100 logs
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, []);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const response = await fetch('/api/admin/export-logs');

      if (!response.ok) {
        throw new Error('Failed to export logs');
      }

      // Create blob from response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transformation_logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting logs:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-[#D7FF00]">
            Transformation Debug Dashboard
          </h1>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export Logs'}
          </Button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-5 w-5 text-[#D7FF00]" />
                <span className="text-sm text-muted-foreground">
                  Total Transformations
                </span>
              </div>
              <p className="text-2xl font-bold">
                {metrics?.totalTransformations?.toLocaleString() ?? '—'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-[#D7FF00]" />
                <span className="text-sm text-muted-foreground">
                  Average Time
                </span>
              </div>
              <p className="text-2xl font-bold">
                {metrics?.averageTimeMs ? `${metrics.averageTimeMs.toFixed(2)}ms` : '—'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-[#D7FF00]" />
                <span className="text-sm text-muted-foreground">
                  Error Rate
                </span>
              </div>
              <p className="text-2xl font-bold">
                {metrics?.errorRate ? `${(metrics.errorRate * 100).toFixed(2)}%` : '—'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <BarChart className="h-5 w-5 text-[#D7FF00]" />
                <span className="text-sm text-muted-foreground">
                  Last Updated
                </span>
              </div>
              <p className="text-sm font-mono">
                {metrics?.lastUpdated ? new Date(metrics.lastUpdated).toLocaleTimeString() : '—'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Real-time Logs */}
        <Card className="bg-[#1A1B21]/50 backdrop-blur-sm border-[#2A2B31]">
          <CardHeader>
            <CardTitle className="text-[#D7FF00]">Transformation Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] w-full rounded-md border border-[#2A2B31] p-4">
              <div className="space-y-2">
                {logs.map((log, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-2 rounded-md ${
                      log.type === 'error' ? 'bg-red-500/10 border border-red-500/20' :
                        log.type === 'warning' ? 'bg-yellow-500/10 border border-yellow-500/20' :
                          'bg-[#2A2B31]/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className={`text-sm font-mono ${
                        log.type === 'error' ? 'text-red-400' :
                          log.type === 'warning' ? 'text-yellow-400' :
                            'text-[#D7FF00]'
                      }`}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="text-sm">{log.message}</span>
                    </div>
                    {log.data && (
                      <pre className="mt-2 text-xs bg-black/20 p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}