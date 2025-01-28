'use client';
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Download, HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Globe,
  Shield,
  Calendar,
  Linkedin,
  FileText,
  Save,
  Upload,
  Settings,
} from 'lucide-react';
import { format } from 'date-fns';
import { useSession } from 'next-auth/react';
import Loader from '@/components/ui/Loader/Loader';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { FileUpload } from '@/components/FileUpload';
import CustomFields from '@/components/admin-panel/CustomFields';
import ProfileCompletion from '@/components/ProfileCompletion';

interface CustomField {
  _id: string;
  name: string;
  label: string;
  type: 'text' | 'link' | 'file' | 'array';
  isRequired: boolean;
  acceptedFileTypes: string | null;
  isActive: boolean;
}

interface UserData {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  location?: string;
  domain?: string[];
  lang?: string[];
  permission?: string[];
  lastLogin: string;
  created_at: string;
  linkedin?: string;
  resume?: string;
  nda?: string;
  customFields?: { [key: string]: any };
}

const ProfilePage = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [editedData, setEditedData] = useState<Partial<UserData>>({});
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);

  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (session?.user?.id) {
          // Fetch user data
          const userResponse = await fetch(
            `/api/users/profile/${session.user.id}`
          );
          if (!userResponse.ok) throw new Error('Failed to fetch user data');
          const userData = await userResponse.json();

          // Fetch custom fields
          const fieldsResponse = await fetch('/api/admin/custom-fields');
          if (!fieldsResponse.ok)
            throw new Error('Failed to fetch custom fields');
          const fieldsData = await fieldsResponse.json();

          // Ensure customFields exists
          const userDataWithCustomFields = {
            ...userData,
            customFields: userData.customFields || {},
          };

          setUserData(userDataWithCustomFields);
          setEditedData(userDataWithCustomFields);
          setCustomFields(fieldsData);
          toast.success('Profile loaded successfully!');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load profile data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/login');
      return;
    }

    fetchData();
  }, [session, status, router]);

  const handleInputChange = (field: keyof UserData, value: any) => {
    setEditedData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCustomFieldChange = (name: string, value: any) => {
    setEditedData((prev) => ({
      ...prev,
      customFields: {
        ...(prev.customFields || {}),
        [name]: value,
      },
    }));
  };

  const handleCustomFileUpload = async (name: string, url: string) => {
    if (!userData?._id) return;

    try {
      const response = await fetch(`/api/users/profile/${userData._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customFields: {
            ...(editedData.customFields || {}),
            [name]: url,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update custom file');
      }

      const { user: updatedUser } = await response.json();
      setUserData(updatedUser);
      setEditedData(updatedUser);
      toast.success('File uploaded successfully!');
    } catch (error) {
      console.error('Error updating custom file:', error);
      toast.error('Failed to upload file');
    }
  };

  const validateData = () => {
    if (editedData.name && editedData.name.trim().length < 2) {
      toast.error('Name must be at least 2 characters long');
      return false;
    }

    if (editedData.phone && !/^\+?[\d\s-]{10,}$/.test(editedData.phone)) {
      toast.error('Please enter a valid phone number');
      return false;
    }

    if (editedData.linkedin && !editedData.linkedin.includes('linkedin.com')) {
      toast.error('Please enter a valid LinkedIn URL');
      return false;
    }

    // Validate required custom fields
    for (const field of customFields) {
      if (field.isRequired && field.isActive) {
        const value = editedData.customFields?.[field.name];
        if (!value || (Array.isArray(value) && value.length === 0)) {
          toast.error(`${field.label} is required`);
          return false;
        }
      }
    }

    return true;
  };

  const handleSaveAll = async () => {
    if (!userData?._id) return;
    if (!validateData()) return;

    try {
      const response = await fetch(`/api/users/profile/${userData._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update profile');
      }

      const { user: updatedUser } = await response.json();
      setUserData(updatedUser);
      setEditedData(updatedUser);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(`Failed to update profile: ${(error as any).message}`);
    }
  };

  if (status === 'loading' || loading) return <Loader />;

  if (!userData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-gray-600">No user data available</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <ProfileCompletion userData={userData} customFields={customFields} />

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <div className="flex gap-4">
            {userData.role === 'system admin' && (
              <Button
                onClick={() => router.push('/admin/custom-fields')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Manage Custom Fields
              </Button>
            )}
            <Button onClick={handleSaveAll} className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Basic Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="w-5 h-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={editedData.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Email</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-700">{userData.email}</p>
                  </div>
                </div>

                <div>
                  <Label>Phone</Label>
                  <Input
                    value={editedData.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="mt-1"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <Label>Location</Label>
                  <Input
                    value={editedData.location || ''}
                    onChange={(e) =>
                      handleInputChange('location', e.target.value)
                    }
                    className="mt-1"
                    placeholder="Enter location"
                  />
                </div>

                <div>
                  <Label>LinkedIn Profile</Label>
                  <Input
                    value={editedData.linkedin || ''}
                    onChange={(e) =>
                      handleInputChange('linkedin', e.target.value)
                    }
                    className="mt-1"
                    placeholder="LinkedIn URL"
                  />
                </div>

                <div>
                  <Label>Domain</Label>
                  <Input
                    value={editedData.domain?.join(', ') || ''}
                    onChange={(e) =>
                      handleInputChange(
                        'domain',
                        e.target.value.split(',').map((item) => item.trim())
                      )
                    }
                    className="mt-1"
                    placeholder="Enter domains (comma-separated)"
                  />
                </div>

                <div>
                  <Label>Languages</Label>
                  <Input
                    value={editedData.lang?.join(', ') || ''}
                    onChange={(e) =>
                      handleInputChange(
                        'lang',
                        e.target.value.split(',').map((item) => item.trim())
                      )
                    }
                    className="mt-1"
                    placeholder="Enter languages (comma-separated)"
                  />
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <Label>Resume</Label>
                  <div className="mt-1">
                    <FileUpload
                      uploadType="pdfUploader"
                      label="Resume"
                      accept=".pdf,.doc,.docx"
                      onUploadComplete={async (url) => {
                        try {
                          const response = await fetch(
                            `/api/users/profile/${userData._id}`,
                            {
                              method: 'PUT',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({ resume: url }),
                            }
                          );

                          if (!response.ok) {
                            throw new Error(
                              'Failed to update profile with resume'
                            );
                          }

                          const { user: updatedUser } = await response.json();
                          setUserData(updatedUser);
                          setEditedData(updatedUser);
                          toast.success('Resume uploaded and profile updated!');
                        } catch (error) {
                          console.error(
                            'Error updating profile with resume:',
                            error
                          );
                          toast.error('Failed to update profile with resume');
                        }
                      }}
                      currentFile={userData.resume}
                    />
                  </div>
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    NDA Document
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4"
                          >
                            <HelpCircle className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>1. Download the NDA template</p>
                          <p>
                            2. Digitally sign the PDF using Adobe Acrobat or
                            similar tools
                          </p>
                          <p>3. Upload the signed PDF here</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <div className="flex items-center gap-4 mb-4 mt-1">
                    <Button
                      onClick={async () => {
                        try {
                          const response = await fetch(
                            '/api/documents/nda-template'
                          );
                          if (!response.ok)
                            throw new Error('Failed to download NDA template');

                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'NDA_Template.pdf';
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                        } catch (error) {
                          console.error('Error downloading NDA:', error);
                          toast.error('Failed to download NDA template');
                        }
                      }}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download NDA Template
                    </Button>
                  </div>
                  <div className="mt-1">
                    <FileUpload
                      uploadType="pdfUploader"
                      label="NDA"
                      accept=".pdf"
                      onUploadComplete={async (url) => {
                        try {
                          const response = await fetch(
                            `/api/users/profile/${userData._id}`,
                            {
                              method: 'PUT',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({ nda: url }),
                            }
                          );

                          if (!response.ok) {
                            throw new Error(
                              'Failed to update profile with NDA'
                            );
                          }

                          const { user: updatedUser } = await response.json();
                          setUserData(updatedUser);
                          setEditedData(updatedUser);
                          toast.success('NDA uploaded and profile updated!');
                        } catch (error) {
                          console.error(
                            'Error updating profile with NDA:',
                            error
                          );
                          toast.error('Failed to update profile with NDA');
                        }
                      }}
                      currentFile={userData.nda}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Role & Permissions Card - Now Read Only */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Role & Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Role</Label>
                  <div className="mt-1">
                    <Badge variant="outline" className="text-base capitalize">
                      {userData.role}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Permissions</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {userData.permission?.map((perm, index) => (
                      <Badge key={index} variant="secondary">
                        {perm}
                      </Badge>
                    )) || (
                      <span className="text-gray-500">
                        No permissions assigned
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Account Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Last Login</Label>
                  <p className="mt-1 text-gray-700">
                    {format(new Date(userData.lastLogin), 'PPP')}
                  </p>
                </div>
                <div>
                  <Label>Account Created</Label>
                  <p className="mt-1 text-gray-700">
                    {format(new Date(userData.created_at), 'PPP')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          {customFields.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Additional Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CustomFields
                  fields={customFields}
                  values={editedData.customFields || {}} // Changed to use editedData instead of userData
                  onChange={handleCustomFieldChange}
                  onFileUpload={handleCustomFileUpload}
                  userId={userData._id}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
