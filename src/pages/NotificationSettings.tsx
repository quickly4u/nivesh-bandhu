import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationPrefs, Profile } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

const DEFAULT_PREFS: NotificationPrefs = {
  email: true,
  sms: false,
  in_app: true,
  lead_days: [7, 3, 1],
};

export const NotificationSettingsPage: React.FC = () => {
  const { profile, updateProfile } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.notification_preferences) {
      setPrefs(profile.notification_preferences);
    }
  }, [profile?.notification_preferences]);

  const toggleLeadDay = (day: number) => {
    setPrefs((p) => {
      const has = p.lead_days.includes(day);
      return { ...p, lead_days: has ? p.lead_days.filter((d) => d !== day) : [...p.lead_days, day].sort((a, b) => b - a) };
    });
  };

  const onSave = async () => {
    try {
      setSaving(true);
      await updateProfile({ notification_preferences: prefs } as Partial<Profile>);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notification Settings</h1>
        <p className="text-muted-foreground">Configure how and when you receive alerts</p>
      </div>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Channels</CardTitle>
          <CardDescription>Choose your preferred channels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Email</div>
              <div className="text-sm text-muted-foreground">Receive reminders via email</div>
            </div>
            <Switch checked={prefs.email} onCheckedChange={(v) => setPrefs((p) => ({ ...p, email: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">SMS</div>
              <div className="text-sm text-muted-foreground">Receive reminders via SMS</div>
            </div>
            <Switch checked={prefs.sms} onCheckedChange={(v) => setPrefs((p) => ({ ...p, sms: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">In-App</div>
              <div className="text-sm text-muted-foreground">Show notifications in the app</div>
            </div>
            <Switch checked={prefs.in_app} onCheckedChange={(v) => setPrefs((p) => ({ ...p, in_app: v }))} />
          </div>
        </CardContent>
      </Card>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Lead Days</CardTitle>
          <CardDescription>Select how many days before a deadline to alert you</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          {[1, 3, 7, 15].map((d) => (
            <label key={d} className="flex items-center gap-2">
              <Checkbox checked={prefs.lead_days.includes(d)} onCheckedChange={() => toggleLeadDay(d)} />
              <span>{d} day{d > 1 ? 's' : ''} before</span>
            </label>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</Button>
      </div>
    </div>
  );
};

export default NotificationSettingsPage;
