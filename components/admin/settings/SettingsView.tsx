"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { GeneralSettings } from "./GeneralSettings";
import { SecuritySettings } from "./SecuritySettings";
import { NotificationSettings } from "./NotificationSettings";
import { IntegrationSettings } from "./IntegrationSettings";
import { BackupSettings } from "./BackupSettings";

export function SettingsView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Configuración</h2>
        <p className="text-muted-foreground">
          Gestiona la configuración del sistema
        </p>
      </div>

      <Card>
        <Tabs defaultValue="general">
          <TabsList className="border-b px-6 py-2">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="security">Seguridad</TabsTrigger>
            <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
            <TabsTrigger value="integrations">Integraciones</TabsTrigger>
            <TabsTrigger value="backup">Respaldos</TabsTrigger>
          </TabsList>

          <div className="p-6">
            <TabsContent value="general">
              <GeneralSettings />
            </TabsContent>
            <TabsContent value="security">
              <SecuritySettings />
            </TabsContent>
            <TabsContent value="notifications">
              <NotificationSettings />
            </TabsContent>
            <TabsContent value="integrations">
              <IntegrationSettings />
            </TabsContent>
            <TabsContent value="backup">
              <BackupSettings />
            </TabsContent>
          </div>
        </Tabs>
      </Card>
    </div>
  );
}