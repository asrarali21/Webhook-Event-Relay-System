import { useState, useEffect, useMemo } from 'react';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  getFilteredRowModel,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RefreshCw, Plus, Search, Filter, Edit, Trash2 } from 'lucide-react';
import { apiService, type Subscription, type CreateSubscriptionData } from '@/services/api';
import { toast } from 'sonner';

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [createForm, setCreateForm] = useState<CreateSubscriptionData>({
    eventType: '',
    targetUrl: '',
    description: '',
  });
  const [editForm, setEditForm] = useState<Partial<Subscription>>({});

  const fetchSubscriptions = async () => {
    try {
      setRefreshing(true);
      const response = await apiService.getSubscriptions({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        isActive: columnFilters.find(f => f.id === 'isActive')?.value as boolean,
      });
      setSubscriptions(response.subscriptions);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('Failed to fetch subscriptions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [pagination.pageIndex, pagination.pageSize, columnFilters]);

  const handleCreateSubscription = async () => {
    try {
      if (!createForm.eventType || !createForm.targetUrl) {
        toast.error('Event type and target URL are required');
        return;
      }

      await apiService.createSubscription(createForm);
      toast.success('Subscription created successfully');
      setIsCreateDialogOpen(false);
      setCreateForm({ eventType: '', targetUrl: '', description: '' });
      fetchSubscriptions();
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      toast.error(error.response?.data?.error || 'Failed to create subscription');
    }
  };

  const handleUpdateSubscription = async () => {
    if (!editingSubscription) return;

    try {
      await apiService.updateSubscription(editingSubscription.id, editForm);
      toast.success('Subscription updated successfully');
      setIsEditDialogOpen(false);
      setEditingSubscription(null);
      setEditForm({});
      fetchSubscriptions();
    } catch (error: any) {
      console.error('Error updating subscription:', error);
      toast.error(error.response?.data?.error || 'Failed to update subscription');
    }
  };

  const handleDeleteSubscription = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to delete this subscription?')) return;

    try {
      await apiService.deleteSubscription(subscriptionId);
      toast.success('Subscription deleted successfully');
      fetchSubscriptions();
    } catch (error: any) {
      console.error('Error deleting subscription:', error);
      toast.error(error.response?.data?.error || 'Failed to delete subscription');
    }
  };

  const handleEditClick = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setEditForm({
      eventType: subscription.eventType,
      targetUrl: subscription.targetUrl,
      isActive: subscription.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Inactive</Badge>
    );
  };

  const columns: ColumnDef<Subscription>[] = useMemo(
    () => [
      {
        accessorKey: 'eventType',
        header: 'Event Type',
        cell: ({ row }) => {
          const eventType = row.getValue('eventType') as string;
          return <span className="font-medium">{eventType}</span>;
        },
        filterFn: (row, _id, value) => {
          return value.includes(row.getValue('eventType'));
        },
      },
      {
        accessorKey: 'targetUrl',
        header: 'Target URL',
        cell: ({ row }) => {
          const url = row.getValue('targetUrl') as string;
          return (
            <div className="max-w-[300px] truncate" title={url}>
              {url}
            </div>
          );
        },
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        cell: ({ row }) => getStatusBadge(row.getValue('isActive')),
        filterFn: (row, _id, value) => {
          return value.includes(row.getValue('isActive'));
        },
      },
      {
        accessorKey: 'deliveryCount',
        header: 'Deliveries',
        cell: ({ row }) => {
          const count = row.getValue('deliveryCount') as number;
          return <span className="font-medium">{count}</span>;
        },
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ row }) => {
          const date = new Date(row.getValue('createdAt'));
          return (
            <div>
              <div className="text-sm">{date.toLocaleDateString()}</div>
              <div className="text-xs text-muted-foreground">
                {formatTimeAgo(row.getValue('createdAt'))}
              </div>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const subscription = row.original;
          return (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEditClick(subscription)}
                className="h-8"
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteSubscription(subscription.id)}
                className="h-8 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: subscriptions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
          <p className="text-muted-foreground">
            Manage webhook subscriptions
          </p>
        </div>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
          <p className="text-muted-foreground">
            Manage webhook subscriptions
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            onClick={fetchSubscriptions} 
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Subscription
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Subscription</DialogTitle>
                <DialogDescription>
                  Add a new webhook subscription to receive events.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="eventType">Event Type</Label>
                  <Input
                    id="eventType"
                    placeholder="e.g., user.created, order.updated"
                    value={createForm.eventType}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm({ ...createForm, eventType: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetUrl">Target URL</Label>
                  <Input
                    id="targetUrl"
                    placeholder="https://your-webhook-endpoint.com/webhook"
                    value={createForm.targetUrl}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm({ ...createForm, targetUrl: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    placeholder="Description for this subscription"
                    value={createForm.description}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm({ ...createForm, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateSubscription}>
                  Create Subscription
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscriptions</CardTitle>
          <CardDescription>
            Manage your webhook subscriptions and their settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search subscriptions..."
                  value={globalFilter ?? ''}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setGlobalFilter(String(event.target.value))}
                  className="pl-8"
                />
              </div>
            </div>
            <Select
              value={(table.getColumn('isActive')?.getFilterValue() as string) ?? ''}
              onValueChange={(value: string) =>
                table.getColumn('isActive')?.setFilterValue(value === 'all' ? '' : value === 'true')
              }
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No subscriptions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
              Showing {table.getFilteredRowModel().rows.length} of {table.getCoreRowModel().rows.length} subscriptions
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
            <DialogDescription>
              Update the subscription settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editEventType">Event Type</Label>
              <Input
                id="editEventType"
                value={editForm.eventType || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, eventType: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editTargetUrl">Target URL</Label>
              <Input
                id="editTargetUrl"
                value={editForm.targetUrl || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, targetUrl: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="editIsActive"
                checked={editForm.isActive || false}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, isActive: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="editIsActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSubscription}>
              Update Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

