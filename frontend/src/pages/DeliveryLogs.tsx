

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

