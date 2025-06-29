'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileUpload } from '@/components/FileUpload';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';

// Updated interface to match the complete CustomField definition
interface CustomField {
  _id: string;
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

interface CustomFieldsProps {
  fields: CustomField[];
  values: { [key: string]: any };
  onChange: (name: string, value: any) => void;
  onFileUpload: (name: string, url: string) => Promise<void>;
  userId: string;
}

const CustomFields: React.FC<CustomFieldsProps> = ({
  fields,
  values = {},
  onChange,
  onFileUpload,
  userId,
}) => {
  const activeFields = fields.filter((field) => field.isActive);

  const handleInputChange = (field: CustomField, value: string) => {
    console.log('Field change:', field.name, value);

    let processedValue: string | string[];

    if (field.type === 'array') {
      processedValue = value.split(',').map((item) => item.trim());
    } else {
      processedValue = value;
    }

    onChange(field.name, processedValue);
  };

  const handleSelectChange = (field: CustomField, value: string) => {
    onChange(field.name, value);
  };

  const handleMultiSelectChange = (
    field: CustomField,
    option: string,
    checked: boolean
  ) => {
    const currentValues = Array.isArray(values[field.name])
      ? values[field.name]
      : [];
    let newValues;

    if (checked) {
      newValues = [...currentValues, option];
    } else {
      newValues = currentValues.filter((v: string) => v !== option);
    }

    onChange(field.name, newValues);
  };

  const renderField = (field: CustomField) => {
    const currentValue = values[field.name];

    switch (field.type) {
      case 'file':
        return (
          <FileUpload
            uploadType='pdfUploader'
            label={field.label}
            accept={field.acceptedFileTypes || ''}
            onUploadComplete={(url) => onFileUpload(field.name, url)}
            currentFile={currentValue}
          />
        );

      case 'select':
        return (
          <Select
            value={currentValue || ''}
            onValueChange={(value) => handleSelectChange(field, value)}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  field.placeholder || `Select ${field.label.toLowerCase()}`
                }
              />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multiselect':
        const selectedValues = Array.isArray(currentValue) ? currentValue : [];
        return (
          <div className='space-y-2'>
            {field.options?.map((option) => (
              <div key={option} className='flex items-center space-x-2'>
                <Checkbox
                  id={`${field.name}-${option}`}
                  checked={selectedValues.includes(option)}
                  onCheckedChange={(checked) =>
                    handleMultiSelectChange(field, option, !!checked)
                  }
                />
                <Label htmlFor={`${field.name}-${option}`} className='text-sm'>
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );

      case 'boolean':
        return (
          <div className='flex items-center space-x-2'>
            <Switch
              id={field.name}
              checked={!!currentValue}
              onCheckedChange={(checked) => onChange(field.name, checked)}
            />
            <Label htmlFor={field.name} className='text-sm'>
              {currentValue ? 'Yes' : 'No'}
            </Label>
          </div>
        );

      case 'date':
        return (
          <Input
            id={field.name}
            name={field.name}
            type='date'
            value={currentValue || ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            className='w-full'
          />
        );

      case 'number':
        return (
          <Input
            id={field.name}
            name={field.name}
            type='number'
            value={currentValue || ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            min={field.validation?.min}
            max={field.validation?.max}
            placeholder={
              field.placeholder || `Enter ${field.label.toLowerCase()}`
            }
            className='w-full'
          />
        );

      case 'email':
        return (
          <Input
            id={field.name}
            name={field.name}
            type='email'
            value={currentValue || ''}
            onChange={(e) => handleInputChange(field, e.target.value)}
            placeholder={
              field.placeholder || `Enter ${field.label.toLowerCase()}`
            }
            className='w-full'
          />
        );

      case 'phone':
        return (
          <Input
            id={field.name}
            name={field.name}
            type='tel'
            value={currentValue || ''}
            onChange={(e) => handleInputChange(field, e.target.value)}
            placeholder={
              field.placeholder || `Enter ${field.label.toLowerCase()}`
            }
            className='w-full'
          />
        );

      case 'array':
        const arrayValue = Array.isArray(currentValue)
          ? currentValue.join(', ')
          : '';
        return (
          <Input
            id={field.name}
            name={field.name}
            value={arrayValue}
            onChange={(e) => handleInputChange(field, e.target.value)}
            placeholder={
              field.placeholder ||
              `Enter ${field.label.toLowerCase()} (comma-separated)`
            }
            className='w-full'
          />
        );

      case 'link':
        return (
          <Input
            id={field.name}
            name={field.name}
            type='url'
            value={currentValue || ''}
            onChange={(e) => handleInputChange(field, e.target.value)}
            placeholder={
              field.placeholder || `Enter ${field.label.toLowerCase()}`
            }
            className='w-full'
          />
        );

      default: // 'text'
        return (
          <Input
            id={field.name}
            name={field.name}
            type='text'
            value={currentValue || ''}
            onChange={(e) => handleInputChange(field, e.target.value)}
            placeholder={
              field.placeholder || `Enter ${field.label.toLowerCase()}`
            }
            className='w-full'
          />
        );
    }
  };

  return (
    <div className='space-y-4'>
      {activeFields.map((field) => (
        <div key={field._id} className='space-y-2'>
          <Label htmlFor={field.name}>
            {field.label}
            {field.isRequired && <span className='text-red-500 ml-1'>*</span>}
          </Label>
          {renderField(field)}
        </div>
      ))}
    </div>
  );
};

export default CustomFields;
