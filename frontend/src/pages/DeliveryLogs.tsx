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
import { RefreshCw, RotateCcw, Search, Filter } from 'lucide-react';
import { apiService, type DeliveryLog } from '@/services/api';
import { toast } from 'sonner';

export default function DeliveryLogs() {
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
  });

  const fetchLogs = async () => {
    try {
      setRefreshing(true);
      const response = await apiService.getDeliveryLogs({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        status: columnFilters.find(f => f.id === 'status')?.value as string,
        eventType: columnFilters.find(f => f.id === 'eventType')?.value as string,
      });
      setLogs(response.logs);
    } catch (error) {
      console.error('Error fetching delivery logs:', error);
      toast.error('Failed to fetch delivery logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [pagination.pageIndex, pagination.pageSize, columnFilters]);

  const handleRetry = async (logId: string) => {
    try {
      await apiService.retryDelivery(logId);
      toast.success('Retry job queued successfully');
      fetchLogs(); // Refresh the data
    } catch (error) {
      console.error('Error retrying delivery:', error);
      toast.error('Failed to retry delivery');
    }
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Success</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Failed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const columns: ColumnDef<DeliveryLog>[] = useMemo(
    () => [
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => getStatusBadge(row.getValue('status')),
        filterFn: (row, _id, value) => {
          return value.includes(row.getValue('status'));
        },
      },
      {
        accessorKey: 'event.event_type',
        header: 'Event Type',
        cell: ({ row }) => {
          const eventType = row.original.event.event_type;
          return <span className="font-medium">{eventType}</span>;
        },
        filterFn: (row, _id, value) => {
          return value.includes(row.original.event.event_type);
        },
      },
      {
        accessorKey: 'subscription.target_url',
        header: 'Target URL',
        cell: ({ row }) => {
          const url = row.original.subscription.target_url;
          return (
            <div className="max-w-[300px] truncate" title={url}>
              {url}
            </div>
          );
        },
      },
      {
        accessorKey: 'attemptedAt',
        header: 'Timestamp',
        cell: ({ row }) => {
          const date = new Date(row.getValue('attemptedAt'));
          return (
            <div>
              <div className="text-sm">{date.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">
                {formatTimeAgo(row.getValue('attemptedAt'))}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'responseStatusCode',
        header: 'Response Code',
        cell: ({ row }) => {
          const code = row.getValue('responseStatusCode') as number;
          if (!code) return <span className="text-muted-foreground">-</span>;
          return (
            <Badge 
              variant={code >= 200 && code < 300 ? 'default' : 'destructive'}
              className={code >= 200 && code < 300 ? 'bg-green-100 text-green-800' : ''}
            >
              {code}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'attemptCount',
        header: 'Attempts',
        cell: ({ row }) => {
          const count = row.getValue('attemptCount') as number;
          return <span className="font-medium">{count}</span>;
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const log = row.original;
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRetry(log.id)}
              disabled={log.status === 'success' || !log.subscription.is_active}
              className="h-8"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: logs,
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
          <h1 className="text-3xl font-bold tracking-tight">Delivery Logs</h1>
          <p className="text-muted-foreground">
            View and manage webhook delivery logs
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
          <h1 className="text-3xl font-bold tracking-tight">Delivery Logs</h1>
          <p className="text-muted-foreground">
            View and manage webhook delivery logs
          </p>
        </div>
        <Button 
          onClick={fetchLogs} 
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Delivery Logs</CardTitle>
          <CardDescription>
            Monitor webhook delivery attempts and retry failed deliveries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={globalFilter ?? ''}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setGlobalFilter(String(event.target.value))}
                  className="pl-8"
                />
              </div>
            </div>
            <Select
              value={(table.getColumn('status')?.getFilterValue() as string) ?? ''}
              onValueChange={(value: string) =>
                table.getColumn('status')?.setFilterValue(value === 'all' ? '' : value)
              }
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
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
                      No logs found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
              Showing {table.getFilteredRowModel().rows.length} of {table.getCoreRowModel().rows.length} logs
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
    </div>
  );
}

