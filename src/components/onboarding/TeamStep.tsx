import { useState } from 'react';
import { Users, Plus, X, ArrowRight, ArrowLeft, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { OnboardingData } from './OnboardingWizard';
import { z } from 'zod';

const emailSchema = z.string().email();

interface TeamMember {
  email: string;
  role: 'admin' | 'manager' | 'inspector' | 'user';
}

interface TeamStepProps {
  onNext: (data: Partial<OnboardingData>) => void;
  onBack: () => void;
  propertyName?: string;
}

export function TeamStep({ onNext, onBack, propertyName }: TeamStepProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamMember['role']>('inspector');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [error, setError] = useState('');

  const addMember = () => {
    setError('');
    
    try {
      emailSchema.parse(email);
    } catch {
      setError('Please enter a valid email address');
      return;
    }

    if (members.some((m) => m.email.toLowerCase() === email.toLowerCase())) {
      setError('This email has already been added');
      return;
    }

    setMembers((prev) => [...prev, { email, role }]);
    setEmail('');
    setRole('inspector');
  };

  const removeMember = (emailToRemove: string) => {
    setMembers((prev) => prev.filter((m) => m.email !== emailToRemove));
  };

  const handleContinue = () => {
    onNext({ invitations: members });
  };

  const handleSkip = () => {
    onNext({ invitations: [] });
  };

  const roleLabels: Record<TeamMember['role'], string> = {
    admin: 'Administrator',
    manager: 'Manager',
    inspector: 'Inspector',
    user: 'Team Member',
  };

  const roleColors: Record<TeamMember['role'], string> = {
    admin: 'bg-destructive/10 text-destructive',
    manager: 'bg-warning/10 text-warning',
    inspector: 'bg-success/10 text-success',
    user: 'bg-muted text-muted-foreground',
  };

  return (
    <Card className="border-0 shadow-2xl">
      <CardHeader className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
            <Users className="h-8 w-8 text-primary-foreground" />
          </div>
        </div>
        <div className="space-y-1">
          <CardTitle className="text-2xl font-bold">Invite Your Team</CardTitle>
          <CardDescription>
            Add team members to help manage {propertyName || 'your property'}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Add member form */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="colleague@company.com"
                className="pl-10"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addMember();
                  }
                }}
              />
            </div>
            <Select value={role} onValueChange={(v) => setRole(v as TeamMember['role'])}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="inspector">Inspector</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="secondary" onClick={addMember}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        {/* Members list */}
        <div className="space-y-2 min-h-[120px]">
          {members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No team members added yet</p>
              <p className="text-xs mt-1">You can always invite more people later</p>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.email}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-xs font-medium uppercase">
                        {member.email.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{member.email}</p>
                      <Badge variant="secondary" className={roleColors[member.role]}>
                        {roleLabels[member.role]}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMember(member.email)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4">
          <Button type="button" variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleSkip}>
              Skip for Now
            </Button>
            <Button onClick={handleContinue}>
              {members.length > 0 ? 'Continue' : 'Skip'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
