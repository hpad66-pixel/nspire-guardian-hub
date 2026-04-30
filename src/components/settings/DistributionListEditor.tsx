/**
 * A3 · DistributionListEditor — manage members on a single distribution list.
 *
 * Members come in three flavors:
 *   - Platform user (user_id → profiles)
 *   - Contact record (contact_id → contacts)
 *   - Email override (freeform external address)
 *
 * The editor is a pure form; wrap it in a Dialog/Sheet from the caller
 * (DistributionListsPage passes it into a dialog).
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useDistributionListMembers, type DistributionList, type DistributionListMember,
} from "@/hooks/useDistributionLists";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { UserPlus, Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";

type AddMode = "user" | "email";

interface ProfileOption { id: string; display_name: string; email: string | null; }

export interface DistributionListEditorProps {
  list: DistributionList;
}

export function DistributionListEditor({ list }: DistributionListEditorProps) {
  const { data: members = [], addMember, removeMember } = useDistributionListMembers(list.id);

  const [mode, setMode] = useState<AddMode>("user");
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [emailOverride, setEmailOverride] = useState("");
  const [roleLabel, setRoleLabel] = useState("");

  const { data: profiles = [] } = useQuery<ProfileOption[]>({
    queryKey: ["distribution-editor-profiles", search],
    enabled: mode === "user" && search.trim().length > 0,
    queryFn: async () => {
      const q = search.trim();
      const { data, error } = await supabase
        .from("profiles" as any)
        .select("id, display_name, email")
        .or(`display_name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(25);
      if (error) throw error;
      return ((data ?? []) as any[]).map((p) => ({
        id: p.id, display_name: p.display_name ?? "(unnamed)", email: p.email ?? null,
      }));
    },
  });

  async function handleAdd() {
    try {
      const payload: Partial<DistributionListMember> = {
        role_label: roleLabel.trim() || null,
      };
      if (mode === "user") {
        if (!selectedUserId) { toast.error("Pick a user"); return; }
        payload.user_id = selectedUserId;
      } else {
        if (!emailOverride.trim()) { toast.error("Email required"); return; }
        payload.email_override = emailOverride.trim();
      }
      await addMember.mutateAsync(payload);
      toast.success("Member added");
      setSelectedUserId(null);
      setEmailOverride("");
      setRoleLabel("");
      setSearch("");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleRemove(id: string) {
    try {
      await removeMember.mutateAsync(id);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="font-medium">{list.name}</div>
        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
          <Badge variant="outline">{list.scope}</Badge>
          {list.description && <span>{list.description}</span>}
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <Label className="mb-1 block">Add a member</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as AddMode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Platform user</SelectItem>
                <SelectItem value="email">Email address only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === "user" ? (
            <div className="space-y-2">
              <Input
                placeholder="Search users by name or email…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSelectedUserId(null); }}
              />
              {profiles.length > 0 && (
                <div className="border rounded-md max-h-40 overflow-y-auto text-sm">
                  {profiles.map((p) => (
                    <button
                      key={p.id} type="button"
                      onClick={() => setSelectedUserId(p.id)}
                      className={`block w-full text-left p-2 hover:bg-muted ${
                        selectedUserId === p.id ? "bg-muted" : ""
                      }`}
                    >
                      <div>{p.display_name}</div>
                      <div className="text-xs text-muted-foreground">{p.email ?? "—"}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Input
              type="email" value={emailOverride}
              onChange={(e) => setEmailOverride(e.target.value)}
              placeholder="external@example.com"
            />
          )}

          <div>
            <Label>Role label (optional)</Label>
            <Input
              value={roleLabel}
              onChange={(e) => setRoleLabel(e.target.value)}
              placeholder="e.g. Owner's rep"
            />
          </div>

          <Button
            onClick={handleAdd}
            disabled={addMember.isPending ||
              (mode === "user" ? !selectedUserId : !emailOverride.trim())}
            className="w-full"
          >
            {mode === "user" ? <UserPlus className="h-4 w-4 mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
            {addMember.isPending ? "Adding…" : "Add member"}
          </Button>
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Members · {members.length}</Label>
        </div>
        {members.length === 0 ? (
          <div className="text-sm text-muted-foreground border rounded-md p-4 text-center">
            No members yet.
          </div>
        ) : (
          <div className="rounded-md border divide-y">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate">
                    {m.email_override ?? m.user_id ?? m.contact_id ?? "Member"}
                  </div>
                  {m.role_label && (
                    <div className="text-xs text-muted-foreground">{m.role_label}</div>
                  )}
                </div>
                <Button
                  size="icon" variant="ghost" className="h-7 w-7"
                  onClick={() => handleRemove(m.id)}
                  disabled={removeMember.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
