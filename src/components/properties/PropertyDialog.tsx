import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCreateProperty, useUpdateProperty, type Property } from '@/hooks/useProperties';
import { Sun, ClipboardCheck, FolderKanban } from 'lucide-react';

interface PropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property?: Property | null;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export function PropertyDialog({ open, onOpenChange, property }: PropertyDialogProps) {
  const isEditing = !!property;
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    total_units: 0,
    year_built: undefined as number | undefined,
    nspire_enabled: false,
    daily_grounds_enabled: false,
    projects_enabled: false,
    status: 'active',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    mailing_address: '',
    mailing_city: '',
    mailing_state: '',
    mailing_zip: '',
  });

  useEffect(() => {
    if (property) {
      setFormData({
        name: property.name || '',
        address: property.address || '',
        city: property.city || '',
        state: property.state || '',
        zip_code: property.zip_code || '',
        total_units: property.total_units || 0,
        year_built: property.year_built || undefined,
        nspire_enabled: property.nspire_enabled || false,
        daily_grounds_enabled: property.daily_grounds_enabled || false,
        projects_enabled: property.projects_enabled || false,
        status: property.status || 'active',
        contact_name: property.contact_name || '',
        contact_email: property.contact_email || '',
        contact_phone: property.contact_phone || '',
        mailing_address: property.mailing_address || '',
        mailing_city: property.mailing_city || '',
        mailing_state: property.mailing_state || '',
        mailing_zip: property.mailing_zip || '',
      });
    } else {
      resetForm();
    }
  }, [property, open]);

  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditing && property) {
        await updateProperty.mutateAsync({
          id: property.id,
          ...formData,
          year_built: formData.year_built || null,
        });
      } else {
        await createProperty.mutateAsync({
          ...formData,
          year_built: formData.year_built || null,
        });
      }
      onOpenChange(false);
      resetForm();
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      total_units: 0,
      year_built: undefined,
      nspire_enabled: false,
      daily_grounds_enabled: false,
      projects_enabled: false,
      status: 'active',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      mailing_address: '',
      mailing_city: '',
      mailing_state: '',
      mailing_zip: '',
    });
  };

  const isPending = createProperty.isPending || updateProperty.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Property' : 'Add New Property'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the property details below.'
              : 'Enter the details for the new property.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Property Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Oak Ridge Apartments"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address">Street Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. 123 Main Street"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="state">State *</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) => setFormData({ ...formData, state: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="zip_code">ZIP Code</Label>
                  <Input
                    id="zip_code"
                    value={formData.zip_code}
                    onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                    placeholder="ZIP"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="total_units">Total Units</Label>
                  <Input
                    id="total_units"
                    type="number"
                    min="0"
                    value={formData.total_units}
                    onChange={(e) => setFormData({ ...formData, total_units: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="year_built">Year Built</Label>
                  <Input
                    id="year_built"
                    type="number"
                    min="1800"
                    max={new Date().getFullYear()}
                    value={formData.year_built || ''}
                    onChange={(e) => setFormData({ ...formData, year_built: parseInt(e.target.value) || undefined })}
                    placeholder="e.g. 1995"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contact" className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="contact_name">Contact Name</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  placeholder="e.g. John Smith"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="contact_email">Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contact_phone">Phone</Label>
                  <Input
                    id="contact_phone"
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-4">Mailing Address</h4>
                
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="mailing_address">Street Address</Label>
                    <Input
                      id="mailing_address"
                      value={formData.mailing_address}
                      onChange={(e) => setFormData({ ...formData, mailing_address: e.target.value })}
                      placeholder="Mailing address (if different)"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="mailing_city">City</Label>
                      <Input
                        id="mailing_city"
                        value={formData.mailing_city}
                        onChange={(e) => setFormData({ ...formData, mailing_city: e.target.value })}
                        placeholder="City"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="mailing_state">State</Label>
                      <Select
                        value={formData.mailing_state}
                        onValueChange={(value) => setFormData({ ...formData, mailing_state: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="State" />
                        </SelectTrigger>
                        <SelectContent>
                          {US_STATES.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="mailing_zip">ZIP Code</Label>
                      <Input
                        id="mailing_zip"
                        value={formData.mailing_zip}
                        onChange={(e) => setFormData({ ...formData, mailing_zip: e.target.value })}
                        placeholder="ZIP"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="text-sm font-medium">Enabled Modules</h4>
                <p className="text-xs text-muted-foreground">
                  Select which paid add-on modules are active for this property
                </p>
                
                {/* Daily Grounds */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-emerald-500 flex items-center justify-center">
                      <Sun className="h-4 w-4 text-white" />
                    </div>
                    <div className="space-y-0.5">
                      <Label htmlFor="daily_grounds">Daily Grounds Inspections</Label>
                      <p className="text-xs text-muted-foreground">
                        Outside grounds and asset inspections
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="daily_grounds"
                    checked={formData.daily_grounds_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, daily_grounds_enabled: checked })}
                  />
                </div>

                {/* NSPIRE */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-blue-500 flex items-center justify-center">
                      <ClipboardCheck className="h-4 w-4 text-white" />
                    </div>
                    <div className="space-y-0.5">
                      <Label htmlFor="nspire">NSPIRE Compliance</Label>
                      <p className="text-xs text-muted-foreground">
                        HUD-compliant inside unit inspections
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="nspire"
                    checked={formData.nspire_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, nspire_enabled: checked })}
                  />
                </div>

                {/* Projects */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-orange-500 flex items-center justify-center">
                      <FolderKanban className="h-4 w-4 text-white" />
                    </div>
                    <div className="space-y-0.5">
                      <Label htmlFor="projects">Projects</Label>
                      <p className="text-xs text-muted-foreground">
                        Capital improvement project tracking
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="projects"
                    checked={formData.projects_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, projects_enabled: checked })}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : isEditing ? 'Update Property' : 'Add Property'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
