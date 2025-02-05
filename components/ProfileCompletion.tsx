import React, { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, ChevronRight } from 'lucide-react';

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

interface ProfileCompletionProps {
  userData: UserData | null;
  customFields: CustomField[];
}

interface CompletionStats {
  percentage: number;
  totalFieldsFilled: number;
  totalFields: number;
  missingRequired: string[];
  missingRecommended: string[];
  missingCustomRequired: string[];
}

const ProfileCompletion: React.FC<ProfileCompletionProps> = ({
  userData,
  customFields = [],
}) => {
  const calculateCompletion = useMemo((): CompletionStats => {
    if (!userData) {
      return {
        percentage: 0,
        totalFieldsFilled: 0,
        totalFields: 0,
        missingRequired: [],
        missingRecommended: [],
        missingCustomRequired: [],
      };
    }

    const fields = {
      required: [
        { name: 'name', value: userData.name },
        { name: 'email', value: userData.email },
      ],
      recommended: [
        { name: 'phone', value: userData.phone },
        { name: 'location', value: userData.location },
        { name: 'linkedin', value: userData.linkedin },
        { name: 'domain', value: (userData.domain || []).length > 0 },
        { name: 'languages', value: (userData.lang || []).length > 0 },
        { name: 'resume', value: userData.resume },
        { name: 'nda', value: userData.nda },
      ],
      custom: customFields
        .filter((field): field is CustomField => field.isActive)
        .map((field) => ({
          name: field.label,
          value: userData.customFields?.[field.name],
          required: field.isRequired,
        })),
    };

    // Count filled fields
    const requiredFilled = fields.required.filter((f) => !!f.value).length;
    const recommendedFilled = fields.recommended.filter(
      (f) => !!f.value
    ).length;
    const requiredCustomFilled = fields.custom.filter(
      (f) => f.required && !!f.value
    ).length;
    const optionalCustomFilled = fields.custom.filter(
      (f) => !f.required && !!f.value
    ).length;

    // Calculate totals
    const totalRequired =
      fields.required.length + fields.custom.filter((f) => f.required).length;
    const totalOptional =
      fields.recommended.length +
      fields.custom.filter((f) => !f.required).length;
    const totalFieldsFilled =
      requiredFilled +
      recommendedFilled +
      requiredCustomFilled +
      optionalCustomFilled;
    const totalFields = totalRequired + totalOptional;

    // Calculate percentage with safeguard against division by zero
    const percentage =
      totalFields === 0
        ? 0
        : Math.round((totalFieldsFilled / totalFields) * 100);

    return {
      percentage,
      totalFieldsFilled,
      totalFields,
      missingRequired: fields.required
        .filter((f) => !f.value)
        .map((f) => f.name),
      missingRecommended: fields.recommended
        .filter((f) => !f.value)
        .map((f) => f.name),
      missingCustomRequired: fields.custom
        .filter((f) => f.required && !f.value)
        .map((f) => f.name),
    };
  }, [userData, customFields]);

  const getCompletionMessage = (percentage: number): string => {
    if (percentage < 40) return 'Your profile needs attention';
    if (percentage < 70) return 'Your profile is coming along';
    if (percentage < 100) return 'Almost there!';
    return 'Profile complete!';
  };

  const getMissingFieldsMessage = (): string[] => {
    const messages: string[] = [];

    if (calculateCompletion.missingRequired.length > 0) {
      messages.push(
        `Required fields missing: ${calculateCompletion.missingRequired.join(', ')}`
      );
    }
    if (calculateCompletion.missingCustomRequired.length > 0) {
      messages.push(
        `Required custom fields missing: ${calculateCompletion.missingCustomRequired.join(', ')}`
      );
    }
    if (calculateCompletion.missingRecommended.length > 0) {
      messages.push(
        `Recommended fields to complete: ${calculateCompletion.missingRecommended.join(', ')}`
      );
    }

    return messages;
  };

  return (
    <div className='w-full space-y-4 mb-8'>
      <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
        <div className='flex items-center gap-3'>
          {calculateCompletion.percentage === 100 ? (
            <CheckCircle className='w-5 h-5 text-[#22C55E]' />
          ) : (
            <AlertCircle className='w-5 h-5 text-[#FFA500]' />
          )}
          <div>
            <h2 className='text-lg font-semibold text-[#1a1a1a]'>
              Profile Completion
            </h2>
            <p className='text-sm text-[#6b7280]'>
              {calculateCompletion.totalFieldsFilled} of{' '}
              {calculateCompletion.totalFields} fields completed
            </p>
          </div>
        </div>
        <div className='text-lg font-semibold text-[#1a1a1a]'>
          {calculateCompletion.percentage}%
        </div>
      </div>

      <div className='relative w-full h-2'>
        <div className='absolute w-full h-full bg-[#E5E7EB] rounded-full' />
        <div
          className='absolute h-full bg-[#22C55E] rounded-full transition-all duration-500 ease-in-out'
          style={{ width: `${calculateCompletion.percentage}%` }}
        />
      </div>

      <div>
        <p className='text-[#4b5563] mb-2'>
          {getCompletionMessage(calculateCompletion.percentage)}
        </p>
        {calculateCompletion.percentage < 100 && (
          <div className='space-y-1'>
            {getMissingFieldsMessage().map((message, index) => (
              <div key={index} className='flex items-start gap-2'>
                <ChevronRight className='w-4 h-4 mt-0.5 flex-shrink-0 text-[#9ca3af]' />
                <p className='text-sm text-[#6b7280]'>{message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileCompletion;
