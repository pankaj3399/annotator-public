'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Save, Trash2, Edit, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

// Import the server action to get teams
import { getTeams } from '@/app/actions/team';
import Loader from '@/components/ui/NewLoader/Loader';
import {
  getAvailableReferenceTabs,
  getOptionsByReferenceTab,
  PREDEFINED_OPTIONS,
} from '@/lib/constants';

interface Team {
  _id: string;
  name: string;
  description?: string;
  createdBy: {
    name: string;
    email: string;
  };
}

interface CustomField {
  _id?: string;
  name: string;
  label: string;
  type:
    | 'text'
    | 'link'
    | 'file'
    | 'array'
    | 'select'
    | 'multiselect'
    | 'date'
    | 'number'
    | 'boolean'
    | 'email'
    | 'phone';
  isRequired: boolean;
  acceptedFileTypes: string | null;
  isActive: boolean;
  forAllTeams: boolean;
  teams?: string[];
  options?: string[];
  placeholder?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    dateFormat?: string;
  };
  referenceTab?: string;
}

const CustomFieldsPage = () => {
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamsLoading, setTeamsLoading] = useState(true);

  // For edit modal
  const [editField, setEditField] = useState<CustomField | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // For delete confirmation
  const [deleteFieldId, setDeleteFieldId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchCustomFields();
    fetchTeams();
  }, []);

  const fetchCustomFields = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/custom-fields');
      if (!response.ok) throw new Error('Failed to fetch custom fields');
      const data = await response.json();
      setCustomFields(data);
    } catch (error) {
      console.error('Error fetching custom fields:', error);
      toast.error('Failed to load custom fields');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      setTeamsLoading(true);
      const teamsData = await getTeams();
      setTeams(teamsData);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast.error('Failed to load teams');
    } finally {
      setTeamsLoading(false);
    }
  };

  const handleAddField = () => {
    // Set first team as default if available
    const defaultTeams = teams.length > 0 ? [teams[0]._id] : [];

    // Create a new field template
    const newField: CustomField = {
      name: '',
      label: '',
      type: 'text',
      isRequired: false,
      acceptedFileTypes: null,
      isActive: true,
      forAllTeams: false,
      teams: defaultTeams,
      options: [],
      placeholder: '',
      validation: {},
      referenceTab: '',
    };

    // Open edit modal with the new field
    setEditField(newField);
    setEditIndex(null); // null means we're adding a new field
    setIsEditModalOpen(true);
  };

  const handleAddPresetField = (preset: Partial<CustomField>) => {
    const defaultTeams = teams.length > 0 ? [teams[0]._id] : [];

    const newField: CustomField = {
      name: '',
      label: '',
      type: 'text',
      isRequired: false,
      acceptedFileTypes: null,
      isActive: true,
      forAllTeams: false,
      teams: defaultTeams,
      options: [],
      placeholder: '',
      validation: {},
      referenceTab: '',
      ...preset,
    };

    setEditField(newField);
    setEditIndex(null);
    setIsEditModalOpen(true);
  };

  const presetFields = [
    {
      name: 'email',
      label: 'Email Address',
      type: 'email' as const,
      isRequired: true,
      placeholder: 'Enter your email address',
    },
    {
      name: 'firstName',
      label: 'First Name',
      type: 'text' as const,
      isRequired: true,
      placeholder: 'Enter your first name',
    },
    {
      name: 'lastName',
      label: 'Last Name',
      type: 'text' as const,
      isRequired: true,
      placeholder: 'Enter your last name',
    },
    {
      name: 'dateOfBirth',
      label: 'Date of Birth',
      type: 'date' as const,
      validation: { dateFormat: 'MM/DD/YYYY' },
      placeholder: 'MM/DD/YYYY',
    },
    {
      name: 'gender',
      label: 'Gender',
      type: 'select' as const,
      options: ['Woman', 'Man', 'Non-binary', 'Prefer not to say', 'Other'],
    },
    {
      name: 'nativeCountry',
      label: 'Native Country',
      type: 'select' as const,
      referenceTab: 'Countries',
      options: getOptionsByReferenceTab('Countries'),
    },
    {
      name: 'currentCountry',
      label: 'Current Country of Residence',
      type: 'select' as const,
      referenceTab: 'Countries',
      options: getOptionsByReferenceTab('Countries'),
    },
    {
      name: 'countryCode',
      label: 'Country Code',
      type: 'select' as const,
      referenceTab: 'Country Codes',
      options: getOptionsByReferenceTab('Country Codes'),
    },
    {
      name: 'mobilePhone',
      label: 'Mobile Phone Number',
      type: 'phone' as const,
      placeholder: 'Enter your mobile number',
    },
    {
      name: 'nativeLanguage',
      label: 'Native Language',
      type: 'select' as const,
      referenceTab: 'LanguageVariant',
      options: getOptionsByReferenceTab('LanguageVariant'),
    },
    {
      name: 'language2',
      label: 'Language 2',
      type: 'select' as const,
      referenceTab: 'LanguageVariant',
      options: getOptionsByReferenceTab('LanguageVariant'),
    },
    {
      name: 'language3',
      label: 'Language 3',
      type: 'select' as const,
      referenceTab: 'LanguageVariant',
      options: getOptionsByReferenceTab('LanguageVariant'),
    },
    {
      name: 'language4',
      label: 'Language 4',
      type: 'select' as const,
      referenceTab: 'LanguageVariant',
      options: getOptionsByReferenceTab('LanguageVariant'),
    },
    {
      name: 'educationLevel',
      label: 'Highest Education Level',
      type: 'select' as const,
      options: [
        "Bachelor's",
        "Master's",
        'PhD - Doctorate',
        'None of the Above',
      ],
    },
    {
      name: 'linguisticExperience',
      label: 'Do you have experience in the linguistic field?',
      type: 'boolean' as const,
    },
    {
      name: 'yearsTranslationExperience',
      label: 'How many years of translation/linguistic experience do you have?',
      type: 'number' as const,
      validation: { min: 0, max: 50 },
    },
    {
      name: 'fieldOfExpertise',
      label: 'What is your primary field of expertise?',
      type: 'select' as const,
      referenceTab: 'Field of Expertise',
      options: getOptionsByReferenceTab('Field of Expertise'),
    },
    {
      name: 'yearsFieldExperience',
      label:
        'How many years of professional experience do you have in that field?',
      type: 'number' as const,
      validation: { min: 0, max: 50 },
    },
    {
      name: 'operatingSystems',
      label: 'Operating systems you currently have access to',
      type: 'multiselect' as const,
      options: ['Windows', 'Mac', 'Linux', 'iOS', 'Chrome OS'],
    },
    {
      name: 'resumeUpload',
      label: 'Resume Upload',
      type: 'file' as const,
      acceptedFileTypes: '.pdf,.doc,.docx',
    },
  ];

  const handleEditField = (field: CustomField, index: number) => {
    // Create a copy to avoid direct state mutation
    // If forAllTeams is true but teams is missing, set it to include all teams for UI display
    const fieldCopy = { ...field };
    if (field.forAllTeams && !field.teams) {
      fieldCopy.teams = teams.map((team) => team._id);
    }

    setEditField(fieldCopy);
    setEditIndex(index);
    setIsEditModalOpen(true);
  };

  const handleDeleteField = (fieldId?: string) => {
    if (!fieldId) {
      toast.error('Cannot delete field without ID');
      return;
    }

    setDeleteFieldId(fieldId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteField = async () => {
    if (!deleteFieldId) return;

    try {
      const response = await fetch(
        `/api/admin/custom-fields/${deleteFieldId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete custom field');
      }

      // Remove the field from state after successful deletion
      setCustomFields(
        customFields.filter((field) => field._id !== deleteFieldId)
      );
      toast.success('Custom field deleted successfully');
    } catch (error) {
      console.error('Error deleting custom field:', error);
      toast.error(`Failed to delete custom field: ${(error as Error).message}`);
    } finally {
      setIsDeleteDialogOpen(false);
      setDeleteFieldId(null);
    }
  };

  const handleEditFieldChange = (field: keyof CustomField, value: any) => {
    if (!editField) return;

    // If referenceTab is being changed, auto-populate options
    if (field === 'referenceTab' && value) {
      const predefinedOptions = getOptionsByReferenceTab(value);
      setEditField({
        ...editField,
        [field]: value,
        options:
          predefinedOptions.length > 0 ? predefinedOptions : editField.options,
      });
      return;
    }

    setEditField({
      ...editField,
      [field]: value,
    });
  };

  const handleTeamSelection = (teamId: string) => {
    if (!editField) return;

    const currentTeams = [...(editField.teams || [])];
    const teamIndex = currentTeams.indexOf(teamId);

    if (teamIndex === -1) {
      // Add team if not already selected
      currentTeams.push(teamId);
    } else {
      // Remove team if already selected
      currentTeams.splice(teamIndex, 1);
    }

    setEditField({
      ...editField,
      teams: currentTeams,
    });
  };

  const handleSelectAllTeams = (selectAll: boolean) => {
    if (!editField) return;

    setEditField({
      ...editField,
      teams: selectAll ? teams.map((team) => team._id) : [],
    });
  };

  const handleForAllTeamsChange = (checked: boolean) => {
    if (!editField) return;

    if (checked) {
      // If forAllTeams is checked, select all teams for UI display
      // The API will remove the teams field when saved
      setEditField({
        ...editField,
        forAllTeams: true,
        teams: teams.map((team) => team._id),
      });
    } else {
      // If unchecked, keep the current team selection
      setEditField({
        ...editField,
        forAllTeams: false,
      });
    }
  };

  const validateField = (field: CustomField) => {
    if (!field.name || !field.label) {
      toast.error('Field must have a name and label');
      return false;
    }

    if (field.type === 'file' && !field.acceptedFileTypes) {
      toast.error('File fields must have accepted file types specified');
      return false;
    }

    if (
      (field.type === 'select' || field.type === 'multiselect') &&
      !field.referenceTab &&
      (!field.options || field.options.length === 0)
    ) {
      toast.error(
        'Select fields must have options or a reference tab specified'
      );
      return false;
    }

    if (
      field.type === 'number' &&
      field.validation?.min !== undefined &&
      field.validation?.max !== undefined
    ) {
      if (field.validation.min >= field.validation.max) {
        toast.error('Minimum value must be less than maximum value');
        return false;
      }
    }

    // If forAllTeams is true, we don't need to validate team selection
    if (!field.forAllTeams && (!field.teams || field.teams.length === 0)) {
      toast.error('Field must be assigned to at least one team');
      return false;
    }

    return true;
  };

  const saveField = async () => {
    if (!editField || !validateField(editField)) return;

    try {
      let response;

      if (editField._id) {
        // Update existing field
        response = await fetch(`/api/admin/custom-fields/${editField._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field: editField }),
        });
      } else {
        // Create new field
        response = await fetch('/api/admin/custom-fields', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field: editField }),
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save custom field');
      }

      const savedField = await response.json();

      if (editIndex !== null) {
        // Update existing field in state
        const updatedFields = [...customFields];
        updatedFields[editIndex] = savedField;
        setCustomFields(updatedFields);
      } else {
        // Add new field to state
        setCustomFields([...customFields, savedField]);
      }

      toast.success(
        `Custom field ${editField._id ? 'updated' : 'created'} successfully`
      );
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error saving custom field:', error);
      toast.error(`Failed to save custom field: ${(error as Error).message}`);
    }
  };

  if (loading) {
    return (
      <div className='flex justify-center items-center h-64'>
        {' '}
        <Loader />{' '}
      </div>
    );
  }

  return (
    <>
      <div className='flex justify-between items-center mb-8'>
        <div className='flex gap-4'>
          <Button
            onClick={handleAddField}
            variant='outline'
            className='flex items-center gap-2'
          >
            <PlusCircle className='w-4 h-4' />
            Add Custom Field
          </Button>

          <Select
            onValueChange={(value) => {
              const preset = presetFields.find((p) => p.name === value);
              if (preset) handleAddPresetField(preset);
            }}
          >
            <SelectTrigger className='w-48'>
              <SelectValue placeholder='Quick Add Preset' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='email'>📧 Email Address</SelectItem>
              <SelectItem value='firstName'>👤 First Name</SelectItem>
              <SelectItem value='lastName'>👤 Last Name</SelectItem>
              <SelectItem value='dateOfBirth'>📅 Date of Birth</SelectItem>
              <SelectItem value='gender'>⚧ Gender</SelectItem>
              <SelectItem value='nativeCountry'>🌍 Native Country</SelectItem>
              <SelectItem value='currentCountry'>🏠 Current Country</SelectItem>
              <SelectItem value='countryCode'>📞 Country Code</SelectItem>
              <SelectItem value='mobilePhone'>📱 Mobile Phone</SelectItem>
              <SelectItem value='nativeLanguage'>🗣️ Native Language</SelectItem>
              <SelectItem value='language2'>🗣️ Language 2</SelectItem>
              <SelectItem value='language3'>🗣️ Language 3</SelectItem>
              <SelectItem value='language4'>🗣️ Language 4</SelectItem>
              <SelectItem value='educationLevel'>🎓 Education Level</SelectItem>
              <SelectItem value='linguisticExperience'>
                💼 Linguistic Experience
              </SelectItem>
              <SelectItem value='yearsTranslationExperience'>
                📊 Years Translation Experience
              </SelectItem>
              <SelectItem value='fieldOfExpertise'>
                🎯 Field of Expertise
              </SelectItem>
              <SelectItem value='yearsFieldExperience'>
                📊 Years Field Experience
              </SelectItem>
              <SelectItem value='operatingSystems'>
                💻 Operating Systems
              </SelectItem>
              <SelectItem value='resumeUpload'>📄 Resume Upload</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='space-y-6'>
        {customFields.length === 0 ? (
          <Card>
            <CardContent className='py-10'>
              <div className='text-center'>
                <AlertCircle className='mx-auto h-10 w-10 text-gray-400' />
                <h3 className='mt-2 text-lg font-medium'>No custom fields</h3>
                <p className='mt-1 text-gray-500'>
                  Get started by creating a new custom field.
                </p>
                <Button onClick={handleAddField} className='mt-4'>
                  <PlusCircle className='mr-2 h-4 w-4' />
                  Add Field
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          customFields.map((field, index) => (
            <Card key={field._id || index}>
              <CardHeader>
                <CardTitle className='flex justify-between items-center'>
                  <span>{field.label || `Field #${index + 1}`}</span>
                  <div className='flex space-x-2'>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => handleEditField(field, index)}
                    >
                      <Edit className='w-4 h-4 text-blue-500' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => handleDeleteField(field._id)}
                    >
                      <Trash2 className='w-4 h-4 text-red-500' />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <div>
                    <Label className='font-medium'>Name:</Label>
                    <div className='mt-1'>{field.name}</div>
                  </div>

                  <div>
                    <Label className='font-medium'>Type:</Label>
                    <div className='mt-1 capitalize'>
                      {field.type.replace(/([A-Z])/g, ' $1')}
                    </div>
                  </div>

                  {field.placeholder && (
                    <div>
                      <Label className='font-medium'>Placeholder:</Label>
                      <div className='mt-1 text-gray-600 text-sm'>
                        {field.placeholder}
                      </div>
                    </div>
                  )}

                  {field.type === 'file' && field.acceptedFileTypes && (
                    <div>
                      <Label className='font-medium'>
                        Accepted File Types:
                      </Label>
                      <div className='mt-1'>{field.acceptedFileTypes}</div>
                    </div>
                  )}

                  {field.referenceTab && (
                    <div>
                      <Label className='font-medium'>Reference Tab:</Label>
                      <div className='mt-1'>
                        <Badge className='bg-indigo-100 text-indigo-800'>
                          {field.referenceTab}
                        </Badge>
                      </div>
                    </div>
                  )}

                  {(field.type === 'select' || field.type === 'multiselect') &&
                    field.options &&
                    field.options.length > 0 && (
                      <div className='md:col-span-2'>
                        <Label className='font-medium'>
                          {field.referenceTab
                            ? `Options (from ${field.referenceTab}):`
                            : 'Custom Options:'}
                        </Label>
                        <div className='mt-1 flex flex-wrap gap-1'>
                          {field.options.slice(0, 5).map((option, idx) => (
                            <Badge
                              key={idx}
                              className={
                                field.referenceTab
                                  ? 'bg-indigo-100 text-indigo-800 text-xs'
                                  : 'bg-gray-100 text-gray-800 text-xs'
                              }
                            >
                              {option}
                            </Badge>
                          ))}
                          {field.options.length > 5 && (
                            <Badge
                              className={
                                field.referenceTab
                                  ? 'bg-indigo-100 text-indigo-800 text-xs'
                                  : 'bg-gray-100 text-gray-800 text-xs'
                              }
                            >
                              +{field.options.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                  <div className='flex items-center gap-4'>
                    <div>
                      <Label className='font-medium'>Status:</Label>
                      <div className='mt-1'>
                        <Badge
                          className={
                            field.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }
                        >
                          {field.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className='md:col-span-2'>
                    <Label className='font-medium'>Teams:</Label>
                    <div className='mt-1 flex flex-wrap gap-1'>
                      {field.forAllTeams ? (
                        <Badge className='bg-blue-100 text-blue-800'>
                          All Teams (Global)
                        </Badge>
                      ) : field.teams?.length === teams.length ? (
                        <Badge className='bg-blue-100 text-blue-800'>
                          All Teams
                        </Badge>
                      ) : (
                        field.teams?.map((teamId) => {
                          const team = teams.find((t) => t._id === teamId);
                          return team ? (
                            <Badge
                              key={teamId}
                              className='bg-blue-100 text-blue-800'
                            >
                              {team.name}
                            </Badge>
                          ) : null;
                        })
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Enhanced Edit/Add Field Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className='max-w-3xl w-[85vw] h-[75vh] p-0 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 border-0 shadow-2xl overflow-hidden'>
          {/* Custom gradient border */}
          <div className='absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 p-[2px] rounded-lg'>
            <div className='bg-white h-full w-full rounded-lg flex flex-col'>
              {/* Header with gradient */}
              <div className='bg-gradient-to-r from-purple-100 via-pink-100 to-blue-100 p-4 border-b border-gray-100'>
                <div className='flex items-center justify-between'>
                  <div>
                    <DialogTitle className='text-xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent'>
                      {editField?._id ? 'Edit Field' : 'Create New Field'}
                    </DialogTitle>
                    <DialogDescription className='text-sm text-gray-600'>
                      {editField?._id
                        ? 'Make changes to your field below.'
                        : 'Fill in the details for your new custom field.'}
                    </DialogDescription>
                  </div>
                </div>
              </div>

              {/* Scrollable content area */}
              <div className='flex-1 overflow-y-auto'>
                {editField && (
                  <div className='p-5 space-y-5'>
                    {/* Basic Information Section */}
                    <div className='bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-100'>
                      <h3 className='text-base font-semibold text-gray-800 mb-3 flex items-center'>
                        <div className='w-1.5 h-1.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mr-2'></div>
                        Basic Information
                      </h3>
                      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                        <div className='space-y-1'>
                          <Label
                            htmlFor='name'
                            className='text-sm font-medium text-gray-700'
                          >
                            Field Name
                          </Label>
                          <Input
                            id='name'
                            value={editField.name}
                            onChange={(e) =>
                              handleEditFieldChange('name', e.target.value)
                            }
                            className='border-purple-200 focus:border-purple-400 focus:ring-purple-200 h-9'
                            placeholder='e.g., githubProfile'
                          />
                        </div>

                        <div className='space-y-1'>
                          <Label
                            htmlFor='label'
                            className='text-sm font-medium text-gray-700'
                          >
                            Display Label
                          </Label>
                          <Input
                            id='label'
                            value={editField.label}
                            onChange={(e) =>
                              handleEditFieldChange('label', e.target.value)
                            }
                            className='border-purple-200 focus:border-purple-400 focus:ring-purple-200 h-9'
                            placeholder='e.g., GitHub Profile'
                          />
                        </div>
                      </div>
                    </div>

                    {/* Field Configuration Section */}
                    <div className='bg-gradient-to-r from-pink-50 to-blue-50 p-4 rounded-lg border border-pink-100'>
                      <h3 className='text-base font-semibold text-gray-800 mb-3 flex items-center'>
                        <div className='w-1.5 h-1.5 bg-gradient-to-r from-pink-500 to-blue-500 rounded-full mr-2'></div>
                        Configuration
                      </h3>
                      <div className='space-y-4'>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                          <div className='space-y-1'>
                            <Label
                              htmlFor='type'
                              className='text-sm font-medium text-gray-700'
                            >
                              Field Type
                            </Label>
                            <Select
                              value={editField.type}
                              onValueChange={(value: any) =>
                                handleEditFieldChange('type', value)
                              }
                            >
                              <SelectTrigger className='border-pink-200 focus:border-pink-400 focus:ring-pink-200 h-9'>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value='text'>Text</SelectItem>
                                <SelectItem value='email'>Email</SelectItem>
                                <SelectItem value='phone'>
                                  Phone Number
                                </SelectItem>
                                <SelectItem value='link'>Link/URL</SelectItem>
                                <SelectItem value='number'>Number</SelectItem>
                                <SelectItem value='date'>Date</SelectItem>
                                <SelectItem value='select'>
                                  Dropdown/Select
                                </SelectItem>
                                <SelectItem value='multiselect'>
                                  Multi-Select
                                </SelectItem>
                                <SelectItem value='boolean'>Yes/No</SelectItem>
                                <SelectItem value='array'>
                                  Array (comma-separated)
                                </SelectItem>
                                <SelectItem value='file'>
                                  File Upload
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className='space-y-1'>
                            <Label
                              htmlFor='placeholder'
                              className='text-sm font-medium text-gray-700'
                            >
                              Placeholder
                            </Label>
                            <Input
                              id='placeholder'
                              value={editField.placeholder || ''}
                              onChange={(e) =>
                                handleEditFieldChange(
                                  'placeholder',
                                  e.target.value
                                )
                              }
                              className='border-pink-200 focus:border-pink-400 focus:ring-pink-200 h-9'
                              placeholder='e.g., Enter your email address'
                            />
                          </div>
                        </div>

                        {/* File Type Configuration */}
                        {editField.type === 'file' && (
                          <div className='space-y-1'>
                            <Label
                              htmlFor='acceptedFileTypes'
                              className='text-sm font-medium text-gray-700'
                            >
                              Accepted File Types
                            </Label>
                            <Input
                              id='acceptedFileTypes'
                              value={editField.acceptedFileTypes || ''}
                              onChange={(e) =>
                                handleEditFieldChange(
                                  'acceptedFileTypes',
                                  e.target.value
                                )
                              }
                              className='border-pink-200 focus:border-pink-400 focus:ring-pink-200 h-9'
                              placeholder='.pdf,.doc,.docx'
                            />
                          </div>
                        )}

                        {/* Date Format Configuration */}
                        {editField.type === 'date' && (
                          <div className='space-y-1'>
                            <Label
                              htmlFor='dateFormat'
                              className='text-sm font-medium text-gray-700'
                            >
                              Date Format
                            </Label>
                            <Select
                              value={
                                editField.validation?.dateFormat || 'MM/DD/YYYY'
                              }
                              onValueChange={(value) =>
                                handleEditFieldChange('validation', {
                                  ...(editField.validation || {}),
                                  dateFormat: value,
                                })
                              }
                            >
                              <SelectTrigger className='border-pink-200 focus:border-pink-400 focus:ring-pink-200 h-9'>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value='MM/DD/YYYY'>
                                  MM/DD/YYYY
                                </SelectItem>
                                <SelectItem value='DD/MM/YYYY'>
                                  DD/MM/YYYY
                                </SelectItem>
                                <SelectItem value='YYYY-MM-DD'>
                                  YYYY-MM-DD
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Number Range Configuration */}
                        {editField.type === 'number' && (
                          <div className='grid grid-cols-2 gap-4'>
                            <div className='space-y-1'>
                              <Label
                                htmlFor='minValue'
                                className='text-sm font-medium text-gray-700'
                              >
                                Min Value
                              </Label>
                              <Input
                                id='minValue'
                                type='number'
                                value={editField.validation?.min || ''}
                                onChange={(e) =>
                                  handleEditFieldChange('validation', {
                                    ...(editField.validation || {}),
                                    min: e.target.value
                                      ? parseInt(e.target.value)
                                      : undefined,
                                  })
                                }
                                className='border-pink-200 focus:border-pink-400 focus:ring-pink-200 h-9'
                                placeholder='0'
                              />
                            </div>
                            <div className='space-y-1'>
                              <Label
                                htmlFor='maxValue'
                                className='text-sm font-medium text-gray-700'
                              >
                                Max Value
                              </Label>
                              <Input
                                id='maxValue'
                                type='number'
                                value={editField.validation?.max || ''}
                                onChange={(e) =>
                                  handleEditFieldChange('validation', {
                                    ...(editField.validation || {}),
                                    max: e.target.value
                                      ? parseInt(e.target.value)
                                      : undefined,
                                  })
                                }
                                className='border-pink-200 focus:border-pink-400 focus:ring-pink-200 h-9'
                                placeholder='100'
                              />
                            </div>
                          </div>
                        )}

                        {/* Reference Tab Configuration */}
                        {(editField.type === 'select' ||
                          editField.type === 'multiselect') && (
                          <div className='space-y-1'>
                            <Label
                              htmlFor='referenceTab'
                              className='text-sm font-medium text-gray-700'
                            >
                              Reference Tab (Optional)
                            </Label>
                            <Select
                              value={editField.referenceTab || ''}
                              onValueChange={(value) =>
                                handleEditFieldChange(
                                  'referenceTab',
                                  value || ''
                                )
                              }
                            >
                              <SelectTrigger className='border-pink-200 focus:border-pink-400 focus:ring-pink-200 h-9'>
                                <SelectValue placeholder='Select predefined options' />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value='custom'>
                                  None (Custom Options)
                                </SelectItem>
                                {getAvailableReferenceTabs().map((tab) => (
                                  <SelectItem key={tab} value={tab}>
                                    {tab} (
                                    {PREDEFINED_OPTIONS[
                                      tab as keyof typeof PREDEFINED_OPTIONS
                                    ]?.length || 0}{' '}
                                    options)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className='text-xs text-gray-500'>
                              Select to auto-populate with predefined options
                            </p>
                          </div>
                        )}

                        <div className='flex items-center space-x-4'>
                          <div className='flex items-center space-x-2'>
                            <Switch
                              id='isActive'
                              checked={editField.isActive}
                              onCheckedChange={(checked) =>
                                handleEditFieldChange('isActive', checked)
                              }
                            />
                            <Label
                              htmlFor='isActive'
                              className='text-sm font-medium text-gray-700'
                            >
                              Active
                            </Label>
                          </div>
                          <div className='flex items-center space-x-2'>
                            <Switch
                              id='isRequired'
                              checked={editField.isRequired}
                              onCheckedChange={(checked) =>
                                handleEditFieldChange('isRequired', checked)
                              }
                            />
                            <Label
                              htmlFor='isRequired'
                              className='text-sm font-medium text-gray-700'
                            >
                              Required
                            </Label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Options Configuration Section */}
                    {(editField.type === 'select' ||
                      editField.type === 'multiselect') && (
                      <div className='bg-gradient-to-r from-green-50 to-teal-50 p-4 rounded-lg border border-green-100'>
                        <h3 className='text-base font-semibold text-gray-800 mb-3 flex items-center'>
                          <div className='w-1.5 h-1.5 bg-gradient-to-r from-green-500 to-teal-500 rounded-full mr-2'></div>
                          Options Configuration
                        </h3>
                        <div className='space-y-3'>
                          {editField.referenceTab ? (
                            <div>
                              <Label className='text-sm font-medium text-gray-700'>
                                Auto-populated from: {editField.referenceTab}
                              </Label>
                              <div className='mt-1 p-3 bg-green-100 border border-green-200 rounded text-sm'>
                                <div className='flex items-center gap-2 mb-2'>
                                  <span className='text-green-700 font-medium'>
                                    ✓ {editField.options?.length || 0} options
                                    loaded automatically
                                  </span>
                                  <Button
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    onClick={() =>
                                      handleEditFieldChange('referenceTab', '')
                                    }
                                    className='h-6 text-xs'
                                  >
                                    Clear Reference
                                  </Button>
                                </div>
                                <div className='max-h-20 overflow-y-auto text-gray-600'>
                                  <span className='text-xs'>
                                    {editField.options?.slice(0, 5).join(', ')}
                                    {(editField.options?.length || 0) > 5 &&
                                      ` ... and ${(editField.options?.length || 0) - 5} more`}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <Label className='text-sm font-medium text-gray-700'>
                                Custom Options (one per line)
                              </Label>
                              <textarea
                                value={(editField.options || []).join('\n')}
                                onChange={(e) =>
                                  handleEditFieldChange(
                                    'options',
                                    e.target.value
                                      .split('\n')
                                      .filter((opt) => opt.trim())
                                  )
                                }
                                className='w-full h-24 p-2 border border-green-200 rounded focus:border-green-400 focus:ring-green-200 text-sm'
                                placeholder='Woman&#10;Man&#10;Non-binary&#10;Prefer not to say&#10;Other'
                              />
                              <p className='text-xs text-gray-500'>
                                Enter each option on a new line, or select a
                                Reference Tab above for predefined options.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Team Assignment Section */}
                    <div className='bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-100'>
                      <h3 className='text-base font-semibold text-gray-800 mb-3 flex items-center'>
                        <div className='w-1.5 h-1.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mr-2'></div>
                        Team Assignment
                      </h3>

                      <div className='space-y-3'>
                        <div className='flex items-center space-x-2 p-3 bg-white/60 rounded-lg border border-blue-100'>
                          <Checkbox
                            id='forAllTeams'
                            checked={editField.forAllTeams}
                            onCheckedChange={handleForAllTeamsChange}
                            className='border-blue-300'
                          />
                          <div>
                            <Label
                              htmlFor='forAllTeams'
                              className='text-sm font-medium text-gray-700'
                            >
                              Available to All Teams
                            </Label>
                            <p className='text-xs text-gray-500'>
                              Current and future teams
                            </p>
                          </div>
                        </div>

                        <div
                          className={`transition-all duration-300 ${editField.forAllTeams ? 'opacity-40 pointer-events-none' : ''}`}
                        >
                          <div className='flex items-center space-x-2 mb-3'>
                            <Checkbox
                              id='select-all-teams'
                              checked={editField.teams?.length === teams.length}
                              onCheckedChange={(checked) =>
                                handleSelectAllTeams(!!checked)
                              }
                              disabled={editField.forAllTeams}
                              className='border-blue-300'
                            />
                            <Label
                              htmlFor='select-all-teams'
                              className='text-sm font-medium text-gray-700'
                            >
                              Select All Teams
                            </Label>
                          </div>

                          <div className='grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto'>
                            {teams.map((team) => (
                              <div
                                key={team._id}
                                className='flex items-center space-x-2 p-2 bg-white/60 rounded border border-blue-50 hover:bg-white/80 transition-colors'
                              >
                                <Checkbox
                                  id={`team-${team._id}`}
                                  checked={
                                    editField.teams?.includes(team._id) || false
                                  }
                                  onCheckedChange={(checked) =>
                                    checked !== 'indeterminate' &&
                                    handleTeamSelection(team._id)
                                  }
                                  disabled={editField.forAllTeams}
                                  className='border-blue-300'
                                />
                                <Label
                                  htmlFor={`team-${team._id}`}
                                  className='text-xs text-gray-700 truncate'
                                  title={team.name}
                                >
                                  {team.name}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer with gradient */}
              <div className='bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 p-4 border-t border-gray-100'>
                <div className='flex justify-end space-x-3'>
                  <Button
                    variant='outline'
                    onClick={() => setIsEditModalOpen(false)}
                    className='border-gray-300 hover:bg-gray-50 h-9'
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={saveField}
                    className='bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 hover:from-purple-600 hover:via-pink-600 hover:to-blue-600 text-white border-0 shadow-lg h-9'
                  >
                    {editField?._id ? 'Save Changes' : 'Create Field'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              custom field and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteField}
              className='bg-red-600 hover:bg-red-700'
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CustomFieldsPage;
