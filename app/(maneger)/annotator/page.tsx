'use client';
import { useEffect, useState, useCallback } from 'react';
import { getAllAnnotators } from '@/app/actions/annotator';
import { getReadyToWorkStats, getUserStats } from '@/app/actions/stats';
import { getNDAStatus } from '@/app/actions/onboardedExperts'; // Added for NDA functionality
import { SheetMenu } from '@/components/admin-panel/sheet-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format, parseISO, isValid } from 'date-fns';
import {
  CalendarIcon,
  Save,
  Search,
  FileDown,
  User,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  LineChart as LineChartIcon,
  CheckCircle2,
  CreditCard,
  Columns as ColumnsIcon,
  Download, // Added for NDA download
  CheckCircle, // Added for NDA status
  XCircle, // Added for NDA status
  Clock, // Added for NDA status
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import MultiCombobox from '@/components/ui/multi-combobox';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { domains, languages, locations } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { DeleteUserButton } from '@/components/DeleteUserButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DailyExpertsStats } from '@/components/ProjectManagerDashboard/DailyExpertsStats';
import { ActiveUsersChart } from '@/components/ProjectManagerDashboard/ActiveUsersChart';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

// --- Interfaces ---
interface User {
  _id: string;
  name: string;
  email: string;
  permission: string[];
  lastLogin: Date;
  createdAt: Date;
  domain: string[];
  lang: string[];
  location: string;
}

interface Option {
  value: string;
  label: string;
}

// Added NDA interfaces
interface NDAStatusData {
  uploaded: Array<{
    _id: string;
    name: string;
    email: string;
    ndaUrl: string;
  }>;
  notUploaded: Array<{
    _id: string;
    name: string;
    email: string;
  }>;
}

type Granularity = 'daily' | 'weekly' | 'monthly';

interface ChartDataPoint {
  date: string;
  newExperts: number;
  cumulativeExperts: number;
}
interface ReadyWorkDataPoint {
  name: 'Active' | 'Not Active';
  value: number;
}
interface StatError {
  error: string;
}

// --- Constants ---
const permissionMapping: { [key: string]: string } = {
  canReview: 'Can Review',
  noPermission: 'No Permission',
  'Can Review': 'canReview',
  'No Permission': 'noPermission',
};
const permissions = ['No Permission', 'Can Review'];
const permissionOptions: Option[] = permissions.map((p) => ({
  value: p,
  label: p,
}));
const PAGE_SIZES = [10, 20, 50, 100];
const domainOptions: Option[] = domains.map((d) => ({
  value: d.toLowerCase(),
  label: d,
}));
const languageOptions: Option[] = languages.map((l) => ({
  value: l.toLowerCase(),
  label: l,
}));
const locationOptions: Option[] = locations.map((l) => ({
  value: l.toLowerCase(),
  label: l.charAt(0).toUpperCase() + l.slice(1),
}));

// --- Column definitions for the visibility popover ---
const allColumns = [
  { id: 'name', label: 'Name', isToggleable: true },
  { id: 'email', label: 'Email', isToggleable: false },
  { id: 'permission', label: 'Permission', isToggleable: true },
  { id: 'domains', label: 'Domains', isToggleable: true },
  { id: 'languages', label: 'Languages', isToggleable: true },
  { id: 'location', label: 'Location', isToggleable: true },
  { id: 'lastLogin', label: 'Last Login', isToggleable: true },
  { id: 'joinedDate', label: 'Joined Date', isToggleable: true },
] as const;

// --- Component ---
export default function AnnotatorsPage() {
  // --- State ---
  const [annotators, setAnnotators] = useState<User[]>([]);
  const [isFetchingAnnotators, setIsFetchingAnnotators] = useState(true);
  const [onOpen, setOnOpen] = useState(false);
  const [id, setId] = useState('');
  const [filteredAnnotators, setFilteredAnnotators] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [reviewPermissionsState, setReviewPermissionsState] = useState<{
    [key: string]: string[];
  }>({});

  // --- NDA Download State (moved from OnboardedExpertsDashboard) ---
  const [ndaStatus, setNDAStatus] = useState<NDAStatusData | null>(null);
  const [ndaLoading, setNDALoading] = useState(false);
  const [ndaError, setNDAError] = useState<string | null>(null);
  const [selectedExpertsForDownload, setSelectedExpertsForDownload] = useState<
    string[]
  >([]);
  const [isNDADialogOpen, setIsNDADialogOpen] = useState(false);
  const [downloadingNDAs, setDownloadingNDAs] = useState(false);

  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isChartDialogOpen, setIsChartDialogOpen] = useState(false);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [chartGranularity, setChartGranularity] =
    useState<Granularity>('daily');
  const [isReadyChartDialogOpen, setIsReadyChartDialogOpen] = useState(false);
  const [readyWorkData, setReadyWorkData] = useState<ReadyWorkDataPoint[]>([]);
  const [isLoadingReadyChart, setIsLoadingReadyChart] = useState(false);
  const [readyChartError, setReadyChartError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  // --- Column visibility state ---
  const [columnVisibility, setColumnVisibility] = useState({
    name: true,
    permission: false,
    domains: false,
    languages: false,
    location: false,
    lastLogin: false,
    joinedDate: true,
  });

  // --- Handlers for Show/Hide All ---
  const handleShowAll = () => {
    setColumnVisibility({
      name: true,
      permission: true,
      domains: true,
      languages: true,
      location: true,
      lastLogin: true,
      joinedDate: true,
    });
  };

  const handleHideAll = () => {
    setColumnVisibility({
      name: false,
      permission: false,
      domains: false,
      languages: false,
      location: false,
      lastLogin: false,
      joinedDate: false,
    });
  };

  // --- Fetch Annotators ---
  const fetchAnnotators = useCallback(async () => {
    console.log('[AnnotatorsPage] Fetching annotators list...');
    setIsFetchingAnnotators(true);
    try {
      const rawData = await getAllAnnotators();
      if (typeof rawData !== 'string' || !rawData.trim().startsWith('[')) {
        throw new Error('Invalid data format for annotators.');
      }
      const data = JSON.parse(rawData);
      if (!Array.isArray(data)) {
        throw new Error('Expected an array of annotators.');
      }

      const transformedData = data.map((annotator: any): User => {
        let lastLoginDate = new Date(0);
        if (annotator.lastLogin) {
          const parsed = parseISO(annotator.lastLogin);
          if (isValid(parsed)) lastLoginDate = parsed;
        }

        let createdAtDate = new Date(0);
        const creationDate = annotator.created_at || annotator.createdAt;
        if (creationDate) {
          const parsed = parseISO(creationDate);
          if (isValid(parsed)) createdAtDate = parsed;
        }

        const currentPermissions = Array.isArray(annotator.permission)
          ? annotator.permission
          : ['noPermission'];
        const transformedPermissions = currentPermissions.map(
          (perm: string) => permissionMapping[perm] || 'No Permission'
        );

        return {
          _id: annotator._id || `unknown-${Math.random()}`,
          name: annotator.name || 'Unknown Name',
          email: annotator.email || 'Unknown Email',
          permission: transformedPermissions,
          lastLogin: lastLoginDate,
          createdAt: createdAtDate,
          domain: Array.isArray(annotator.domain) ? annotator.domain : [],
          lang: Array.isArray(annotator.lang) ? annotator.lang : [],
          location: annotator.location || '',
        };
      });

      setAnnotators(transformedData);

      const initialPermissionsState = transformedData.reduce(
        (acc: { [key: string]: string[] }, user: User) => {
          acc[user._id] = user.permission;
          return acc;
        },
        {}
      );
      setReviewPermissionsState(initialPermissionsState);
    } catch (error: any) {
      console.error('[AnnotatorsPage] Error fetching annotators:', error);
      toast({
        variant: 'destructive',
        title: 'Error Loading Experts',
        description: error.message || 'Failed to fetch annotators',
      });
    } finally {
      setIsFetchingAnnotators(false);
    }
  }, [toast]);

  // --- Fetch NDA Status (moved from OnboardedExpertsDashboard) ---
  const fetchNDAStatus = useCallback(async () => {
    try {
      setNDALoading(true);
      setNDAError(null);
      const response = await getNDAStatus();
      const data = JSON.parse(response);
      setNDAStatus(data);
    } catch (error: any) {
      console.error('Error fetching NDA status:', error);
      setNDAError(error.message || 'Failed to load NDA status');
    } finally {
      setNDALoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnotators();
    fetchNDAStatus();
  }, [fetchAnnotators, fetchNDAStatus]);

  // --- Filtering Logic ---
  useEffect(() => {
    const filtered = annotators.filter((user) => {
      const nameLower = user.name?.toLowerCase() || '';
      const emailLower = user.email?.toLowerCase() || '';
      const searchTermLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        nameLower.includes(searchTermLower) ||
        emailLower.includes(searchTermLower);

      const userDomainsLower =
        user.domain?.map((d) => d?.toLowerCase() ?? '') || [];
      const matchesDomain =
        selectedDomain.length === 0 ||
        selectedDomain.some((selected) =>
          userDomainsLower.includes(selected.toLowerCase())
        );

      const userLangsLower =
        user.lang?.map((l) => l?.toLowerCase() ?? '') || [];
      const matchesLanguage =
        selectedLanguage.length === 0 ||
        selectedLanguage.some((selected) =>
          userLangsLower.includes(selected.toLowerCase())
        );

      const userLocationLower = user.location?.toLowerCase() || '';
      const matchesLocation =
        selectedLocation.length === 0 ||
        selectedLocation.some(
          (selected) => userLocationLower === selected.toLowerCase()
        );

      return (
        matchesSearch && matchesDomain && matchesLanguage && matchesLocation
      );
    });

    setFilteredAnnotators(filtered);
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [
    searchTerm,
    selectedDomain,
    selectedLanguage,
    selectedLocation,
    annotators,
    currentPage,
  ]);

  // --- Fetch Chart Data ---
  const fetchChartData = useCallback(async () => {
    setIsLoadingChart(true);
    setChartError(null);

    try {
      const filters = {
        domain: selectedDomain,
        lang: selectedLanguage,
        location: selectedLocation,
      };

      const statsJson = await getUserStats(filters, chartGranularity);
      const stats = JSON.parse(statsJson);
      if (stats.error) throw new Error(stats.error);
      if (!Array.isArray(stats))
        throw new Error('Expected an array for chart data.');
      setChartData(stats);
    } catch (error: any) {
      setChartError(error.message || 'Could not load chart data.');
    } finally {
      setIsLoadingChart(false);
    }
  }, [selectedDomain, selectedLanguage, selectedLocation, chartGranularity]);

  useEffect(() => {
    if (isChartDialogOpen) {
      fetchChartData();
    }
  }, [isChartDialogOpen, fetchChartData]);

  const fetchReadyWorkData = useCallback(async () => {
    setIsLoadingReadyChart(true);
    setReadyChartError(null);

    try {
      const filters = {
        domain: selectedDomain,
        lang: selectedLanguage,
        location: selectedLocation,
      };
      const statsJson = await getReadyToWorkStats(filters);
      const stats = JSON.parse(statsJson);
      if (stats.error) throw new Error(stats.error);
      if (!Array.isArray(stats))
        throw new Error('Expected an array for readiness data.');

      setReadyWorkData(stats);
    } catch (error: any) {
      setReadyChartError(error.message || 'Could not load readiness data.');
    } finally {
      setIsLoadingReadyChart(false);
    }
  }, [selectedDomain, selectedLanguage, selectedLocation]);

  useEffect(() => {
    if (isReadyChartDialogOpen) {
      fetchReadyWorkData();
    }
  }, [isReadyChartDialogOpen, fetchReadyWorkData]);

  // --- Handlers ---
  const handleViewDetails = (user: User) => {
    router.push(`/annotator/profileView/${user._id}`);
  };

  const savePermissions = async (userId: string) => {
    const currentPermissions = reviewPermissionsState[userId] || [
      'No Permission',
    ];
    const backendPermissions = currentPermissions
      .filter((permission) => permission !== 'No Permission')
      .map((permission) => permissionMapping[permission] || permission);

    try {
      const response = await fetch(`/api/annotator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          permission: backendPermissions,
        }),
      });
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: 'Failed to update permissions.' }));
        throw new Error(errorData.message);
      }
      const data = await response.json();
      toast({
        variant: 'default',
        title: 'Success!',
        description: data.message || 'Permissions updated.',
      });
      fetchAnnotators();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: error.message,
      });
    }
  };

  const handleExport = (exportFormat: string) => {
    const dataToExport = filteredAnnotators.map((user) => ({
      name: user.name,
      email: user.email,
      permissions: user.permission.join(', '),
      domains: user.domain?.join(', ') || '',
      languages: user.lang?.join(', ') || '',
      location: user.location || '',
      lastLogin:
        isValid(user.lastLogin) && user.lastLogin.getFullYear() > 1970
          ? format(user.lastLogin, 'PPPpp')
          : 'N/A',
      joinedDate:
        isValid(user.createdAt) && user.createdAt.getFullYear() > 1970
          ? format(user.createdAt, 'PPPpp')
          : 'N/A',
    }));
    const headers = [
      'name',
      'email',
      'permissions',
      'domains',
      'languages',
      'location',
      'lastLogin',
      'joinedDate',
    ];

    try {
      if (exportFormat === 'json') {
        const dataStr = JSON.stringify(dataToExport, null, 2);
        const dataUri =
          'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const link = document.createElement('a');
        link.href = dataUri;
        link.download = 'annotators.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const csvContent = [
          headers.join(','),
          ...dataToExport.map((row) =>
            headers
              .map(
                (header) =>
                  `"${String(row[header as keyof typeof row] ?? '').replace(/"/g, '""')}"`
              )
              .join(',')
          ),
        ].join('\n');
        const blob = new Blob([csvContent], {
          type: 'text/csv;charset=utf-8;',
        });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'annotators.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      }

      setIsExportDialogOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Could not generate the export file.',
      });
    }
  };

  // --- NDA Download Handlers (moved from OnboardedExpertsDashboard) ---
  const handleDownloadNDAs = async () => {
    try {
      setDownloadingNDAs(true);

      const expertIds =
        selectedExpertsForDownload.length > 0
          ? selectedExpertsForDownload
          : undefined;

      const response = await fetch('/api/dashboard/download-ndas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expertIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Download failed');
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Team_NDAs_${format(new Date(), 'yyyy-MM-dd')}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Success',
        description: 'NDAs downloaded successfully',
      });
      setIsNDADialogOpen(false);
      setSelectedExpertsForDownload([]);
    } catch (error: any) {
      console.error('Error downloading NDAs:', error);
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: error.message || 'Failed to download NDAs',
      });
    } finally {
      setDownloadingNDAs(false);
    }
  };

  const handleExpertSelection = (expertId: string, checked: boolean) => {
    if (checked) {
      setSelectedExpertsForDownload((prev) => [...prev, expertId]);
    } else {
      setSelectedExpertsForDownload((prev) =>
        prev.filter((id) => id !== expertId)
      );
    }
  };

  const handleSelectAllNDAs = (selectAll: boolean) => {
    if (selectAll && ndaStatus) {
      setSelectedExpertsForDownload(
        ndaStatus.uploaded.map((expert) => expert._id)
      );
    } else {
      setSelectedExpertsForDownload([]);
    }
  };

  const handleUserDeleted = (userId: string) => {
    fetchAnnotators();
    toast({
      variant: 'default',
      title: 'Success',
      description: 'Expert removed.',
    });
  };

  const handleStripePayment = (expertId: string) => {
    router.push(`/pay/${expertId}`);
  };

  const totalPages = Math.ceil(filteredAnnotators.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentAnnotators = filteredAnnotators.slice(startIndex, endIndex);

  return (
    <div className='min-h-screen'>
      <header className='bg-white shadow-sm sticky top-0 z-10'>
        <div className='max-w-7xl mx-auto py-4 px-4 flex justify-between items-center'>
          <h1 className='text-2xl font-semibold text-gray-900'>Experts</h1>
          <div className='flex items-center gap-2 sm:gap-3'>
            <Dialog
              open={isReadyChartDialogOpen}
              onOpenChange={setIsReadyChartDialogOpen}
            >
              <DialogTrigger asChild>
                <Button variant='outline' size='sm'>
                  <CheckCircle2 className='h-4 w-4 mr-1 sm:mr-2' />
                  <span className='hidden sm:inline'>Active Users</span>
                  <span className='sm:hidden'>Ready?</span>
                </Button>
              </DialogTrigger>
              <DialogContent className='max-w-lg'>
                <DialogHeader>
                  <DialogTitle>Active and Inactive Users</DialogTitle>
                  <DialogDescription>
                    Proportion of filtered experts marked as "Ready to Work".
                  </DialogDescription>
                </DialogHeader>
                <div className='mt-4 min-h-[350px] flex items-center justify-center'>
                  <ActiveUsersChart
                    data={readyWorkData}
                    isLoading={isLoadingReadyChart}
                    error={readyChartError}
                  />
                </div>
              </DialogContent>
            </Dialog>

            <Dialog
              open={isChartDialogOpen}
              onOpenChange={setIsChartDialogOpen}
            >
              <DialogTrigger asChild>
                <Button variant='outline' size='sm'>
                  <LineChartIcon className='h-4 w-4 mr-1 sm:mr-2' />
                  <span className='hidden sm:inline'>Stats</span>
                  <span className='sm:hidden'>Stats</span>
                </Button>
              </DialogTrigger>
              <DialogContent className='max-w-3xl sm:max-w-4xl'>
                <DialogHeader>
                  <DialogTitle>Expert Registration Trend</DialogTitle>
                  <DialogDescription>
                    New and cumulative experts over time (based on table
                    filters).
                  </DialogDescription>
                </DialogHeader>
                <Tabs
                  value={chartGranularity}
                  onValueChange={(value) =>
                    setChartGranularity(value as Granularity)
                  }
                  className='w-full mt-4'
                >
                  <TabsList className='grid w-full grid-cols-3'>
                    <TabsTrigger value='daily'>Daily</TabsTrigger>
                    <TabsTrigger value='weekly'>Weekly</TabsTrigger>
                    <TabsTrigger value='monthly'>Monthly</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className='mt-4 min-h-[400px] flex items-center justify-center'>
                  <DailyExpertsStats
                    data={chartData}
                    isLoading={isLoadingChart}
                    error={chartError}
                    granularity={chartGranularity}
                  />
                </div>
              </DialogContent>
            </Dialog>

            <Dialog
              open={isExportDialogOpen}
              onOpenChange={setIsExportDialogOpen}
            >
              <DialogTrigger asChild>
                <Button variant='outline' size='sm'>
                  <FileDown className='h-4 w-4 mr-1 sm:mr-2' />
                  <span className='hidden sm:inline'>Export</span>
                  <span className='sm:hidden'>Export</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Export Experts</DialogTitle>
                  <DialogDescription>
                    Choose format (reflects current table filters).
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className='justify-center sm:justify-end gap-2'>
                  <Button variant='outline' onClick={() => handleExport('csv')}>
                    Export as CSV
                  </Button>
                  <Button onClick={() => handleExport('json')}>
                    Export as JSON
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* NDA Download Dialog (moved from OnboardedExpertsDashboard) */}
            <Dialog open={isNDADialogOpen} onOpenChange={setIsNDADialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className='bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all'
                  size='sm'
                >
                  <Download className='w-4 h-4 mr-1 sm:mr-2' />
                  <span className='hidden sm:inline'>Download NDAs</span>
                  <span className='sm:hidden'>NDAs</span>
                </Button>
              </DialogTrigger>
              <DialogContent className='max-w-2xl max-h-[80vh] overflow-hidden flex flex-col'>
                <DialogHeader className='flex-shrink-0'>
                  <DialogTitle>Download NDA Documents</DialogTitle>
                  <DialogDescription>
                    Select experts whose NDAs you want to download. All selected
                    NDAs will be packaged in a ZIP file.
                  </DialogDescription>
                </DialogHeader>

                <div className='flex-1 overflow-y-auto'>
                  {ndaLoading ? (
                    <div className='flex items-center justify-center py-8'>
                      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
                    </div>
                  ) : ndaStatus ? (
                    <div className='space-y-4'>
                      {/* Summary */}
                      <div className='bg-gray-50 p-4 rounded-lg flex-shrink-0'>
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center space-x-4'>
                            <div className='flex items-center space-x-2'>
                              <CheckCircle className='w-5 h-5 text-green-600' />
                              <span className='font-medium'>
                                {ndaStatus.uploaded.length} NDAs uploaded
                              </span>
                            </div>
                            <div className='flex items-center space-x-2'>
                              <XCircle className='w-5 h-5 text-red-600' />
                              <span className='font-medium'>
                                {ndaStatus.notUploaded.length} pending
                              </span>
                            </div>
                          </div>
                          <div className='flex space-x-2'>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => handleSelectAllNDAs(true)}
                              disabled={ndaStatus.uploaded.length === 0}
                            >
                              Select All
                            </Button>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => handleSelectAllNDAs(false)}
                            >
                              Select None
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Experts with NDAs */}
                      {ndaStatus.uploaded.length > 0 ? (
                        <div className='space-y-2'>
                          <h4 className='font-medium text-gray-900'>
                            Available NDAs:
                          </h4>
                          <div className='max-h-48 overflow-y-auto space-y-2'>
                            {ndaStatus.uploaded.map((expert) => (
                              <div
                                key={expert._id}
                                className='flex items-center space-x-3 p-2 hover:bg-gray-50 rounded'
                              >
                                <Checkbox
                                  id={expert._id}
                                  checked={selectedExpertsForDownload.includes(
                                    expert._id
                                  )}
                                  onCheckedChange={(checked) =>
                                    handleExpertSelection(
                                      expert._id,
                                      checked as boolean
                                    )
                                  }
                                />
                                <label
                                  htmlFor={expert._id}
                                  className='flex-1 cursor-pointer'
                                >
                                  <div className='font-medium'>
                                    {expert.name}
                                  </div>
                                  <div className='text-sm text-gray-500'>
                                    {expert.email}
                                  </div>
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className='text-center py-4 text-gray-500'>
                          No NDAs have been uploaded yet.
                        </div>
                      )}

                      {/* Experts without NDAs */}
                      {ndaStatus.notUploaded.length > 0 && (
                        <div className='space-y-2'>
                          <h4 className='font-medium text-red-600'>
                            Pending NDAs:
                          </h4>
                          <div className='bg-red-50 p-3 rounded max-h-32 overflow-y-auto'>
                            {ndaStatus.notUploaded.map((expert) => (
                              <div
                                key={expert._id}
                                className='text-sm text-red-700'
                              >
                                {expert.name} ({expert.email})
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className='text-center py-4 text-red-500'>
                      Failed to load NDA status
                    </div>
                  )}
                </div>

                <div className='flex justify-end space-x-2 pt-4 border-t flex-shrink-0'>
                  <Button
                    variant='outline'
                    onClick={() => setIsNDADialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDownloadNDAs}
                    disabled={
                      selectedExpertsForDownload.length === 0 || downloadingNDAs
                    }
                    className='bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                  >
                    {downloadingNDAs ? (
                      <>
                        <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className='w-4 h-4 mr-2' />
                        Download Selected ({selectedExpertsForDownload.length})
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant='outline' size='sm'>
                  <ColumnsIcon className='h-4 w-4 mr-1 sm:mr-2' />
                  <span className='hidden sm:inline'>Columns</span>
                  <span className='sm:hidden'>Columns</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-80' align='end'>
                <div className='grid gap-4'>
                  <div className='space-y-1'>
                    <h4 className='font-medium leading-none'>
                      Column Visibility
                    </h4>
                    <p className='text-sm text-muted-foreground'>
                      Select the columns to display.
                    </p>
                  </div>
                  <div className='grid grid-cols-2 gap-2'>
                    {allColumns.map((column) => (
                      <div
                        key={column.id}
                        className='flex items-center space-x-2'
                      >
                        <Checkbox
                          id={column.id}
                          checked={
                            column.isToggleable
                              ? columnVisibility[
                                  column.id as keyof typeof columnVisibility
                                ]
                              : true
                          }
                          disabled={!column.isToggleable}
                          onCheckedChange={(value) => {
                            if (column.isToggleable) {
                              setColumnVisibility((prev) => ({
                                ...prev,
                                [column.id]: !!value,
                              }));
                            }
                          }}
                        />
                        <Label
                          htmlFor={column.id}
                          className='text-sm font-normal'
                        >
                          {column.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <div className='flex items-center space-x-2 mt-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      className='w-full'
                      onClick={handleShowAll}
                    >
                      Show All
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      className='w-full'
                      onClick={handleHideAll}
                    >
                      Hide All
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <SheetMenu />
          </div>
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-2 py-6'>
        <div className='mb-6 grid grid-cols-1 md:grid-cols-4 gap-4'>
          <div className='relative md:col-span-1'>
            <Input
              type='text'
              placeholder='Search name/email...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='pl-9 text-sm'
            />
            <Search className='absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4' />
          </div>
          <MultiCombobox
            options={domainOptions}
            value={selectedDomain}
            onChange={setSelectedDomain}
            placeholder='Filter Domain'
          />
          <MultiCombobox
            options={languageOptions}
            value={selectedLanguage}
            onChange={setSelectedLanguage}
            placeholder='Filter Language'
          />
          <MultiCombobox
            options={locationOptions}
            value={selectedLocation}
            onChange={setSelectedLocation}
            placeholder='Filter Location'
          />
        </div>

        {isFetchingAnnotators ? (
          <div className='text-center py-10 text-gray-500'>
            Loading experts...
          </div>
        ) : filteredAnnotators.length === 0 ? (
          <div className='text-center py-10'>
            <h2 className='text-xl font-semibold'>No Experts Match Filters</h2>
            <p className='mt-2 text-gray-600'>
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          <div className='bg-white shadow-md rounded-lg overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  {columnVisibility.name && <TableHead>Name</TableHead>}
                  <TableHead>Email</TableHead>
                  {columnVisibility.permission && (
                    <TableHead>Permission</TableHead>
                  )}
                  {columnVisibility.domains && <TableHead>Domains</TableHead>}
                  {columnVisibility.languages && (
                    <TableHead>Languages</TableHead>
                  )}
                  {columnVisibility.location && <TableHead>Location</TableHead>}
                  {columnVisibility.lastLogin && (
                    <TableHead>Last Login</TableHead>
                  )}
                  {columnVisibility.joinedDate && (
                    <TableHead>Joined Date</TableHead>
                  )}
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentAnnotators.map((user) => {
                  const localPerm = reviewPermissionsState[user._id] || [
                    'No Permission',
                  ];
                  const lastLoginValid =
                    isValid(user.lastLogin) &&
                    user.lastLogin.getFullYear() > 1970;
                  const joinedDateValid =
                    isValid(user.createdAt) &&
                    user.createdAt.getFullYear() > 1970;
                  return (
                    <TableRow
                      key={user._id}
                      className='hover:bg-gray-50 text-sm'
                    >
                      {columnVisibility.name && (
                        <TableCell className='font-medium whitespace-nowrap'>
                          {user.name || 'N/A'}
                        </TableCell>
                      )}
                      <TableCell className='whitespace-nowrap'>
                        {user.email || 'N/A'}
                      </TableCell>
                      {columnVisibility.permission && (
                        <TableCell>
                          <MultiCombobox
                            options={permissionOptions}
                            value={localPerm}
                            onChange={(v: string[]) =>
                              setReviewPermissionsState((p) => ({
                                ...p,
                                [user._id]: v,
                              }))
                            }
                            placeholder='Select'
                          />
                        </TableCell>
                      )}
                      {columnVisibility.domains && (
                        <TableCell>
                          <div className='flex flex-wrap gap-1 max-w-[100px]'>
                            {user.domain?.length > 0 ? (
                              user.domain.map((d, i) => (
                                <Badge
                                  key={i}
                                  variant='secondary'
                                  className='text-xs px-1.5 py-0.5'
                                >
                                  {d}
                                </Badge>
                              ))
                            ) : (
                              <span className='text-xs text-gray-500 italic'>
                                None
                              </span>
                            )}
                          </div>
                        </TableCell>
                      )}
                      {columnVisibility.languages && (
                        <TableCell>
                          <div className='flex flex-wrap gap-1 max-w-[120px]'>
                            {user.lang?.length > 0 ? (
                              user.lang.map((l, i) => (
                                <Badge
                                  key={i}
                                  variant='outline'
                                  className='text-xs px-1.5 py-0.5'
                                >
                                  {l}
                                </Badge>
                              ))
                            ) : (
                              <span className='text-xs text-gray-500 italic'>
                                None
                              </span>
                            )}
                          </div>
                        </TableCell>
                      )}
                      {columnVisibility.location && (
                        <TableCell className='font-medium whitespace-nowrap'>
                          {user.location ? (
                            user.location.charAt(0).toUpperCase() +
                            user.location.slice(1)
                          ) : (
                            <span className='text-xs text-gray-500 italic'>
                              N/A
                            </span>
                          )}
                        </TableCell>
                      )}
                      {columnVisibility.lastLogin && (
                        <TableCell className='whitespace-nowrap'>
                          {lastLoginValid ? (
                            <div className='flex items-center text-gray-600'>
                              <CalendarIcon className='mr-1.5 h-3.5 w-3.5 shrink-0' />
                              {format(user.lastLogin, 'PP p')}
                            </div>
                          ) : (
                            <span className='text-xs text-gray-500 italic'>
                              Never
                            </span>
                          )}
                        </TableCell>
                      )}
                      {columnVisibility.joinedDate && (
                        <TableCell className='whitespace-nowrap'>
                          {joinedDateValid ? (
                            format(user.createdAt, 'PP')
                          ) : (
                            <span className='text-xs text-gray-500 italic'>
                              N/A
                            </span>
                          )}
                        </TableCell>
                      )}

                      <TableCell className='text-right'>
                        <div className='flex items-center justify-end space-x-1'>
                          <Button
                            size='icon'
                            variant='ghost'
                            className='h-7 w-7 text-green-600 hover:text-green-700'
                            onClick={() => handleStripePayment(user._id)}
                            title='Pay Expert'
                          >
                            <CreditCard className='h-4 w-4' />
                          </Button>
                          <Button
                            size='icon'
                            variant='ghost'
                            className='h-7 w-7 text-blue-600 hover:text-blue-700'
                            onClick={() => savePermissions(user._id)}
                            title='Save'
                          >
                            <Save className='h-4 w-4' />
                          </Button>
                          <Button
                            size='icon'
                            variant='ghost'
                            className='h-7 w-7'
                            onClick={() => handleViewDetails(user)}
                            title='View'
                          >
                            <User className='h-4 w-4' />
                          </Button>
                          <DeleteUserButton
                            userId={user._id}
                            userName={user.name}
                            userEmail={user.email}
                            onDeleted={() => handleUserDeleted(user._id)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className='flex items-center justify-between p-3 border-t text-sm'>
              <div className='flex items-center space-x-3'>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(v) => {
                    setPageSize(Number(v));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className='w-[110px] h-8 text-xs'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZES.map((s) => (
                      <SelectItem
                        key={s}
                        value={s.toString()}
                        className='text-xs'
                      >
                        {s} per page
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className='text-gray-600'>
                  Showing {filteredAnnotators.length > 0 ? startIndex + 1 : 0}-
                  {Math.min(endIndex, filteredAnnotators.length)} of{' '}
                  {filteredAnnotators.length}
                </div>
              </div>
              <div className='flex items-center space-x-1.5'>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-8 px-2'
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || totalPages === 0}
                >
                  <ChevronLeft className='h-4 w-4' />
                </Button>
                <div className='text-gray-600 font-medium'>
                  Page {filteredAnnotators.length > 0 ? currentPage : 0} of{' '}
                  {totalPages > 0 ? totalPages : 0}
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-8 px-2'
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  <ChevronRight className='h-4 w-4' />
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
