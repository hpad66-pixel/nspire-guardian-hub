import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AssetDialog } from '@/components/assets/AssetDialog';
import { AssetTypeIcon } from '@/components/assets/AssetTypeIcon';
import { useAssets, useDeleteAsset, useAssetTypes, Asset, AssetType, ASSET_TYPE_LABELS } from '@/hooks/useAssets';
import { useProperties } from '@/hooks/useProperties';
import { useLowStockCount } from '@/hooks/useInventory';
import { InventoryStatusPanel } from '@/components/analytics/InventoryStatusPanel';
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2,
  MapPin,
  Filter,
  AlertTriangle,
  BarChart2,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useUserPermissions } from '@/hooks/usePermissions';

export default function AssetsPage() {
  const navigate = useNavigate();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [deleteAsset, setDeleteAsset] = useState<Asset | null>(null);

  const { data: properties = [] } = useProperties();
  const { data: assetTypes = [] } = useAssetTypes();
  const { canCreate, canUpdate, canDelete } = useUserPermissions();
  const canCreateAssets = canCreate('properties');
  const canUpdateAssets = canUpdate('properties');
  const canDeleteAssets = canDelete('properties');

  const { data: lowStockCount } = useLowStockCount(selectedPropertyId);

  useEffect(() => {
    if (!selectedPropertyId && properties.length > 0) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  const { data: assets = [], isLoading } = useAssets(
    selectedPropertyId || undefined
  );
  const deleteAssetMutation = useDeleteAsset();

  const filteredAssets = assets.filter(asset => {
    if (selectedType !== 'all' && asset.asset_type !== selectedType) return false;
    if (searchQuery && !asset.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const assetCounts = assets.reduce((acc, asset) => {
    acc[asset.asset_type] = (acc[asset.asset_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const typeLabels = assetTypes.length > 0
    ? Object.fromEntries(assetTypes.map((t) => [t.key, t.label]))
    : ASSET_TYPE_LABELS;

  const typeList = assetTypes.length > 0
    ? assetTypes.map((t) => ({ key: t.key, label: t.label }))
    : Object.entries(ASSET_TYPE_LABELS).map(([key, label]) => ({ key, label }));

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deleteAsset) {
      await deleteAssetMutation.mutateAsync(deleteAsset.id);
      setDeleteAsset(null);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingAsset(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Assets & Inventory</h1>
          <p className="text-muted-foreground">
            Infrastructure assets and supply inventory
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canCreateAssets && (
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Asset
            </Button>
          )}
        </div>
      </div>

      {/* Property selector */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
          <SelectTrigger className="w-full md:w-[220px]">
            <SelectValue placeholder="Select property" />
          </SelectTrigger>
          <SelectContent>
            {properties.map((property) => (
              <SelectItem key={property.id} value={property.id}>
                {property.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Analytics shortcut */}
        {selectedPropertyId && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 self-start md:self-auto"
            onClick={() => navigate(`/properties/${selectedPropertyId}/analytics`)}
          >
            <BarChart2 className="h-4 w-4" />
            View Analytics
          </Button>
        )}
      </div>

      {/* Low stock alert banner */}
      {selectedPropertyId && (lowStockCount ?? 0) > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/50 px-4 py-3">
          <div className="flex items-center gap-2.5 text-sm text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span className="font-medium">
              ⚠ {lowStockCount} inventory item{lowStockCount !== 1 ? 's' : ''} running low at this property
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-amber-400 text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-amber-900/30 flex-shrink-0"
            onClick={() => navigate(`/properties/${selectedPropertyId}/analytics`)}
          >
            View Inventory
          </Button>
        </div>
      )}

      {/* Tabs: Assets / Inventory */}
      <Tabs defaultValue="assets">
        <TabsList>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-1.5">
            Inventory
            {(lowStockCount ?? 0) > 0 && (
              <span className="h-4 w-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                !
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── ASSETS TAB ── */}
        <TabsContent value="assets" className="space-y-6 mt-4">
          {/* Search + type filter */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {typeList.map(({ key, label }) => (
                  <SelectItem key={key} value={key}>
                    {label} ({assetCounts[key] || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {typeList.map(({ key: type, label }) => (
              <Card 
                key={type} 
                className={`cursor-pointer transition-colors ${
                  selectedType === type ? 'border-primary' : ''
                }`}
                onClick={() => setSelectedType(selectedType === type ? 'all' : type)}
              >
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-3">
                    <AssetTypeIcon type={type as AssetType} size="sm" />
                    <div>
                      <p className="text-2xl font-bold">{assetCounts[type] || 0}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Asset List */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading assets...</div>
          ) : filteredAssets.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="pt-8 pb-8 text-center">
                <p className="text-muted-foreground mb-4">No assets found</p>
                {canCreateAssets && (
                  <Button variant="outline" onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Asset
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filteredAssets.map((asset) => (
                <Card key={asset.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <AssetTypeIcon type={asset.asset_type} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold truncate">{asset.name}</h3>
                          <Badge 
                            variant={asset.status === 'active' ? 'default' : 'secondary'}
                            className="shrink-0"
                          >
                            {asset.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {typeLabels[asset.asset_type] || asset.asset_type}
                        </p>
                        {asset.location_description && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {asset.location_description}
                          </p>
                        )}
                      </div>
                    </div>
                    {(canUpdateAssets || canDeleteAssets) && (
                      <div className="flex gap-2 mt-3 pt-3 border-t">
                        {canUpdateAssets && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleEdit(asset)}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        )}
                        {canDeleteAssets && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1 text-destructive hover:text-destructive"
                            onClick={() => setDeleteAsset(asset)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── INVENTORY TAB ── */}
        <TabsContent value="inventory" className="mt-4">
          {selectedPropertyId ? (
            <Card>
              <CardContent className="p-6">
                <InventoryStatusPanel propertyId={selectedPropertyId} />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                Select a property to view its inventory.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Asset Dialog */}
      {(canCreateAssets || canUpdateAssets) && (
        <AssetDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          asset={editingAsset}
          defaultPropertyId={selectedPropertyId || properties[0]?.id}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteAsset} onOpenChange={() => setDeleteAsset(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteAsset?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
