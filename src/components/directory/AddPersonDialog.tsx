/**
 * B1 · AddPersonDialog — add a person (existing user / existing contact / new
 * contact) to a project's directory, with optional org, role label, and
 * permission-template assignment.
 */
import { useState } from "react";
import { useProjectDirectory } from "@/hooks/useProjectDirectory";
import { useCreateContact } from "@/hooks/useDirectory";
import { usePermissionTemplates } from "@/hooks/usePermissionTemplates";
import { PersonPicker, type PersonRef } from "@/components/shared/PersonPicker";
import { OrgPicker } from "@/components/shared/OrgPicker";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import { toast } from "sonner";

export function AddPersonDialog({
  open, onOpenChange, projectId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
}) {
  const { add } = useProjectDirectory(projectId);
  const createContact = useCreateContact();
  const { data: templates = [] } = usePermissionTemplates();

  const [tab, setTab] = useState<"existing" | "new-contact">("existing");

  // Existing tab state
  const [person, setPerson] = useState<PersonRef | null>(null);

  // New contact tab state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");

  // Common state
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [roleLabel, setRoleLabel] = useState("");
  const [isKeyContact, setIsKeyContact] = useState(false);
  const [templateId, setTemplateId] = useState<string>("");

  const busy = add.isPending || createContact.isPending;

  function reset() {
    setPerson(null);
    setFirstName(""); setLastName(""); setEmail(""); setPhone(""); setCompanyName("");
    setOrganizationId(null); setRoleLabel(""); setIsKeyContact(false); setTemplateId("");
    setTab("existing");
  }

  async function handleSubmit() {
    try {
      let payload: { user_id?: string; contact_id?: string } = {};
      if (tab === "existing") {
        if (!person) { toast.error("Pick a person"); return; }
        payload = person.kind === "user"
          ? { user_id: person.id }
          : { contact_id: person.id };
      } else {
        if (!firstName.trim()) { toast.error("First name required"); return; }
        const contact = await createContact.mutateAsync({
          first_name: firstName.trim(),
          last_name: lastName.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          company_name: companyName.trim() || undefined,
        });
        payload = { contact_id: (contact as any).id };
      }

      await add.mutateAsync({
        ...payload,
        organization_id: organizationId ?? null,
        role_label: roleLabel.trim() || null,
        is_key_contact: isKeyContact,
        permission_template_id: templateId || null,
      } as any);

      toast.success("Added to directory");
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add to project directory</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="w-full">
            <TabsTrigger value="existing" className="flex-1">Existing user / contact</TabsTrigger>
            <TabsTrigger value="new-contact" className="flex-1">New contact</TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-3 mt-3">
            <div>
              <Label>Person</Label>
              <PersonPicker value={person} onChange={setPerson} />
            </div>
          </TabsContent>

          <TabsContent value="new-contact" className="space-y-3 mt-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First name</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <Label>Last name</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>Company (text)</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                       placeholder="Free-form — not the organizations FK below" />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-3 border-t pt-4">
          <div>
            <Label>Organization</Label>
            <OrgPicker value={organizationId} onValueChange={setOrganizationId} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Role label</Label>
              <Input value={roleLabel} onChange={(e) => setRoleLabel(e.target.value)}
                     placeholder="e.g. PM, Architect, Safety Lead" />
            </div>
            <div>
              <Label>Permission template (optional)</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={isKeyContact}
              onCheckedChange={(v) => setIsKeyContact(v === true)}
            />
            Mark as key contact for this project
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy ? "Adding…" : "Add person"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
