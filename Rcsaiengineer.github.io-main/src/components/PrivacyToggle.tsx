import { Eye, EyeOff } from "lucide-react";
import { Button } from "./ui/button";
import { useSettings } from "@/contexts/SettingsContext";

export function PrivacyToggle() {
  const { settings, togglePrivacyMode } = useSettings();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={togglePrivacyMode}
      title={settings.privacy_mode ? "Mostrar valores" : "Ocultar valores"}
    >
      {settings.privacy_mode ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
    </Button>
  );
}
