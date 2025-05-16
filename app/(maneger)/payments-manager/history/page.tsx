'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getMyPayments } from '@/app/actions/stripe-connect';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  DollarSign, 
  Calendar, 
  Search, 
  Filter, 
  Download, 
  CreditCard, 
  User,
  ArrowUpDown,
  FileText,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  MoreHorizontal
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Payment status badge component
function PaymentStatusBadge({ status }: { status: string }) {
  const statusStyles = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    processing: "bg-blue-100 text-blue-800 border-blue-200",
    succeeded: "bg-green-100 text-green-800 border-green-200",
    failed: "bg-red-100 text-red-800 border-red-200",
    refunded: "bg-purple-100 text-purple-800 border-purple-200",
  };

  const style = statusStyles[status as keyof typeof statusStyles] || "bg-gray-100 text-gray-800 border-gray-200";
  
  return (
    <Badge variant="outline" className={`${style} font-medium`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

// Payment method badge component
function PaymentMethodBadge({ method }: { method: string }) {
  const methodIcons = {
    card: <CreditCard className="h-3 w-3 mr-1" />,
    us_bank_account: <DollarSign className="h-3 w-3 mr-1" />,
    sepa_debit: <FileText className="h-3 w-3 mr-1" />,
    ideal: <FileText className="h-3 w-3 mr-1" />,
    link: <CreditCard className="h-3 w-3 mr-1" />,
    other: <FileText className="h-3 w-3 mr-1" />,
  };

  const methodNames = {
    card: "Card",
    us_bank_account: "ACH",
    sepa_debit: "SEPA",
    ideal: "iDEAL",
    link: "Link",
    other: "Other",
  };
  
  const icon = methodIcons[method as keyof typeof methodIcons] || methodIcons.other;
  const name = methodNames[method as keyof typeof methodNames] || "Other";
  
  return (
    <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 font-medium flex items-center">
      {icon}
      {name}
    </Badge>
  );
}

// Summary card component
function SummaryCard({ 
  title, 
  value, 
  description, 
  icon, 
  trend = null 
}: { 
  title: string; 
  value: string; 
  description: string; 
  icon: React.ReactNode;
  trend?: { 
    value: number; 
    label: string;
  } | null;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-start">
          <div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs text-gray-500 mt-1">{description}</div>
          </div>
          <div className="p-2 bg-primary/10 rounded-md">
            {icon}
          </div>
        </div>
        
        {trend && (
          <div className={`mt-2 text-xs flex items-center ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Custom pagination component that doesn't use shadcn components
function CustomPagination({ 
  currentPage, 
  totalPages, 
  onPageChange 
}: { 
  currentPage: number; 
  totalPages: number; 
  onPageChange: (page: number) => void;
}) {
  const getPageNumbers = () => {
    const pages = [];
    
    // Always show first page
    pages.push(1);
    
    // Show ellipsis if needed
    if (currentPage > 3) {
      pages.push(-1); // -1 represents ellipsis
    }
    
    // Show pages around current page
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      if (i === 1 || i === totalPages) continue; // Skip first and last page as they're always shown
      pages.push(i);
    }
    
    // Show ellipsis if needed
    if (currentPage < totalPages - 2) {
      pages.push(-2); // -2 represents ellipsis to avoid key collision
    }
    
    // Always show last page if more than one page
    if (totalPages > 1) {
      pages.push(totalPages);
    }
    
    return pages;
  };
  
  if (totalPages <= 1) return null;
  
  return (
    <div className="flex items-center space-x-1">
      {/* Previous button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="h-8 w-8 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Previous page</span>
      </Button>
      
      {/* Page numbers */}
      {getPageNumbers().map((page, index) => (
        page === -1 || page === -2 ? (
          <Button
            key={`ellipsis-${index}`}
            variant="outline"
            size="sm"
            disabled
            className="h-8 w-8 p-0"
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">More pages</span>
          </Button>
        ) : (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(page)}
            className="h-8 w-8 p-0"
          >
            {page}
          </Button>
        )
      ))}
      
      {/* Next button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="h-8 w-8 p-0"
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Next page</span>
      </Button>
    </div>
  );
}

export default function PaymentHistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for filtering and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || session.user?.role !== 'project manager') {
      router.push('/');
      return;
    }
    
    fetchPayments();
  }, [session, status, router]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const result = await getMyPayments();
      
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        const parsedData = JSON.parse(result.data);
        setPayments(parsedData);
        setError(null);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle sorting
  const requestSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Function to filter payments based on current filters
  const getFilteredPayments = () => {
    return payments.filter(payment => {
      // Status filter
      if (statusFilter !== 'all' && payment.status !== statusFilter) {
        return false;
      }
      
      // Date filter
      if (dateFilter !== 'all') {
        const paymentDate = new Date(payment.created_at);
        const now = new Date();
        
        if (dateFilter === 'today') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (paymentDate < today) return false;
        } else if (dateFilter === 'thisWeek') {
          const aWeekAgo = new Date();
          aWeekAgo.setDate(aWeekAgo.getDate() - 7);
          if (paymentDate < aWeekAgo) return false;
        } else if (dateFilter === 'thisMonth') {
          const aMonthAgo = new Date();
          aMonthAgo.setMonth(aMonthAgo.getMonth() - 1);
          if (paymentDate < aMonthAgo) return false;
        }
      }
      
      // Search term (search by expert name, description, payment ID)
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const expertName = payment.expert?.name?.toLowerCase() || '';
        const description = payment.description?.toLowerCase() || '';
        const paymentId = payment._id?.toLowerCase() || '';
        
        return expertName.includes(searchLower) || 
               description.includes(searchLower) ||
               paymentId.includes(searchLower);
      }
      
      return true;
    });
  };

  // Sort filtered payments
  const getSortedPayments = () => {
    const filteredPayments = getFilteredPayments();
    
    return [...filteredPayments].sort((a, b) => {
      // Handle numerical sorting
      if (['amount', 'platformFee'].includes(sortConfig.key)) {
        if (sortConfig.direction === 'asc') {
          return a[sortConfig.key] - b[sortConfig.key];
        } else {
          return b[sortConfig.key] - a[sortConfig.key];
        }
      }
      
      // Handle date sorting
      if (sortConfig.key === 'created_at') {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        
        if (sortConfig.direction === 'asc') {
          return dateA - dateB;
        } else {
          return dateB - dateA;
        }
      }
      
      // Handle string sorting
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Get paginated data
  const getPaginatedData = () => {
    const sortedPayments = getSortedPayments();
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedPayments.slice(startIndex, startIndex + itemsPerPage);
  };

  // Calculate summary statistics
  const calculateSummary = () => {
    let totalPaid = 0;
    let totalFees = 0;
    let successfulPayments = 0;
    let uniqueExperts = new Set();
    
    payments.forEach(payment => {
      if (payment.status === 'succeeded') {
        totalPaid += payment.amount;
        successfulPayments++;
      }
      totalFees += payment.platformFee || 0;
      if (payment.expert?._id) {
        uniqueExperts.add(payment.expert._id);
      }
    });
    
    return {
      totalPaid,
      totalFees,
      successfulPayments,
      uniqueExperts: uniqueExperts.size
    };
  };

  const summary = calculateSummary();
  const filteredPaginatedPayments = getPaginatedData();
  const totalPages = Math.ceil(getSortedPayments().length / itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, dateFilter, itemsPerPage]);

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
      <header className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payment History</h1>
            <p className="mt-1 text-gray-600">
              Track and manage all your payments to annotators
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
            <Button variant="outline" onClick={fetchPayments} className="flex items-center">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => {/* Export functionality */}} className="flex items-center">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <SummaryCard
          title="Total Paid"
          value={`$${summary.totalPaid.toFixed(2)}`}
          description="Total successful payments"
          icon={<DollarSign className="h-5 w-5 text-primary" />}
        />
        <SummaryCard
          title="Successful Payments"
          value={summary.successfulPayments.toString()}
          description="Total completed transactions"
          icon={<CheckCircleIcon className="h-5 w-5 text-primary" />}
        />
        <SummaryCard
          title="Annotators Paid"
          value={summary.uniqueExperts.toString()}
          description="Unique annotators"
          icon={<User className="h-5 w-5 text-primary" />}
        />
      </div>

      {/* Filters and search */}
      <div className="mb-6 bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by annotator, description, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2 text-gray-500" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="succeeded">Succeeded</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="thisWeek">This Week</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Payments table */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle>Payment Transactions</CardTitle>
          <CardDescription>
            Showing {filteredPaginatedPayments.length} of {getSortedPayments().length} payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('created_at')} className="flex items-center font-medium text-xs">
                      Date
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('expert.name')} className="flex items-center font-medium text-xs">
                      Annotator
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('amount')} className="flex items-center font-medium text-xs">
                      Amount
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('description')} className="flex items-center font-medium text-xs">
                      Description
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('project.name')} className="flex items-center font-medium text-xs">
                      Project
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPaginatedPayments.length > 0 ? (
                  filteredPaginatedPayments.map((payment) => (
                    <TableRow key={payment._id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(payment.created_at), 'MMM d, yyyy')}
                        <div className="text-xs text-gray-500">
                          {format(new Date(payment.created_at), 'h:mm a')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {payment.expert?.name || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-500">{payment.expert?.email || ''}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">${payment.amount.toFixed(2)}</div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {payment.description || 'No description'}
                      </TableCell>
                      <TableCell>
                        <PaymentStatusBadge status={payment.status} />
                      </TableCell>
                      <TableCell>
                        <PaymentMethodBadge method={payment.paymentMethod} />
                      </TableCell>
                      <TableCell>
                        {payment.project ? (
                          <div>{payment.project.name}</div>
                        ) : (
                          <div className="text-gray-500 text-sm">Direct Payment</div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No payments found with the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {getSortedPayments().length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {getSortedPayments().length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, getSortedPayments().length)} of {getSortedPayments().length} results
              </div>
              
              <CustomPagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Items per page:</span>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                  setItemsPerPage(parseInt(value));
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// CheckCircle icon component
function CheckCircleIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}