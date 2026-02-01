import { useState } from 'react';
import { Users, UserCheck, Archive, Building2, Shield, Plus, Search, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePeople, usePeopleStats, type PersonWithAssignments } from '@/hooks/usePeople';
import { useRoleDefinitions } from '@/hooks/useRoleDefinitions';
import { useProperties } from '@/hooks/useProperties';
import { useUserPermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { PersonDetailSheet } from '@/components/people/PersonDetailSheet';
import { PersonDialog } from '@/components/people/PersonDialog';
import { RolesPermissionsTab } from '@/components/people/RolesPermissionsTab';
import { PeopleTable } from '@/components/people/PeopleTable';
import { InviteUserDialog } from '@/components/people/InviteUserDialog';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export default function PeoplePage() {
  const [search, setSearch] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');
  const [selectedPerson, setSelectedPerson] = useState<PersonWithAssignments | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const { canCreate } = useUserPermissions();
  const { userRole } = useAuth();

  const { data: stats } = usePeopleStats();
  const { data: roles } = useRoleDefinitions();
  const { data: properties } = useProperties();

  const filters = {
    search,
    propertyId: selectedProperty !== 'all' ? selectedProperty : undefined,
    role: selectedRole !== 'all' ? selectedRole as AppRole : undefined,
    status: activeTab === 'archived' ? 'archived' : selectedStatus !== 'all' ? selectedStatus : undefined,
  };

  const { data: people, isLoading } = usePeople(filters);

  const handlePersonClick = (person: PersonWithAssignments) => {
    setSelectedPerson(person);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">People</h1>
          <p className="text-muted-foreground">
            Manage team members across all properties
          </p>
        </div>
        <div className="flex gap-2">
          {(userRole === 'admin' || userRole === 'manager') && (
            <Button variant="outline" onClick={() => setShowInviteDialog(true)}>
              <Mail className="mr-2 h-4 w-4" />
              Invite User
            </Button>
          )}
          {canCreate('people') && (
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Person
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeMembers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Across all properties
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Archived</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.archivedMembers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Historical records
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Properties</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.propertiesWithTeam || 0}</div>
            <p className="text-xs text-muted-foreground">
              With team assignments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Roles</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.rolesCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Defined in system
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              <Users className="h-4 w-4" />
              All People
            </TabsTrigger>
            <TabsTrigger value="by-property" className="gap-2">
              <Building2 className="h-4 w-4" />
              By Property
            </TabsTrigger>
            <TabsTrigger value="archived" className="gap-2">
              <Archive className="h-4 w-4" />
              Archived
            </TabsTrigger>
            <TabsTrigger value="roles" className="gap-2">
              <Shield className="h-4 w-4" />
              Roles & Permissions
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Filters - shown for people tabs */}
        {activeTab !== 'roles' && (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search people..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Properties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {properties?.map(property => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles?.map(role => (
                  <SelectItem key={role.role_key} value={role.role_key}>
                    {role.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeTab !== 'archived' && (
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="deactivated">Deactivated</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        <TabsContent value="all" className="space-y-4">
          <PeopleTable 
            people={people || []} 
            isLoading={isLoading}
            onPersonClick={handlePersonClick}
          />
        </TabsContent>

        <TabsContent value="by-property" className="space-y-4">
          <PeopleTable 
            people={people || []} 
            isLoading={isLoading}
            onPersonClick={handlePersonClick}
            groupByProperty
          />
        </TabsContent>

        <TabsContent value="archived" className="space-y-4">
          <PeopleTable 
            people={people || []} 
            isLoading={isLoading}
            onPersonClick={handlePersonClick}
            showArchiveInfo
          />
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <RolesPermissionsTab />
        </TabsContent>
      </Tabs>

      {/* Person Detail Sheet */}
      <PersonDetailSheet
        person={selectedPerson}
        open={!!selectedPerson}
        onOpenChange={(open) => !open && setSelectedPerson(null)}
      />

      {/* Add Person Dialog */}
      <PersonDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />

      {/* Invite User Dialog */}
      <InviteUserDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
      />
    </div>
  );
}
