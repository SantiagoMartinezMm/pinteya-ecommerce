"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Bell,
  Shield,
  AlertTriangle,
  Mail,
  MessageSquare,
  Smartphone,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NotificationChannel {
  id: string;
  type: "email" | "sms" | "slack" | "webhook";
  name: string;
  enabled: boolean;
  config: Record<string, any>;
}

interface NotificationRule {
  id: string;
  name: string;
  description: string;
  eventType: string;
  severity: "low" | "medium" | "high" | "critical";
  channels: string[];
  enabled: boolean;
  conditions: Record<string, any>;
}

export function SecurityNotifications() {
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotificationConfig();
  }, []);

  const fetchNotificationConfig = async () => {
    try {
      const [channelsRes, rulesRes] = await Promise.all([
        fetch("/api/admin/security/notifications/channels"),
        fetch("/api/admin/security/notifications/rules"),
      ]);

      const channelsData = await channelsRes.json();
      const rulesData = await rulesRes.json();

      setChannels(channelsData);
      setRules(rulesData);
    } catch (error) {
      console.error("Error fetching notification config:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleChannel = async (channelId: string, enabled: boolean) => {
    try {
      await fetch(`/api/admin/security/notifications/channels/${channelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });

      setChannels((prev) =>
        prev.map((channel) =>
          channel.id === channelId ? { ...channel, enabled } : channel
        )
      );
    } catch (error) {
      console.error("Error updating channel:", error);
    }
  };

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      await fetch(`/api/admin/security/notifications/rules/${ruleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });

      setRules((prev) =>
        prev.map((rule) =>
          rule.id === ruleId ? { ...rule, enabled } : rule
        )
      );
    } catch (error) {
      console.error("Error updating rule:", error);
    }
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "sms":
        return <Smartphone className="h-4 w-4" />;
      case "slack":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Notificaciones de Seguridad</h3>
        <p className="text-sm text-muted-foreground">
          Configura las notificaciones y alertas de seguridad
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Canales de Notificación */}
        <Card className="p-6">
          <h4 className="text-sm font-medium mb-4">Canales de Notificación</h4>
          <div className="space-y-4">
            {channels.map((channel) => (
              <div
                key={channel.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getChannelIcon(channel.type)}
                  <div>
                    <p className="font-medium">{channel.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {channel.type}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={channel.enabled}
                  onCheckedChange={(checked) =>
                    toggleChannel(channel.id, checked)
                  }
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Reglas de Notificación */}
        <Card className="p-6">
          <h4 className="text-sm font-medium mb-4">Reglas de Notificación</h4>
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-4 border rounded-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      <p className="font-medium">{rule.name}</p>
                    </div>
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(checked) =>
                        toggleRule(rule.id, checked)
                      }
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {rule.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        rule.severity === "critical" || rule.severity === "high"
                          ? "destructive"
                          : rule.severity === "medium"
                          ? "warning"
                          : "default"
                      }
                    >
                      {rule.severity}
                    </Badge>
                    <Badge variant="outline">{rule.eventType}</Badge>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {rule.channels.map((channelId) => {
                      const channel = channels.find((c) => c.id === channelId);
                      return (
                        channel && (
                          <Badge key={channelId} variant="secondary">
                            {getChannelIcon(channel.type)}
                            <span className="ml-1">{channel.name}</span>
                          </Badge>
                        )
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}