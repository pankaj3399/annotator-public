'use client';
import { useEffect, useState } from 'react';
import { getAllAnnotators } from '@/app/actions/annotator';
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
import { format, parseISO } from 'date-fns';
import {
  CalendarIcon,
  Save,
  Search,
  FileDown,
  User,
  ChevronLeft,
  ChevronRight,
  DollarSign,
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
interface User {
  _id: string;
  name: string;
  email: string;
  permission: string[];
  lastLogin: Date;
  domain: string[];
  lang: string[];
  location: string;
}

interface Option {
  value: string;
  label: string;
}

const permissionMapping: { [key: string]: string } = {
  canReview: 'Can Review',
  noPermission: 'No Permission',
  'Can Review': 'canReview',
  'No Permission': 'noPermission',
};

const permissions = ['No Permission', 'Can Review'];
const permissionOptions: Option[] = permissions.map((permission) => ({
  value: permission,
  label: permission,
}));

const PAGE_SIZES = [10, 20, 50, 100];

const domainOptions: Option[] = domains.map((domain) => ({
  value: domain.toLowerCase(),
  label: domain,
}));

const languageOptions: Option[] = languages.map((language) => ({
  value: language.toLowerCase(),
  label: language,
}));

const locationOptions: Option[] = locations.map((location) => ({
  value: location.toLowerCase(),
  label: location.charAt(0).toUpperCase() + location.slice(1),
}));

export default function AnnotatorsPage() {
  const [annotators, setAnnotators] = useState<User[]>([]);
  const [onOpen, setOnOpen] = useState(false);
  const [id,setId]=useState('')
  const [filteredAnnotators, setFilteredAnnotators] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [reviewPermissionsState, setReviewPermissionsState] = useState<{
    [key: string]: string[];
  }>({});
  const [selectedLocation, setSelectedLocation] = useState<string[]>([]);

  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchAnnotators = async () => {
      try {
        const data = JSON.parse(await getAllAnnotators());
        const transformedData = data.map((annotator: User) => {
          const currentPermissions = annotator.permission || ['noPermission'];
          const transformedPermissions = currentPermissions.map(
            (perm) => permissionMapping[perm] || 'No Permission'
          );

          return {
            ...annotator,
            permission: transformedPermissions,
          };
        });

        setAnnotators(transformedData);
        setFilteredAnnotators(transformedData);

        const initialPermissionsState = transformedData.reduce(
          (acc: { [key: string]: string[] }, user: User) => {
            acc[user._id] = user.permission;
            return acc;
          },
          {}
        );

        setReviewPermissionsState(initialPermissionsState);
      } catch (error) {
        console.error('Error fetching annotators:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to fetch annotators',
        });
      }
    };

    fetchAnnotators();
  }, [toast]);

  const handleViewDetails = (user: User) => {
    router.push(`/annotator/profileView/${user._id}`);
  };

  useEffect(() => {
    const filtered = annotators.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDomain =
        selectedDomain.length === 0 ||
        (user.domain &&
          selectedDomain.some((selected) =>
            user.domain
              .map((d) => d.toLowerCase())
              .includes(selected.toLowerCase())
          ));

      const matchesLanguage =
        selectedLanguage.length === 0 ||
        (user.lang &&
          selectedLanguage.some((selected) =>
            user.lang
              .map((l) => l.toLowerCase())
              .includes(selected.toLowerCase())
          ));

      const matchesLocation =
        selectedLocation.length === 0 ||
        (user.location &&
          selectedLocation.some(
            (selected) => user.location.toLowerCase() === selected.toLowerCase()
          ));

      return (
        matchesSearch && matchesDomain && matchesLanguage && matchesLocation
      );
    });

    setFilteredAnnotators(filtered);
    setCurrentPage(1);
  }, [
    searchTerm,
    selectedDomain,
    selectedLanguage,
    selectedLocation,
    annotators,
  ]);

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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          permission: backendPermissions,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update permissions');
      }

      const data = await response.json();
      toast({
        variant: 'default',
        title: 'Success!',
        description: data.message || 'Permissions updated successfully',
      });

      setAnnotators((prevAnnotators) =>
        prevAnnotators.map((annotator) =>
          annotator._id === userId
            ? { ...annotator, permission: reviewPermissionsState[userId] }
            : annotator
        )
      );
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: error.message || 'An unexpected error occurred.',
      });
    }
  };

  const handleExport = (exportFormat: string) => {
    const dataToExport = filteredAnnotators.map((user) => ({
      name: user.name,
      email: user.email,
      permissions: user.permission.join(', '),
      domains: user.domain?.join(', ') || '',
      languages: user.location,
      location: user.lang?.join(', ') || '',
      lastLogin: format(parseISO(user.lastLogin.toString()), 'PPPpp'),
    }));

    if (exportFormat === 'json') {
      const dataStr = JSON.stringify(dataToExport, null, 2);
      const dataUri =
        'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = 'annotators.json';
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } else {
      const headers = [
        'name',
        'email',
        'permissions',
        'domains',
        'languages',
        'location',
        'lastLogin',
      ];
      const csvContent = [
        headers.join(','),
        ...dataToExport.map((row) =>
          headers
            .map((header) => `"${row[header as keyof typeof row]}"`)
            .join(',')
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', 'annotators.csv');
      link.click();
    }

    setIsExportDialogOpen(false);
  };

  const totalPages = Math.ceil(filteredAnnotators.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentAnnotators = filteredAnnotators.slice(startIndex, endIndex);

  function handleTransfer(id:string){
    setId(id)
    setOnOpen(v=>!v)
  }

  return (
    <div className='min-h-screen'>
      <header className='bg-white'>
        <div className='max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center'>
          <h1 className='text-3xl font-bold text-gray-900 tracking-tight'>
            Experts
          </h1>
          <Transfer onOpen={onOpen} setOnOpen={setOnOpen} id={id}/>
          <div className='flex gap-4'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setIsExportDialogOpen(true)}
            >
              <FileDown className='h-4 w-4 mr-2' />
              Export
            </Button>
            <SheetMenu />
          </div>
        </div>
      </header>
      <main className='max-w-7xl mx-auto sm:px-6 lg:px-8'>
        <div className='mb-6 mt-4 space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
            <div className='relative'>
              <Input
                type='text'
                placeholder='Search by name or email...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='pl-10'
              />
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5' />
            </div>

            <MultiCombobox
              options={domainOptions}
              value={selectedDomain}
              onChange={setSelectedDomain}
              placeholder='Select Domain'
            />

            <MultiCombobox
              options={languageOptions}
              value={selectedLanguage}
              onChange={setSelectedLanguage}
              placeholder='Select Language'
            />

            <MultiCombobox
              options={locationOptions}
              value={selectedLocation}
              onChange={setSelectedLocation}
              placeholder='Select Location'
            />
          </div>
        </div>

        {currentAnnotators.length === 0 ? (
          <div className='text-center py-10'>
            <h2 className='text-xl font-semibold text-gray-900'>
              No experts found
            </h2>
            <p className='mt-2 text-gray-600'>Try adjusting your filters</p>
          </div>
        ) : (
          <div className='bg-white shadow-sm rounded-lg overflow-hidden'>
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
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentAnnotators.map((user) => {
                  const localReviewPermission = reviewPermissionsState[
                    user._id
                  ] || ['No Permission'];

                  return (
                    <TableRow key={user._id} className='hover:bg-gray-50'>
                      <TableCell className='font-medium'>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div className='flex items-center'>
                          <MultiCombobox
                            options={permissionOptions}
                            value={localReviewPermission}
                            onChange={(value: string[]) => {
                              setReviewPermissionsState((prevState) => ({
                                ...prevState,
                                [user._id]: value,
                              }));
                            }}
                            placeholder='Select Permission'
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className='flex flex-wrap gap-1'>
                          {user.domain?.map((domain, index) => (
                            <Badge
                              key={index}
                              variant='secondary'
                              className='text-xs'
                            >
                              {domain}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className='flex flex-wrap gap-1'>
                          {user.lang?.map((language, index) => (
                            <Badge
                              key={index}
                              variant='outline'
                              className='text-xs'
                            >
                              {language}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className='font-medium'>
                        {user.location
                          ? user.location.charAt(0).toUpperCase() +
                            user.location.slice(1)
                          : ''}
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center text-sm text-gray-500'>
                          <CalendarIcon className='mr-2 h-4 w-4' />
                          {format(parseISO(user.lastLogin.toString()), 'PPPpp')}
                        </div>
                      </TableCell>
                      <TableCell className='flex items-center space-x-4'>
                        <button
                          className='flex items-center justify-center w-8 h-8 bg-gray-200 text-gray-700 rounded-full shadow-md hover:bg-gray-300 transition-colors'
                          onClick={()=>handleTransfer(user._id)}
                          aria-label='Save Permissions'
                        >
                          <DollarSign className='h-5 w-5' />
                        </button>
                        <button
                          className='flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full shadow-md hover:bg-blue-600 transition-colors'
                          onClick={() => savePermissions(user._id)}
                          aria-label='Save Permissions'
                        >
                          <Save className='h-5 w-5' />
                        </button>
                        <button
                          onClick={() => handleViewDetails(user)}
                          className='flex items-center justify-center w-8 h-8 bg-gray-200 text-gray-700 rounded-full shadow-md hover:bg-gray-300 transition-colors'
                          aria-label='View User'
                        >
                          <User className='h-5 w-5' />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            <div className='flex items-center justify-between p-4 border-t'>
              <div className='flex items-center space-x-4'>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => setPageSize(Number(value))}
                >
                  <SelectTrigger className='w-[120px]'>
                    <SelectValue placeholder='Page Size' />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZES.map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size} per page
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className='text-sm text-gray-700'>
                  Showing {startIndex + 1} to{' '}
                  {Math.min(endIndex, filteredAnnotators.length)} of{' '}
                  {filteredAnnotators.length} results
                </div>
              </div>

              <div className='flex items-center space-x-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className='h-4 w-4 mr-1' />
                  Previous
                </Button>
                <div className='text-sm text-gray-700'>
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className='h-4 w-4 ml-1' />
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Experts</DialogTitle>
            <DialogDescription>
              Choose your preferred export format
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => handleExport('csv')}>
              Export as CSV
            </Button>
            <Button onClick={() => handleExport('json')}>Export as JSON</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog> */}
    </div>
  );
}
