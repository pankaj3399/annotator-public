'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Users, Mail, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InvitedUser {
  id: string;
  email: string;
  status: 'pending' | 'accepted';
  invitedAt: string;
  expiresAt?: string;
  acceptedAt: string | null;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface InvitedUserCounts {
  pending: number;
  accepted: number;
  total: number;
}

export default function ExpertsPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>([]);
  const [counts, setCounts] = useState<InvitedUserCounts>({
    pending: 0,
    accepted: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('all');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    // Get page and size from URL parameters
    const page = searchParams.get('page');
    const size = searchParams.get('size');
    
    if (page) {
      setCurrentPage(Number(page));
    }
    
    if (size) {
      setPageSize(Number(size));
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchInvitedUsers = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/agency/invited-users?status=${currentTab}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch invited users');
        }
        
        const data = await response.json();
        
        if (data.success) {
          setInvitedUsers(data.invitedUsers);
          setCounts(data.counts);
        } else {
          throw new Error(data.error || 'Unknown error');
        }
      } catch (error) {
        console.error('Error fetching invited users:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load invited users. Please try again.',
        });
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchInvitedUsers();
    }
  }, [session, currentTab, toast]);

  // Handle page changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`?${params.toString()}`);
  };

  // Handle page size changes
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');
    params.set('size', newSize.toString());
    router.push(`?${params.toString()}`);
  };

  // Safe date formatting function
  const safeFormatDate = (dateValue: string | null | undefined) => {
    if (!dateValue) return 'N/A';
    
    try {
      // Make sure dateValue is a valid Date
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return format(date, 'PPP');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">Pending</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Accepted</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Calculate pagination values
  const totalPages = Math.ceil(invitedUsers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentPageUsers = invitedUsers.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Experts Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your expert team and their invitation status.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Experts</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold">{counts.total}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold">{counts.pending}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Experts</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold">{counts.accepted}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Experts List */}
      <Card>
        <CardHeader>
          <CardTitle>Expert Team Members</CardTitle>
          <CardDescription>
            View and manage your expert team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" onValueChange={setCurrentTab}>
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="all">All Experts</TabsTrigger>
                <TabsTrigger value="pending">Pending Invitations</TabsTrigger>
                <TabsTrigger value="accepted">Active Experts</TabsTrigger>
              </TabsList>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Rows per page:</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => handlePageSizeChange(parseInt(value))}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue>{pageSize}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20, 50].map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : invitedUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-gray-400" />
                <h3 className="mt-2 text-lg font-medium">No experts found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentTab === 'all' 
                    ? "You haven't added any experts to your team yet." 
                    : currentTab === 'pending' 
                      ? "You don't have any pending invitations." 
                      : "You don't have any active experts yet."}
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => document.getElementById('invite-experts-button')?.click()}
                >
                  Invite new experts
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {currentPageUsers.map((user: InvitedUser) => (
                  <div key={user.id} className="py-4 flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="rounded-full p-2 bg-primary/10">
                        {getStatusIcon(user.status)}
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {user.email}
                          {getStatusBadge(user.status)}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Invited on {safeFormatDate(user.invitedAt)}
                        </div>
                        {user.status === 'accepted' && user.acceptedAt && (
                          <div className="text-sm text-green-600 mt-1">
                            Accepted on {safeFormatDate(user.acceptedAt)}
                          </div>
                        )}
                        {user.status === 'pending' && user.expiresAt && (
                          <div className="text-sm text-yellow-600 mt-1">
                            Expires on {safeFormatDate(user.expiresAt)}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* We could add action buttons here in the future if needed */}
                    {user.status === 'pending' && (
                      <Button variant="outline" size="sm">
                        Resend Invitation
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 border-t p-4">
          <div className="flex justify-between w-full">
            <div className="text-sm text-muted-foreground">
              Showing {invitedUsers.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, invitedUsers.length)} of {counts.total} experts
            </div>
            {invitedUsers.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => document.getElementById('invite-experts-button')?.click()}
              >
                <Mail className="mr-2 h-4 w-4" />
                Invite More
              </Button>
            )}
          </div>
          
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href={`?page=${currentPage - 1}`}
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) handlePageChange(currentPage - 1);
                    }}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                
                {[...Array(totalPages)].map((_, index) => {
                  const pageNumber = index + 1;
                  if (
                    pageNumber === 1 ||
                    pageNumber === totalPages ||
                    (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                  ) {
                    return (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink
                          href={`?page=${pageNumber}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(pageNumber);
                          }}
                          isActive={pageNumber === currentPage}
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  } else if (
                    pageNumber === currentPage - 2 ||
                    pageNumber === currentPage + 2
                  ) {
                    return <PaginationEllipsis key={pageNumber} />;
                  }
                  return null;
                })}

                <PaginationItem>
                  <PaginationNext
                    href={`?page=${currentPage + 1}`}
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) handlePageChange(currentPage + 1);
                    }}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </CardFooter>
      </Card>
      
      {/* Hidden button for invitation modal trigger */}
      <button id="invite-experts-button" className="hidden"></button>
    </div>
  );
}