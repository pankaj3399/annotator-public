'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  PlusCircle,
} from 'lucide-react';
import Loader from '@/components/ui/NewLoader/Loader';
import { SheetMenu } from '@/components/admin-panel/sheet-menu';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { isAdmin, isProjectManager } from '@/lib/userRoles';

interface BenchmarkProposal {
  _id: string;
  name: string;
  description: string;
  domain: 'Math' | 'Healthcare' | 'Language' | 'Multimodal' | 'Other';
  customDomain?: string;
  evaluationMethodology: string;
  intendedPurpose: string;
  datasetUrl?: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  reviewNotes?: string;
  reviewedBy?: string;
  user: {
    name: string;
    _id: string;
    email: string;
  };
  created_at: string;
  submitted_at?: string;
  reviewed_at?: string;
  project: string;
}

interface CustomSession {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    permission?: string[];
  } | null;
}

export default function BenchmarkProposalsPage() {
  const [proposals, setProposals] = useState<BenchmarkProposal[]>([]);
  const [selectedProposal, setSelectedProposal] =
    useState<BenchmarkProposal | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewPermissions, setReviewPermissions] = useState<
    Record<string, boolean>
  >({});

  const { data: session } = useSession() as { data: CustomSession | null };
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (session) {
      fetchProposals();
    }
  }, [session, activeTab]);

  const fetchProposals = async () => {
    try {
      const response = await fetch(`/api/benchmark-proposals`);
      if (!response.ok) throw new Error('Failed to fetch proposals');
      const data = await response.json();
      if (data.success) {
        setProposals(data.proposals);
        // After fetching proposals, check permissions for each one
        updateReviewPermissions(data.proposals);
      } else {
        throw new Error(data.error || 'Failed to fetch proposals');
      }
    } catch (error) {
      toast({
        title: 'Error fetching proposals',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to load benchmark proposals',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const checkReviewPermission = async (projectId: string) => {
    if (!session?.user) return false;

    const user = session.user;
    if (isProjectManager(user.role) || isAdmin(user.role)) {
      return true;
    }

    try {
      const response = await fetch(
        `/api/tasks/reviewer-check?projectId=${projectId}&userId=${user.id}`
      );
      if (!response.ok) throw new Error('Failed to check reviewer status');
      const data = await response.json();
      return data.isReviewer;
    } catch (error) {
      console.error('Error checking reviewer status:', error);
      return false;
    }
  };

  const updateReviewPermissions = async (
    proposalsList: BenchmarkProposal[]
  ) => {
    const permissions: Record<string, boolean> = {};
    for (const proposal of proposalsList) {
      permissions[proposal.project] = await checkReviewPermission(
        proposal.project
      );
    }
    setReviewPermissions(permissions);
  };

  const handleReviewSubmit = async (status: 'approved' | 'rejected') => {
    if (!selectedProposal || !session?.user) return;

    if (
      !reviewPermissions[selectedProposal.project] &&
      !isAdmin(session.user.role)
    ) {
      toast({
        title: 'Permission Denied',
        description: 'You do not have permission to review proposals',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch(`/api/benchmark-proposals`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proposalId: selectedProposal._id,
          status,
          reviewNotes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update proposal');
      }

      const data = await response.json();

      if (data.success) {
        setProposals(
          proposals.map((p) =>
            p._id === selectedProposal._id ? data.proposal : p
          )
        );

        toast({
          title: 'Review submitted',
          description: `Proposal has been ${status}`,
        });

        setIsReviewDialogOpen(false);
        setSelectedProposal(null);
        setReviewNotes('');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to submit review',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: BenchmarkProposal['status']) => {
    const statusConfig = {
      draft: { color: 'bg-gray-200 text-gray-700', icon: Clock },
      submitted: { color: 'bg-blue-200 text-blue-700', icon: Clock },
      under_review: {
        color: 'bg-yellow-200 text-yellow-700',
        icon: AlertCircle,
      },
      approved: { color: 'bg-green-200 text-green-700', icon: CheckCircle },
      rejected: { color: 'bg-red-200 text-red-700', icon: XCircle },
      orphaned: { color: 'bg-red-200 text-red-700', icon: XCircle },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className='h-4 w-4' />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  if (!session) {
    return <Loader />;
  }

  if (session?.user?.role === 'annotator') router.push('/tasks');

  const filteredProposals = proposals.filter((proposal) => {
    const matchesSearch =
      proposal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proposal.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proposal.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proposal.user?.name.toLowerCase().includes(searchQuery.toLowerCase());

    switch (activeTab) {
      case 'pending':
        return (
          (proposal.status === 'submitted' || proposal.status === 'draft') &&
          matchesSearch
        );
      case 'reviewed':
        return (
          ['approved', 'rejected'].includes(proposal.status) && matchesSearch
        );
      default:
        return matchesSearch;
    }
  });

  return (
    <div className='min-h-screen'>
      <header className='bg-white'>
        <div className='max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center'>
          <h1 className='text-3xl font-bold text-gray-900 tracking-tight'>
            Benchmark Proposals
          </h1>
          <SheetMenu />
        </div>
      </header>

      <main className='max-w-7xl mx-auto sm:px-6 lg:px-8'>
        <div className='mb-6'>
          <div className='flex items-center gap-4 mb-4'>
            <div className='relative flex-1'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4' />
              <Input
                type='text'
                placeholder='Search proposals...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='pl-10'
              />
            </div>
            <Button onClick={() => router.push('/benchmark-proposals/new')}>
              <PlusCircle className='mr-2 h-4 w-4' /> Create Proposal
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
          <TabsList>
            <TabsTrigger value='all'>All Proposals</TabsTrigger>
            <TabsTrigger value='pending'>Pending Review</TabsTrigger>
            <TabsTrigger value='reviewed'>Reviewed</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {loading ? (
              <div className='flex justify-center py-8'>
                <Loader />
              </div>
            ) : filteredProposals.length === 0 ? (
              <div className='text-center py-8 text-gray-500'>
                No proposals found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className='text-right'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProposals.map((proposal) => (
                    <TableRow key={proposal._id}>
                      <TableCell className='font-medium'>
                        {proposal.name}
                      </TableCell>
                      <TableCell>
                        {proposal.domain}
                        {proposal.customDomain
                          ? ` - ${proposal.customDomain}`
                          : ''}
                      </TableCell>
                      <TableCell>{proposal.user?.name}</TableCell>
                      <TableCell>
                        {format(parseISO(proposal.created_at), 'PPP')}
                      </TableCell>
                      <TableCell>{getStatusBadge(proposal.status)}</TableCell>
                      <TableCell>
                        <div className='flex justify-end gap-2'>
                          {reviewPermissions[proposal.project] &&
                            (proposal.status === 'submitted' ||
                              proposal.status === 'draft') && (
                              <Button
                                variant='default'
                                size='sm'
                                onClick={() => {
                                  setSelectedProposal(proposal);
                                  setIsReviewDialogOpen(true);
                                }}
                              >
                                Review
                              </Button>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
          <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
            <DialogHeader>
              <DialogTitle>
                {reviewPermissions[selectedProposal?.project ?? ''] &&
                (selectedProposal?.status === 'submitted' ||
                  selectedProposal?.status === 'draft')
                  ? 'Review Proposal'
                  : 'View Proposal'}
              </DialogTitle>
            </DialogHeader>

            {selectedProposal && (
              <div className='space-y-6'>
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedProposal.name}</CardTitle>
                    <CardDescription>
                      Submitted by {selectedProposal.user?.name} on{' '}
                      {format(parseISO(selectedProposal.created_at), 'PPP')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <div>
                      <h3 className='font-semibold mb-1'>Domain</h3>
                      <p>
                        {selectedProposal.domain}
                        {selectedProposal.customDomain
                          ? ` - ${selectedProposal.customDomain}`
                          : ''}
                      </p>
                    </div>
                    <div>
                      <h3 className='font-semibold mb-1'>Description</h3>
                      <p className='text-gray-600'>
                        {selectedProposal.description}
                      </p>
                    </div>
                    <div>
                      <h3 className='font-semibold mb-1'>
                        Evaluation Methodology
                      </h3>
                      <p className='text-gray-600'>
                        {selectedProposal.evaluationMethodology}
                      </p>
                    </div>
                    <div>
                      <h3 className='font-semibold mb-1'>Intended Purpose</h3>
                      <p className='text-gray-600'>
                        {selectedProposal.intendedPurpose}
                      </p>
                    </div>
                    {selectedProposal.datasetUrl && (
                      <div>
                        <h3 className='font-semibold mb-1'>Dataset URL</h3>
                        <p className='text-blue-600 hover:underline'>
                          <a
                            href={selectedProposal.datasetUrl}
                            target='_blank'
                            rel='noopener noreferrer'
                          >
                            {selectedProposal.datasetUrl}
                          </a>
                        </p>
                      </div>
                    )}
                    {selectedProposal.reviewNotes && (
                      <div>
                        <h3 className='font-semibold mb-1'>
                          Previous Review Notes
                        </h3>
                        <p className='text-gray-600'>
                          {selectedProposal.reviewNotes}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {reviewPermissions[selectedProposal.project] &&
                  (selectedProposal.status === 'submitted' ||
                    selectedProposal.status === 'draft') && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Review Decision</CardTitle>
                      </CardHeader>
                      <CardContent className='space-y-4'>
                        <div className='space-y-2'>
                          <label className='text-sm font-medium'>
                            Review Comments
                          </label>
                          <Textarea
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            placeholder='Add your review comments here...'
                            className='min-h-[100px]'
                            required
                          />
                        </div>

                        <div className='flex justify-end gap-2 pt-4'>
                          <Button
                            variant='outline'
                            onClick={() => {
                              setIsReviewDialogOpen(false);
                              setReviewNotes('');
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant='destructive'
                            onClick={() => handleReviewSubmit('rejected')}
                            disabled={!reviewNotes.trim()}
                          >
                            Reject
                          </Button>
                          <Button
                            variant='default'
                            onClick={() => handleReviewSubmit('approved')}
                            disabled={!reviewNotes.trim()}
                          >
                            Approve
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
