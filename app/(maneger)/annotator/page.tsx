'use client';
import { useEffect, useState, useCallback } from 'react';
import { getAllAnnotators } from '@/app/actions/annotator';
import { getReadyToWorkStats, getUserStats } from '@/app/actions/stats';
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
import { format, parseISO, isValid } from 'date-fns'; // Added isValid
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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import MultiCombobox from '@/components/ui/multi-combobox';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';

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
import { Transfer } from '@/components/transferDialog';
import { DeleteUserButton } from '@/components/DeleteUserButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DailyExpertsStats } from '@/components/ProjectManagerDashboard/DailyExpertsStats'; // Using this based on your last code
import { ActiveUsersChart } from '@/components/ProjectManagerDashboard/ActiveUsersChart';

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

// --- Component ---
export default function AnnotatorsPage() {
  // --- State ---
  const [annotators, setAnnotators] = useState<User[]>([]);
  const [isFetchingAnnotators, setIsFetchingAnnotators] = useState(true); // Loading state for table
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

  // --- Fetch Annotators ---
  const fetchAnnotators = useCallback(async () => {
    console.log('[AnnotatorsPage] Fetching annotators list...');
    setIsFetchingAnnotators(true);
    try {
      const rawData = await getAllAnnotators();
      if (typeof rawData !== 'string' || !rawData.trim().startsWith('[')) {
        console.error(
          '[AnnotatorsPage] Invalid raw data from getAllAnnotators:',
          rawData
        );
        throw new Error('Invalid data format for annotators.');
      }
      const data = JSON.parse(rawData);
      if (!Array.isArray(data)) {
        console.error(
          '[AnnotatorsPage] Parsed annotator data is not an array:',
          data
        );
        throw new Error('Expected an array of annotators.');
      }
      console.log(
        `[AnnotatorsPage] Received ${data.length} raw annotator records.`
      );

      const transformedData = data.map((annotator: any): User => {
        // Ensure dates are Date objects, provide defaults for missing/invalid values
        let lastLoginDate = new Date(0);
        if (annotator.lastLogin) {
          const parsed = parseISO(annotator.lastLogin);
          if (isValid(parsed)) lastLoginDate = parsed;
          else
            console.warn(
              `[AnnotatorsPage] Invalid lastLogin date format for user ${annotator._id}: ${annotator.lastLogin}`
            );
        }

        let createdAtDate = new Date(0);
        if (annotator.createdAt) {
          const parsed = parseISO(annotator.createdAt);
          if (isValid(parsed)) createdAtDate = parsed;
          else
            console.warn(
              `[AnnotatorsPage] Invalid createdAt date format for user ${annotator._id}: ${annotator.createdAt}`
            );
        }

        const currentPermissions = Array.isArray(annotator.permission)
          ? annotator.permission
          : ['noPermission'];
        const transformedPermissions = currentPermissions.map(
          (perm: string) => permissionMapping[perm] || 'No Permission'
        );

        return {
          _id: annotator._id || `unknown-${Math.random()}`, // Provide fallback ID if missing
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
      console.log(
        `[AnnotatorsPage] Transformed ${transformedData.length} annotators.`
      );

      const initialPermissionsState = transformedData.reduce(
        (acc: { [key: string]: string[] }, user: User) => {
          acc[user._id] = user.permission;
          return acc;
        },
        {}
      );
      setReviewPermissionsState(initialPermissionsState);
    } catch (error: any) {
      console.error(
        '[AnnotatorsPage] Error fetching/processing annotators:',
        error
      );
      const description =
        error instanceof SyntaxError
          ? 'Failed to parse annotator data. Check server logs.'
          : error.message || 'Failed to fetch annotators';
      toast({
        variant: 'destructive',
        title: 'Error Loading Experts',
        description,
      });
      setAnnotators([]); // Clear on error
      setFilteredAnnotators([]);
    } finally {
      setIsFetchingAnnotators(false); // Done loading
    }
  }, [toast]); // Add toast as dependency

  useEffect(() => {
    fetchAnnotators();
  }, [fetchAnnotators]); // Depend on the memoized fetchAnnotators

  // --- Filtering Logic ---
  useEffect(() => {
    // No need to log here every time annotators state changes, focus on filter values
    console.log(
      `[AnnotatorsPage] Filtering annotators based on: Search='${searchTerm}', Domain=${selectedDomain.length}, Lang=${selectedLanguage.length}, Loc=${selectedLocation.length}`
    );
    const filtered = annotators.filter((user) => {
      const nameLower = user.name?.toLowerCase() || '';
      const emailLower = user.email?.toLowerCase() || '';
      const searchTermLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        nameLower.includes(searchTermLower) ||
        emailLower.includes(searchTermLower); // Check if searchTerm exists

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
    console.log(
      `[AnnotatorsPage] Filtering resulted in ${filtered.length} annotators.`
    );
    setFilteredAnnotators(filtered);
    if (currentPage !== 1) {
      // Reset page only if not already 1
      setCurrentPage(1);
    }
  }, [
    searchTerm,
    selectedDomain,
    selectedLanguage,
    selectedLocation,
    annotators,
    currentPage,
  ]); // Added currentPage to dependencies

  // --- Fetch Chart Data ---
  const fetchChartData = useCallback(async () => {
    console.log(
      `[AnnotatorsPage] Starting fetchChartData for granularity: ${chartGranularity}`
    );
    setIsLoadingChart(true);
    setChartError(null);
    setChartData([]);

    try {
      const filters = {
        domain: selectedDomain,
        lang: selectedLanguage,
        location: selectedLocation,
      };
      console.log(
        `[AnnotatorsPage] Fetching chart data with filters: ${JSON.stringify(filters)}`
      );

      const statsJson = await getUserStats(filters, chartGranularity);
      console.log(
        '[AnnotatorsPage] Raw response from getUserStats:',
        statsJson
      );

      let stats: ChartDataPoint[] | StatError;
      try {
        stats = JSON.parse(statsJson);
      } catch (e) {
        console.error(
          '[AnnotatorsPage] Failed to parse chart data JSON:',
          statsJson,
          e
        );
        throw new Error('Received invalid chart data format from server.');
      }

      console.log('[AnnotatorsPage] Parsed chart data/error object:', stats);

      // Check for error structure returned from server action
      if (
        typeof stats === 'object' &&
        stats !== null &&
        'error' in stats &&
        typeof stats.error === 'string'
      ) {
        console.error(
          '[AnnotatorsPage] Server action returned error:',
          stats.error
        );
        throw new Error(stats.error); // Use error message from server
      }

      if (!Array.isArray(stats)) {
        console.error(
          '[AnnotatorsPage] Parsed chart data is not an array:',
          stats
        );
        throw new Error('Expected an array for chart data.');
      }

      // Filter out any potential invalid data points (optional but safer)
      const validChartData = stats.filter(
        (dp) =>
          typeof dp.date === 'string' &&
          typeof dp.newExperts === 'number' &&
          typeof dp.cumulativeExperts === 'number'
      );
      if (validChartData.length !== stats.length) {
        console.warn(
          '[AnnotatorsPage] Filtered out invalid data points from chart data.'
        );
      }

      console.log(
        `[AnnotatorsPage] Setting ${validChartData.length} valid chart data points.`
      );
      setChartData(validChartData);
    } catch (error: any) {
      console.error(
        '[AnnotatorsPage] Client-side error during fetchChartData:',
        error
      );
      setChartError(error.message || 'Could not load chart data.');
      setChartData([]); // Ensure data is cleared on error
    } finally {
      console.log('[AnnotatorsPage] Finished fetchChartData.');
      setIsLoadingChart(false);
    }
  }, [selectedDomain, selectedLanguage, selectedLocation, chartGranularity]); // Dependencies

  // --- Effect for Chart Data ---
  useEffect(() => {
    if (isChartDialogOpen) {
      console.log(
        '[AnnotatorsPage] Chart dialog opened/granularity changed, triggering fetchChartData.'
      );
      fetchChartData();
    } else {
      // Optional: log dialog close if needed
      // console.log("[AnnotatorsPage] Chart dialog closed.");
    }
  }, [isChartDialogOpen, fetchChartData]); // Depends on dialog state and the memoized fetch function
  const fetchReadyWorkData = useCallback(async () => {
    console.log(`[AnnotatorsPage] Starting fetchReadyWorkData`);
    setIsLoadingReadyChart(true);
    setReadyChartError(null);
    setReadyWorkData([]);

    try {
      const filters = {
        domain: selectedDomain,
        lang: selectedLanguage,
        location: selectedLocation,
      };
      console.log(
        `[AnnotatorsPage] Fetching readiness data with filters: ${JSON.stringify(filters)}`
      );

      const statsJson = await getReadyToWorkStats(filters); // Call the new action
      console.log(
        '[AnnotatorsPage] Raw response from getReadyToWorkStats:',
        statsJson
      );

      let stats: ReadyWorkDataPoint[] | StatError = JSON.parse(statsJson);
      console.log(
        '[AnnotatorsPage] Parsed readiness data/error object:',
        stats
      );

      if (typeof stats === 'object' && stats !== null && 'error' in stats) {
        throw new Error(stats.error);
      }
      if (!Array.isArray(stats)) {
        throw new Error('Expected an array for readiness data.');
      }

      console.log(
        `[AnnotatorsPage] Setting ${stats.length} readiness data points.`
      );
      setReadyWorkData(stats);
    } catch (error: any) {
      console.error(
        '[AnnotatorsPage] Client-side error during fetchReadyWorkData:',
        error
      );
      setReadyChartError(error.message || 'Could not load readiness data.');
      setReadyWorkData([]);
    } finally {
      console.log('[AnnotatorsPage] Finished fetchReadyWorkData.');
      setIsLoadingReadyChart(false);
    }
  }, [selectedDomain, selectedLanguage, selectedLocation]); // Dependencies
  useEffect(() => {
    if (isReadyChartDialogOpen) {
      console.log(
        '[AnnotatorsPage] Readiness chart dialog opened, triggering fetchReadyWorkData.'
      );
      fetchReadyWorkData();
    }
  }, [isReadyChartDialogOpen, fetchReadyWorkData]);
  // --- Handlers ---
  const handleViewDetails = (user: User) => {
    router.push(`/annotator/profileView/${user._id}`);
  };

  const savePermissions = async (userId: string) => {
    console.log(
      `[AnnotatorsPage] Attempting to save permissions for user: ${userId}`
    );
    const currentPermissions = reviewPermissionsState[userId] || [
      'No Permission',
    ];
    const backendPermissions = currentPermissions
      .filter((permission) => permission !== 'No Permission')
      .map((permission) => permissionMapping[permission] || permission);
    console.log(
      `[AnnotatorsPage] Permissions to save: ${JSON.stringify(backendPermissions)}`
    );

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
        const errorData = await response.json().catch(() => ({
          message: 'Failed to update permissions and parse error response.',
        }));
        console.error(
          `[AnnotatorsPage] Save permission failed (${response.status}):`,
          errorData
        );
        throw new Error(errorData.message || `HTTP error ${response.status}`);
      }
      const data = await response.json();
      toast({
        variant: 'default',
        title: 'Success!',
        description: data.message || 'Permissions updated.',
      });
      console.log(
        `[AnnotatorsPage] Permissions saved for ${userId}. Refreshing list.`
      );
      fetchAnnotators(); // Refresh list for consistency
    } catch (error: any) {
      console.error(
        `[AnnotatorsPage] Error saving permissions for ${userId}:`,
        error
      );
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    }
  };

  const handleExport = (exportFormat: string) => {
    console.log(
      `[AnnotatorsPage] Exporting ${filteredAnnotators.length} filtered annotators as ${exportFormat}`
    );
    const dataToExport = filteredAnnotators.map((user) => ({
      name: user.name,
      email: user.email,
      permissions: user.permission.join(', '),
      domains: user.domain?.join(', ') || '',
      languages: user.lang?.join(', ') || '',
      location: user.location || '',
      // Format dates safely, checking validity
      lastLogin:
        isValid(user.lastLogin) && user.lastLogin.getFullYear() > 1970
          ? format(user.lastLogin, 'PPPpp')
          : 'N/A',
      createdAt:
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
      'createdAt',
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
        // CSV
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
        URL.revokeObjectURL(link.href); // Clean up blob URL
      }
      console.log('[AnnotatorsPage] Export successful.');
      setIsExportDialogOpen(false);
    } catch (error) {
      console.error('[AnnotatorsPage] Export failed:', error);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Could not generate the export file.',
      });
    }
  };

  function handleTransfer(id: string) {
    console.log(`[AnnotatorsPage] Opening transfer dialog for user: ${id}`);
    setId(id);
    setOnOpen((v) => !v);
  }

  const handleUserDeleted = (userId: string) => {
    console.log(
      `[AnnotatorsPage] User ${userId} reported as deleted. Refreshing list.`
    );
    fetchAnnotators(); // Re-fetch list after deletion
    toast({
      variant: 'default',
      title: 'Success',
      description: 'Expert removed.',
    });
  };
const handleStripePayment = (expertId: string) => {
  console.log(`[AnnotatorsPage] Navigating to payment page for expert: ${expertId}`);
  router.push(`/pay/${expertId}`);
};
  // --- Pagination Calculation ---
  const totalPages = Math.ceil(filteredAnnotators.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentAnnotators = filteredAnnotators.slice(startIndex, endIndex);

  // --- Render ---
  console.log('[AnnotatorsPage] Rendering component...');
  return (
    <div className='min-h-screen'>
      {/* Header */}
      <header className='bg-white shadow-sm sticky top-0 z-10'>
        {' '}
        {/* Added shadow and sticky */}
        <div className='max-w-7xl mx-auto py-4 px-4 flex justify-between items-center'>
          <h1 className='text-2xl font-semibold text-gray-900'>Experts</h1>
          <Transfer onOpen={onOpen} setOnOpen={setOnOpen} id={id} />
          <div className='flex items-center gap-2 sm:gap-3'>
            {' '}
            {/* Reduced gap slightly */}
            <Dialog
              open={isReadyChartDialogOpen}
              onOpenChange={setIsReadyChartDialogOpen}
            >
              <DialogTrigger asChild>
                <Button variant='outline' size='sm'>
                  <CheckCircle2 className='h-4 w-4 mr-1 sm:mr-2' />{' '}
                  {/* New Icon */}
                  <span className='hidden sm:inline'>Active Users</span>
                  <span className='sm:hidden'>Ready?</span>{' '}
                  {/* Shorter for mobile */}
                </Button>
              </DialogTrigger>
              <DialogContent className='max-w-lg'>
                {' '}
                {/* Slightly smaller dialog */}
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
            {/* Chart Button & Dialog */}
            <Dialog
              open={isChartDialogOpen}
              onOpenChange={setIsChartDialogOpen}
            >
              <DialogTrigger asChild>
                <Button variant='outline' size='sm'>
                  <LineChartIcon className='h-4 w-4 mr-1 sm:mr-2' />
                  <span className='hidden sm:inline'>Stats</span>{' '}
                  {/* Show text on larger screens */}
                  <span className='sm:hidden'>Stats</span>{' '}
                  {/* Show text always for clarity */}
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
                  {' '}
                  {/* Centering content */}
                  {/* ***** Ensure this Component Name/Import is Correct ***** */}
                  <DailyExpertsStats
                    data={chartData}
                    isLoading={isLoadingChart}
                    error={chartError}
                    granularity={chartGranularity}
                  />
                </div>
              </DialogContent>
            </Dialog>
            {/* Export Button & Dialog */}
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
            {/* Add Expert Button */}
            <SheetMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className='max-w-7xl mx-auto px-2 py-6'>
        {/* Filters */}
        <div className='mb-6 grid grid-cols-1 md:grid-cols-4 gap-4'>
          <div className='relative md:col-span-1'>
            {' '}
            {/* Search takes less space */}
            <Input
              type='text'
              placeholder='Search name/email...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='pl-9 text-sm'
            />{' '}
            {/* Smaller text */}
            <Search className='absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4' />{' '}
            {/* Adjusted icon pos */}
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

        {/* Table / Loading / No Results */}
        {isFetchingAnnotators ? (
          <div className='text-center py-10 text-gray-500'>
            Loading experts...
          </div>
        ) : annotators.length === 0 ? ( // Check if initial fetch yielded nothing
          <div className='text-center py-10'>
            <h2 className='text-xl font-semibold'>No Experts Found</h2>
            <p className='mt-2 text-gray-600'>
              No experts have been added to your team yet.
            </p>
            {/* Optionally add a link/button to add experts */}
          </div>
        ) : filteredAnnotators.length === 0 ? ( // Check if filters yield nothing
          <div className='text-center py-10'>
            <h2 className='text-xl font-semibold'>No Experts Match Filters</h2>
            <p className='mt-2 text-gray-600'>
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          <div className='bg-white shadow-md rounded-lg overflow-x-auto'>
            {' '}
            {/* Allow horizontal scroll on small screens */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Permission</TableHead>
                  <TableHead>Domains</TableHead>
                  <TableHead>Languages</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                  {/* Align Actions */}
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
                  return (
                    <TableRow
                      key={user._id}
                      className='hover:bg-gray-50 text-sm'
                    >
                      {' '}
                      {/* Smaller base text */}
                      <TableCell className='font-medium whitespace-nowrap'>
                        {user.name || 'N/A'}
                      </TableCell>
                      <TableCell className='whitespace-nowrap'>
                        {user.email || 'N/A'}
                      </TableCell>
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
                      <TableCell className='text-right'>
                        {' '}
                        {/* Actions aligned right */}
                        <div className='flex items-center justify-end space-x-1'>
                          {' '}
                          {/* Use flex end */}
                          <Button
                            size='icon'
                            variant='ghost'
                            className='h-7 w-7'
                            onClick={() => handleTransfer(user._id)}
                            title='Transfer'
                          >
                            <DollarSign className='h-4 w-4' />
                          </Button>
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
            {/* Pagination */}
            <div className='flex items-center justify-between p-3 border-t text-sm'>
              {' '}
              {/* Reduced padding */}
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
                  </SelectTrigger>{' '}
                  {/* Smaller trigger */}
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
