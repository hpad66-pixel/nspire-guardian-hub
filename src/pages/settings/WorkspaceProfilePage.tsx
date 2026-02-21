import { useState, useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import { useCurrentUserRole } from "@/hooks/useUserManagement";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";
import { useUpsertWorkspaceBranding, useUploadWorkspaceLogo } from "@/hooks/useWorkspaceBranding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Upload,
  Loader2,
  Palette,
  Globe,
  Phone,
  MapPin,
  Briefcase,
} from "lucide-react";

const INDUSTRIES = [
  "Property Management",
  "Construction",
  "Engineering",
  "General Contracting",
  "Facilities Management",
  "Other",
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Color picker sub-component
// ─────────────────────────────────────────────────────────────────────────────
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-12 cursor-pointer rounded-md border border-input p-0.5"
            aria-label={label}
          />
        </div>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono uppercase w-32"
          maxLength={7}
          placeholder="#000000"
        />
        <div
          className="h-9 w-9 flex-shrink-0 rounded-md border border-input shadow-sm"
          style={{ background: value }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Logo preview pair (light + dark)
// ─────────────────────────────────────────────────────────────────────────────
function LogoPreview({ logoUrl, companyName }: { logoUrl: string; companyName: string }) {
  return (
    <div className="space-y-2">
      <Label>Logo Preview</Label>
      <div className="grid grid-cols-2 gap-3">
        {/* Light */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
            Light Background
          </span>
          <div className="flex h-20 items-center justify-center rounded-xl border border-border bg-white px-4">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo on light" className="max-h-12 max-w-full object-contain" />
            ) : (
              <span className="text-sm font-semibold text-gray-800">
                {companyName || "Company Name"}
              </span>
            )}
          </div>
        </div>
        {/* Dark */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
            Dark Background
          </span>
          <div className="flex h-20 items-center justify-center rounded-xl border border-border bg-gray-900 px-4">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo on dark" className="max-h-12 max-w-full object-contain" />
            ) : (
              <span className="text-sm font-semibold text-gray-100">
                {companyName || "Company Name"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function WorkspaceProfilePage() {
  const { data: role } = useCurrentUserRole();
  const { data: branding, isLoading } = useCompanyBranding();

  const upsert = useUpsertWorkspaceBranding();
  const uploadLogo = useUploadWorkspaceLogo();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [industry, setIndustry] = useState<string>("");
  const [description, setDescription] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#1e40af");
  const [secondaryColor, setSecondaryColor] = useState("#3b82f6");

  // Validation
  const [nameError, setNameError] = useState("");

  const isAdmin = role === "admin" || role === "owner";

  // Populate form from fetched branding
  useEffect(() => {
    if (!branding) return;
    setCompanyName(branding.company_name ?? "");
    setLogoUrl(branding.logo_url ?? "");
    setWebsite(branding.website ?? "");
    setPhone(branding.phone ?? "");
    setAddress(branding.address_line1 ?? "");
    setPrimaryColor(branding.primary_color ?? "#1e40af");
    setSecondaryColor(branding.secondary_color ?? "#3b82f6");
    setDescription(branding.footer_text ?? "");
    // Industry isn't a DB column yet; we store it in footer_text workaround
    // Actually it maps to nothing — let's skip pre-fill (no column exists)
  }, [branding]);

  if (!isLoading && !isAdmin) return <Navigate to="/dashboard" replace />;

  const handleLogoClick = () => fileInputRef.current?.click();

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadLogo.mutateAsync(file);
    setLogoUrl(url);
    // Reset file input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = () => {
    if (!companyName.trim()) {
      setNameError("Company name is required");
      return;
    }
    setNameError("");

    upsert.mutate({
      company_name: companyName.trim(),
      logo_url: logoUrl || null,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      address_line1: address.trim() || null,
      phone: phone.trim() || null,
      website: website.trim() || null,
      footer_text: description.trim() || null,
      industry: industry || null,
    });
  };

  const isBusy = upsert.isPending || uploadLogo.isPending;

  return (
    <div className="space-y-8 p-6 max-w-3xl mx-auto">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Workspace Profile</h1>
            <p className="text-sm text-muted-foreground">
              Company identity and brand appearance used across portals, reports, and proposals
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isBusy} size="sm">
          {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <>
          {/* ── Section 1: Company Identity ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                Company Identity
              </CardTitle>
              <CardDescription>
                Basic information about your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Company Name */}
              <div className="space-y-2">
                <Label htmlFor="company-name">
                  Company Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    if (e.target.value.trim()) setNameError("");
                  }}
                  placeholder="Acme Construction LLC"
                  className={nameError ? "border-destructive" : ""}
                />
                {nameError && (
                  <p className="text-xs text-destructive">{nameError}</p>
                )}
              </div>

              {/* Logo upload */}
              <div className="space-y-2">
                <Label>Company Logo</Label>
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-16 w-32 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={handleLogoClick}
                  >
                    {uploadLogo.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Logo"
                        className="max-h-12 max-w-[120px] object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <Upload className="h-4 w-4" />
                        <span className="text-[10px] font-medium">Upload</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLogoClick}
                      disabled={uploadLogo.isPending}
                    >
                      {uploadLogo.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      {logoUrl ? "Replace Logo" : "Upload Logo"}
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                      PNG, JPG, SVG · max 5 MB
                      <br />
                      Recommended: 400 × 100 px
                    </p>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={handleLogoFile}
                  />
                </div>
              </div>

              <Separator />

              {/* Website + Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website" className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    Website
                  </Label>
                  <Input
                    id="website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://acme.com"
                    type="url"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    type="tel"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  Address
                </Label>
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main Street, Suite 100&#10;City, State 12345"
                  rows={2}
                />
              </div>

              {/* Industry */}
              <div className="space-y-2">
                <Label>Industry</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((ind) => (
                      <SelectItem key={ind} value={ind}>
                        {ind}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Company Description{" "}
                  <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of what your company does…"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Section 2: Brand Appearance ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-4 w-4 text-muted-foreground" />
                Brand Appearance
              </CardTitle>
              <CardDescription>
                Colors and logo treatment used in client portals, reports, and proposals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Colors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <ColorField
                  label="Primary Color"
                  value={primaryColor}
                  onChange={setPrimaryColor}
                />
                <ColorField
                  label="Secondary Color"
                  value={secondaryColor}
                  onChange={setSecondaryColor}
                />
              </div>

              <Separator />

              {/* Logo preview */}
              <LogoPreview logoUrl={logoUrl} companyName={companyName} />

              {/* Color swatch preview */}
              <div className="space-y-2">
                <Label>Color Preview</Label>
                <div
                  className="rounded-xl border border-border overflow-hidden"
                  style={{ borderTopWidth: 4, borderTopColor: primaryColor }}
                >
                  <div className="p-4 bg-white flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold" style={{ color: primaryColor }}>
                        {companyName || "Company Name"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {website || "www.company.com"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <div
                        className="h-6 w-16 rounded"
                        style={{ background: primaryColor }}
                        title="Primary"
                      />
                      <div
                        className="h-6 w-16 rounded"
                        style={{ background: secondaryColor }}
                        title="Secondary"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  These colors appear in portal headers, report letterheads, and proposal covers.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Bottom save */}
          <div className="flex justify-end pb-6">
            <Button onClick={handleSave} disabled={isBusy}>
              {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
