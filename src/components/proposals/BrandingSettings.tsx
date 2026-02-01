import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useUpsertBranding, useUploadLogo, type CompanyBranding } from "@/hooks/useCompanyBranding";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";
import { Loader2, Upload, Building2 } from "lucide-react";

interface BrandingSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BrandingSettings({ open, onOpenChange }: BrandingSettingsProps) {
  const { data: branding, isLoading } = useCompanyBranding();
  const upsertBranding = useUpsertBranding();
  const uploadLogo = useUploadLogo();

  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#1e40af");
  const [secondaryColor, setSecondaryColor] = useState("#3b82f6");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [footerText, setFooterText] = useState("");

  useEffect(() => {
    if (branding) {
      setCompanyName(branding.company_name);
      setLogoUrl(branding.logo_url || "");
      setPrimaryColor(branding.primary_color);
      setSecondaryColor(branding.secondary_color);
      setAddressLine1(branding.address_line1 || "");
      setAddressLine2(branding.address_line2 || "");
      setPhone(branding.phone || "");
      setEmail(branding.email || "");
      setWebsite(branding.website || "");
      setFooterText(branding.footer_text || "");
    }
  }, [branding]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadLogo.mutateAsync(file);
    setLogoUrl(url);
  };

  const handleSave = async () => {
    if (!companyName.trim()) return;

    await upsertBranding.mutateAsync({
      company_name: companyName.trim(),
      logo_url: logoUrl || undefined,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      address_line1: addressLine1.trim() || undefined,
      address_line2: addressLine2.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      website: website.trim() || undefined,
      footer_text: footerText.trim() || undefined,
    });

    onOpenChange(false);
  };

  const isSaving = upsertBranding.isPending || uploadLogo.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Branding
          </DialogTitle>
          <DialogDescription>
            Configure your company letterhead and branding for proposals
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {/* Company Info */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Company Information</h4>
            
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your Company Name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Address Line 1</Label>
                <Input
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="123 Business Street"
                />
              </div>
              <div className="space-y-2">
                <Label>Address Line 2</Label>
                <Input
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="City, State 12345"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="info@company.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="www.company.com"
              />
            </div>
          </div>

          <Separator />

          {/* Branding */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Branding</h4>

            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Company logo"
                    className="h-12 object-contain bg-muted rounded p-2"
                  />
                ) : (
                  <div className="h-12 w-24 bg-muted rounded flex items-center justify-center text-muted-foreground text-xs">
                    No logo
                  </div>
                )}
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                    disabled={uploadLogo.isPending}
                  />
                  <Button variant="outline" size="sm" asChild>
                    <span>
                      {uploadLogo.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Upload Logo
                    </span>
                  </Button>
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Recommended: 400x100px PNG with transparent background
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-9 w-12 rounded border cursor-pointer"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Secondary Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="h-9 w-12 rounded border cursor-pointer"
                  />
                  <Input
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Footer */}
          <div className="space-y-2">
            <Label>Footer Text</Label>
            <Textarea
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="Confidential - For intended recipient only"
              rows={2}
            />
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Letterhead Preview</Label>
            <div
              className="border rounded-lg p-4 bg-white"
              style={{ borderTopColor: primaryColor, borderTopWidth: 3 }}
            >
              <div className="flex items-start justify-between">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-8 object-contain" />
                ) : (
                  <div className="text-lg font-bold" style={{ color: primaryColor }}>
                    {companyName || "Company Name"}
                  </div>
                )}
                <div className="text-right text-xs text-muted-foreground">
                  {addressLine1 && <div>{addressLine1}</div>}
                  {addressLine2 && <div>{addressLine2}</div>}
                  {phone && <div>{phone}</div>}
                  {email && <div>{email}</div>}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !companyName.trim()}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
