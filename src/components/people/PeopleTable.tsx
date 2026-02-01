import { format } from 'date-fns';
import { Building2, MoreHorizontal, Mail, Phone, Calendar } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PersonWithAssignments } from '@/hooks/usePeople';

interface PeopleTableProps {
  people: PersonWithAssignments[];
  isLoading: boolean;
  onPersonClick: (person: PersonWithAssignments) => void;
  groupByProperty?: boolean;
  showArchiveInfo?: boolean;
}

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'admin':
      return 'destructive';
    case 'manager':
      return 'default';
    case 'project_manager':
      return 'default';
    case 'superintendent':
      return 'secondary';
    case 'inspector':
      return 'outline';
    default:
      return 'outline';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'text-green-600';
    case 'archived':
      return 'text-yellow-600';
    case 'deactivated':
      return 'text-red-600';
    default:
      return 'text-muted-foreground';
  }
};

const getInitials = (name: string | null) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

export function PeopleTable({ 
  people, 
  isLoading, 
  onPersonClick,
  groupByProperty,
  showArchiveInfo,
}: PeopleTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (people.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No people found</h3>
          <p className="text-muted-foreground text-center max-w-sm">
            {showArchiveInfo 
              ? 'No archived team members yet.'
              : 'Add team members to get started with property management.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (groupByProperty) {
    // Group people by their property assignments
    const propertyGroups = new Map<string, { property: any; members: PersonWithAssignments[] }>();
    
    people.forEach(person => {
      person.assignments.forEach(assignment => {
        if (!assignment.property) return;
        const key = assignment.property.id;
        if (!propertyGroups.has(key)) {
          propertyGroups.set(key, { property: assignment.property, members: [] });
        }
        const group = propertyGroups.get(key)!;
        if (!group.members.find(m => m.user_id === person.user_id)) {
          group.members.push(person);
        }
      });
    });

    return (
      <div className="space-y-6">
        {Array.from(propertyGroups.values()).map(({ property, members }) => (
          <Card key={property.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {property.name}
                <Badge variant="secondary" className="ml-2">
                  {members.length} members
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {property.address}, {property.city}, {property.state}
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Since</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map(person => {
                    const assignment = person.assignments.find(a => a.property?.id === property.id);
                    return (
                      <TableRow 
                        key={`${property.id}-${person.user_id}`}
                        className="cursor-pointer"
                        onClick={() => onPersonClick(person)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={person.avatar_url || undefined} />
                              <AvatarFallback>{getInitials(person.full_name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{person.full_name || 'Unknown'}</div>
                              <div className="text-sm text-muted-foreground">{person.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(assignment?.role || 'user')}>
                            {assignment?.role || 'User'}
                          </Badge>
                        </TableCell>
                        <TableCell>{assignment?.title || '-'}</TableCell>
                        <TableCell>
                          {assignment?.start_date 
                            ? format(new Date(assignment.start_date), 'MMM yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onPersonClick(person)}>
                                View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Properties & Roles</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Since</TableHead>
            {showArchiveInfo && <TableHead>Archived</TableHead>}
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {people.map(person => (
            <TableRow 
              key={person.id}
              className="cursor-pointer"
              onClick={() => onPersonClick(person)}
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={person.avatar_url || undefined} />
                    <AvatarFallback>{getInitials(person.full_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{person.full_name || 'Unknown'}</div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {person.email}
                    </div>
                    {person.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {person.phone}
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  {person.assignments.length > 0 ? (
                    person.assignments.slice(0, 3).map((assignment, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-sm">{assignment.property?.name || 'Unknown'}</span>
                        <Badge variant={getRoleBadgeVariant(assignment.role)} className="text-xs">
                          {assignment.role}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No property assignments</span>
                  )}
                  {person.assignments.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{person.assignments.length - 3} more
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${
                    person.status === 'active' ? 'bg-green-500' : 
                    person.status === 'archived' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <span className={`text-sm capitalize ${getStatusColor(person.status || 'active')}`}>
                    {person.status || 'Active'}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {person.hire_date 
                    ? format(new Date(person.hire_date), 'MMM yyyy')
                    : format(new Date(person.created_at), 'MMM yyyy')}
                </div>
              </TableCell>
              {showArchiveInfo && (
                <TableCell>
                  {person.assignments.find(a => a.status === 'archived') && (
                    <div className="text-sm">
                      <div className="text-muted-foreground">
                        {person.assignments.find(a => a.status === 'archived')?.departure_reason || 'Unknown'}
                      </div>
                      {person.assignments.find(a => a.archived_at) && (
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(person.assignments.find(a => a.archived_at)!.archived_at!), 'MMM d, yyyy')}
                        </div>
                      )}
                    </div>
                  )}
                </TableCell>
              )}
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onPersonClick(person)}>
                      View Details
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
