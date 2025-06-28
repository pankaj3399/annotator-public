'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Users, Upload, X, Image, Calendar, UserCheck, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { createTeam, getTeams, updateTeamLogo } from '@/app/actions/team';
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
import Loader from '@/components/ui/Loader/Loader';

interface Team {
  _id: string;
  name: string;
  description: string | null;
  logo: string | null;
  members: string[];
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

const TeamsPage = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get page and size from URL parameters
    const page = searchParams.get('page');
    const size = searchParams.get('size');
    const search = searchParams.get('search');
    
    if (page) {
      setCurrentPage(Number(page));
    }
    
    if (size) {
      setPageSize(Number(size));
    }

    if (search) {
      setSearchQuery(search);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const data = await getTeams();
        setTeams(data);
        setFilteredTeams(data);
      } catch (error) {
        console.error('Error fetching teams:', error);
        toast.error('Failed to load teams');
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  // Filter teams based on search query
  useEffect(() => {
    let filtered = teams;
    
    if (searchQuery.trim()) {
      filtered = teams.filter(team =>
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (team.description && team.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        team.createdBy.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredTeams(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }, [searchQuery, teams]);

  // Handle search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) {
      params.set('search', value);
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    router.push(`?${params.toString()}`);
  };

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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      setLogoFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogoFile = async (
    file: File,
    teamId: string
  ): Promise<string | null> => {
    try {
      console.log('Starting logo upload for team:', teamId, 'file:', file.name);

      // Get signed URL for upload
      const response = await fetch('/api/teamLogos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          teamId: teamId,
        }),
      });

      console.log('API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API response error:', errorText);
        throw new Error(`API request failed: ${response.status} ${errorText}`);
      }

      const responseData = await response.json();
      console.log('API response data:', responseData);

      // Handle the response structure from your API
      if (!responseData.success) {
        throw new Error(responseData.error || 'API returned success: false');
      }

      const { uploadUrl, publicUrl } = responseData;

      if (!uploadUrl || !publicUrl) {
        throw new Error('Missing uploadUrl or publicUrl in response');
      }

      console.log('Uploading to S3 URL:', uploadUrl);

      // Upload file to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      console.log('S3 upload response status:', uploadResponse.status);

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('S3 upload error:', errorText);
        throw new Error(
          `S3 upload failed: ${uploadResponse.status} ${errorText}`
        );
      }

      console.log('Logo uploaded successfully to:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Error in uploadLogoFile:', error);
      throw error;
    }
  };

  // Updated uploadLogo function for new team creation
  const uploadLogo = async (teamId: string): Promise<string | null> => {
    if (!logoFile) {
      console.log('No logoFile found, returning null');
      return null;
    }

    return await uploadLogoFile(logoFile, teamId);
  };

  // Fixed handleLogoUpload function for existing teams
  const handleLogoUpload = async (teamId: string, file: File) => {
    setUploadingLogo(teamId);
    try {
      console.log('Starting logo upload for existing team:', teamId);

      // Upload the logo directly without modifying state
      const logoUrl = await uploadLogoFile(file, teamId);
      console.log('Logo uploaded to S3:', logoUrl);

      if (logoUrl) {
        console.log('Updating team logo in database for team:', teamId);
        const updatedTeam = await updateTeamLogo(teamId, logoUrl);
        console.log('Team updated:', updatedTeam);

        // Refresh teams to show new logo
        const updatedTeams = await getTeams();
        setTeams(updatedTeams);
        toast.success('Logo uploaded successfully!');
      } else {
        throw new Error('No logo URL returned from upload');
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error(
        `Failed to upload logo: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setUploadingLogo(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!formData.name.trim()) {
        toast.error('Team name is required');
        return;
      }

      if (!session?.user?.id) {
        toast.error('User session not found');
        return;
      }

      const teamData = {
        ...formData,
        createdBy: session.user.id,
        members: [session.user.id],
      };

      // Create team first
      const newTeam = await createTeam(teamData);

      // Upload logo if provided
      if (logoFile) {
        try {
          console.log('Uploading logo for new team:', newTeam._id);
          const logoUrl = await uploadLogo(newTeam._id);
          console.log('Logo uploaded to S3:', logoUrl);

          if (logoUrl) {
            console.log('Updating team logo in database');
            await updateTeamLogo(newTeam._id, logoUrl);
            console.log('Team logo updated in database');
          } else {
            throw new Error('No logo URL returned from upload');
          }
        } catch (error) {
          console.error('Error uploading logo:', error);
          toast.error('Team created but logo upload failed');
        }
      }

      // Refresh the teams list
      const updatedTeams = await getTeams();
      setTeams(updatedTeams);

      setIsModalOpen(false);
      setFormData({ name: '', description: '' });
      setLogoPreview(null);
      setLogoFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      toast.success('Team created successfully!');
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error('Failed to create team');
    }
  };

  const triggerLogoUpload = (teamId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Validate file
        if (!file.type.startsWith('image/')) {
          toast.error('Please select an image file');
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error('File size must be less than 5MB');
          return;
        }

        setLogoFile(file);
        handleLogoUpload(teamId, file);
      }
    };
    input.click();
  };

  const clearLogo = () => {
    setLogoPreview(null);
    setLogoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Calculate pagination values
  const totalPages = Math.ceil(filteredTeams.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentPageTeams = filteredTeams.slice(startIndex, endIndex);

  // Gradient border variations
  const gradientBorders = [
    'bg-gradient-to-r from-pink-200 via-purple-200 to-indigo-200',
    'bg-gradient-to-r from-blue-200 via-cyan-200 to-teal-200',
    'bg-gradient-to-r from-green-200 via-emerald-200 to-blue-200',
    'bg-gradient-to-r from-yellow-200 via-orange-200 to-red-200',
    'bg-gradient-to-r from-purple-200 via-pink-200 to-rose-200',
    'bg-gradient-to-r from-indigo-200 via-blue-200 to-cyan-200',
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <>
      <div className='flex justify-between items-center mb-8'>
        <div>
          <h1 className='text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent'>
            Teams
          </h1>
          <p className="text-gray-600 mt-2">Manage your teams and collaborate effectively</p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className='bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105'
        >
          <PlusCircle className='w-4 h-4 mr-2' />
          Create Team
        </Button>
      </div>

      {/* Search and Controls */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 border-gray-200 focus:border-purple-300 focus:ring-purple-200 rounded-xl bg-white/80 backdrop-blur-sm"
            />
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-700">Show:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => handlePageSizeChange(parseInt(value))}
            >
              <SelectTrigger className="w-20 border-gray-200 focus:border-purple-300 focus:ring-purple-200 rounded-xl">
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
      </div>

      {/* Teams List */}
      <div className="bg-white/50 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl">
        <div className="p-6 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Your Teams</h2>
              <p className="text-sm text-gray-500 mt-1">
                {searchQuery ? `${filteredTeams.length} of ${teams.length} teams` : `${teams.length} total teams`}
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <Loader />
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className='text-center py-16'>
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-purple-100 to-blue-100 flex items-center justify-center">
                {searchQuery ? <Search className="h-12 w-12 text-purple-500" /> : <Users className="h-12 w-12 text-purple-500" />}
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {searchQuery ? 'No teams found' : 'No teams yet'}
              </h3>
              <p className='text-gray-500 mb-6 max-w-md mx-auto'>
                {searchQuery 
                  ? `No teams match "${searchQuery}". Try a different search term.`
                  : 'Get started by creating your first team. Invite members and collaborate on exciting projects together.'
                }
              </p>
              {searchQuery ? (
                <Button
                  onClick={() => handleSearchChange('')}
                  variant="outline"
                  className="mr-3"
                >
                  Clear Search
                </Button>
              ) : null}
              <Button
                onClick={() => setIsModalOpen(true)}
                className='bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105'
              >
                <PlusCircle className='w-4 h-4 mr-2' />
                Create Your First Team
              </Button>
            </div>
          ) : (
            <div className='space-y-4'>
              {currentPageTeams.map((team, index) => {
                const gradientClass = gradientBorders[index % gradientBorders.length];
                return (
                  <div
                    key={team._id}
                    className={`p-0.5 rounded-2xl ${gradientClass} hover:scale-[1.02] transition-all duration-300 hover:shadow-2xl group cursor-pointer`}
                  >
                    <div className="bg-white rounded-2xl h-full overflow-hidden">
                      <div className="p-5">
                        <div className="flex items-center justify-between">
                          {/* Left side - Team info */}
                          <div className="flex items-center space-x-4 flex-1">
                            <div className="relative group/logo">
                              {team.logo ? (
                                <img
                                  src={team.logo}
                                  alt={`${team.name} logo`}
                                  className='h-14 w-14 rounded-full object-cover ring-2 ring-white shadow-md group-hover:ring-purple-200 transition-all duration-300'
                                />
                              ) : (
                                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center group-hover:from-purple-200 group-hover:to-blue-200 transition-all duration-300">
                                  <Users className='h-6 w-6 text-purple-600' />
                                </div>
                              )}
                              
                              {/* Edit overlay */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerLogoUpload(team._id);
                                }}
                                disabled={uploadingLogo === team._id}
                                className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-all duration-300 hover:bg-black/50"
                                title={team.logo ? "Update logo" : "Add logo"}
                              >
                                {uploadingLogo === team._id ? (
                                  <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
                                ) : (
                                  <Upload className='w-4 h-4 text-white' />
                                )}
                              </button>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-3 mb-1">
                                <h3 className="font-semibold text-gray-800 text-lg group-hover:text-purple-700 transition-colors duration-300 truncate">
                                  {team.name}
                                </h3>
                                <div className="flex items-center space-x-1 text-gray-500 flex-shrink-0">
                                  <Calendar className="w-3 h-3" />
                                  <span className="text-xs">{formatDate(team.created_at)}</span>
                                </div>
                              </div>
                              <p className='text-gray-600 text-sm line-clamp-1 leading-relaxed'>
                                {team.description || 'No description provided'}
                              </p>
                            </div>
                          </div>

                          {/* Right side - Member count */}
                          <div className="flex items-center ml-4">
                            <div className="flex items-center space-x-1 text-gray-500 min-w-[80px] justify-end">
                              <UserCheck className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                {team.members?.length || 0} {(team.members?.length || 0) === 1 ? 'member' : 'members'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {filteredTeams.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-gray-600">
                Showing <span className="font-medium text-gray-800">{filteredTeams.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, filteredTeams.length)}</span> of <span className="font-medium text-gray-800">{filteredTeams.length}</span> teams
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsModalOpen(true)}
                className="hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 transition-all duration-300"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Team
              </Button>
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
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'hover:bg-purple-50 hover:text-purple-700'}
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
                            className={pageNumber === currentPage ? 'bg-purple-100 text-purple-700 border-purple-200' : 'hover:bg-purple-50 hover:text-purple-700'}
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
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'hover:bg-purple-50 hover:text-purple-700'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        )}
      </div>

      {/* Add Team Modal */}
      {isModalOpen && (
        <div className='fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4'>
          <div className='bg-white/95 backdrop-blur-sm p-8 rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20'>
            <div className="text-center mb-6">
              <h2 className='text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent'>
                Create New Team
              </h2>
              <p className="text-gray-600 text-sm mt-2">Build your dream team and start collaborating</p>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className='space-y-6'>
                <div className='space-y-2'>
                  <Label htmlFor='name' className="text-gray-700 font-medium">Team Name</Label>
                  <Input
                    id='name'
                    name='name'
                    value={formData.name}
                    onChange={handleChange}
                    placeholder='Enter team name'
                    required
                    className="border-gray-200 focus:border-purple-300 focus:ring-purple-200 rounded-xl"
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='description' className="text-gray-700 font-medium">Description</Label>
                  <Textarea
                    id='description'
                    name='description'
                    value={formData.description}
                    onChange={handleChange}
                    placeholder='Describe your team and its purpose'
                    rows={3}
                    className="border-gray-200 focus:border-purple-300 focus:ring-purple-200 rounded-xl resize-none"
                  />
                </div>

                <div className='space-y-3'>
                  <Label htmlFor='logo' className="text-gray-700 font-medium">Team Logo (Optional)</Label>
                  <div className='flex flex-col gap-4'>
                    <input
                      ref={fileInputRef}
                      type='file'
                      accept='image/*'
                      onChange={handleLogoSelect}
                      className='hidden'
                      id='logo-upload'
                    />

                    {logoPreview ? (
                      <div className='relative inline-block'>
                        <img
                          src={logoPreview}
                          alt='Logo preview'
                          className='h-20 w-20 rounded-xl object-cover ring-4 ring-purple-100 shadow-lg'
                        />
                        <button
                          type='button'
                          onClick={clearLogo}
                          className='absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-all duration-200 hover:scale-110'
                        >
                          <X className='w-3 h-3' />
                        </button>
                      </div>
                    ) : (
                      <label
                        htmlFor='logo-upload'
                        className='flex flex-col items-center justify-center h-20 w-20 border-2 border-dashed border-purple-300 rounded-xl cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-all duration-300 group'
                      >
                        <Image className='w-6 h-6 text-purple-400 group-hover:text-purple-500 transition-colors' />
                        <span className='text-xs text-purple-400 group-hover:text-purple-500 mt-1 transition-colors'>
                          Add Logo
                        </span>
                      </label>
                    )}

                    <p className='text-xs text-gray-500'>
                      Maximum file size: 5MB. Supported: JPG, PNG, GIF
                    </p>
                  </div>
                </div>

                <div className='flex justify-end space-x-3 pt-6 border-t border-gray-100'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => {
                      setIsModalOpen(false);
                      clearLogo();
                      setFormData({ name: '', description: '' });
                    }}
                    className="hover:bg-gray-50 border-gray-200 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type='submit'
                    className='bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 rounded-xl'
                  >
                    Create Team
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default TeamsPage;