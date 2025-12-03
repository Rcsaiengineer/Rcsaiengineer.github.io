import { useSettings } from "@/contexts/SettingsContext";

interface PrivateValueProps {
  value: string | number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function PrivateValue({ value, prefix = "", suffix = "", className = "" }: PrivateValueProps) {
  const { settings } = useSettings();

  if (settings.privacy_mode) {
    return <span className={className}>{prefix}••••{suffix}</span>;
  }

  return <span className={className}>{prefix}{value}{suffix}</span>;
}
