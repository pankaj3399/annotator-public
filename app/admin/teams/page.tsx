'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Users, Upload, X, Image } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { createTeam, getTeams, updateTeamLogo } from '@/app/actions/team';

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
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: session } = useSession();

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const data = await getTeams();
        setTeams(data);
      } catch (error) {
        console.error('Error fetching teams:', error);
        toast.error('Failed to load teams');
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

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

  // Replace your uploadLogo and handleLogoUpload functions with these fixed versions:

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

  return (
    <>
      <div className='flex justify-between items-center mb-8'>
        <h1 className='text-3xl font-bold text-gray-900'>Teams</h1>
        <div className='flex gap-4'>
          <Button
            onClick={() => setIsModalOpen(true)}
            variant='outline'
            className='flex items-center gap-2'
          >
            <PlusCircle className='w-4 h-4' />
            Add Team
          </Button>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-6'>
        {teams.length === 0 ? (
          <div className='text-center py-8'>
            <p className='text-gray-500'>
              No teams found. Create your first team!
            </p>
          </div>
        ) : (
          teams.map((team) => (
            <Card key={team._id} className='overflow-hidden'>
              <CardHeader className='bg-gray-50'>
                <CardTitle className='flex justify-between items-center'>
                  <div className='flex items-center gap-3'>
                    {team.logo ? (
                      <img
                        src={team.logo}
                        alt={`${team.name} logo`}
                        className='h-12 w-12 rounded-full object-cover'
                      />
                    ) : (
                      <Users className='h-10 w-10 text-blue-500' />
                    )}
                    <span>{team.name}</span>
                  </div>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => triggerLogoUpload(team._id)}
                    disabled={uploadingLogo === team._id}
                    className='flex items-center gap-2'
                  >
                    {uploadingLogo === team._id ? (
                      <>
                        <div className='w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin' />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className='w-4 h-4' />
                        {team.logo ? 'Change Logo' : 'Add Logo'}
                      </>
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className='pt-4'>
                <div className='space-y-4'>
                  <div>
                    <p className='text-sm text-gray-500'>Description</p>
                    <p className='text-gray-700'>
                      {team.description || 'No description'}
                    </p>
                  </div>

                  <div>
                    <p className='text-sm text-gray-500'>Members</p>
                    <p className='text-gray-700'>
                      {team.members?.length || 0} member(s)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Team Modal */}
      {isModalOpen && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white p-6 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto'>
            <h2 className='text-xl font-bold mb-4'>Add New Team</h2>
            <form onSubmit={handleSubmit}>
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='name'>Team Name</Label>
                  <Input
                    id='name'
                    name='name'
                    value={formData.name}
                    onChange={handleChange}
                    placeholder='Enter team name'
                    required
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='description'>Description</Label>
                  <Textarea
                    id='description'
                    name='description'
                    value={formData.description}
                    onChange={handleChange}
                    placeholder='Enter team description'
                    rows={3}
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='logo'>Team Logo (Optional)</Label>
                  <div className='flex flex-col gap-3'>
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
                          className='h-20 w-20 rounded-lg object-cover border-2 border-gray-200'
                        />
                        <button
                          type='button'
                          onClick={clearLogo}
                          className='absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600'
                        >
                          <X className='w-3 h-3' />
                        </button>
                      </div>
                    ) : (
                      <label
                        htmlFor='logo-upload'
                        className='flex flex-col items-center justify-center h-20 w-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400'
                      >
                        <Image className='w-6 h-6 text-gray-400' />
                        <span className='text-xs text-gray-400 mt-1'>
                          Add Logo
                        </span>
                      </label>
                    )}

                    <p className='text-xs text-gray-500'>
                      Maximum file size: 5MB. Supported formats: JPG, PNG, GIF
                    </p>
                  </div>
                </div>

                <div className='flex justify-end space-x-2 pt-4'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => {
                      setIsModalOpen(false);
                      clearLogo();
                      setFormData({ name: '', description: '' });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type='submit'>Create Team</Button>
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
