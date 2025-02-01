'use client';
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { useSession } from 'next-auth/react';
import ProfileCompletionDialog from './ProfileCompletionDialog';

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

interface CompletionStats {
  percentage: number;
  totalFieldsFilled: number;
  totalFields: number;
  missingRequired: string[];
  missingRecommended: string[];
  missingCustomRequired: string[];
}

interface ProfileCompletionContextType {
  // Add any context values you want to expose
}

interface ProfileCompletionProviderProps {
  children: ReactNode;
}

const ProfileCompletionContext = createContext<ProfileCompletionContextType>(
  {}
);

export function ProfileCompletionProvider({
  children,
}: ProfileCompletionProviderProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [completionData, setCompletionData] = useState<CompletionStats | null>(
    null
  );
  const { data: session } = useSession();

  useEffect(() => {
    const checkProfile = async () => {
      if (session?.user?.id) {
        try {
          // Fetch user data
          const userResponse = await fetch(
            `/api/users/profile/${session.user.id}`
          );
          if (!userResponse.ok) throw new Error('Failed to fetch user data');
          const userData: UserData = await userResponse.json();
          if (userData.role !== 'annotator') {
            return;
          }
          // Fetch custom fields
          const fieldsResponse = await fetch('/api/admin/custom-fields');
          if (!fieldsResponse.ok)
            throw new Error('Failed to fetch custom fields');
          const customFields: CustomField[] = await fieldsResponse.json();

          // Calculate completion stats
          const stats = calculateCompletion(userData, customFields);

          // Show dialog if profile is incomplete
          if (stats.percentage < 100) {
            setCompletionData(stats);
            setShowDialog(true);
          }
        } catch (error) {
          console.error('Error checking profile completion:', error);
        }
      }
    };

    checkProfile();
  }, [session]);

  const calculateCompletion = (
    userData: UserData,
    customFields: CustomField[]
  ): CompletionStats => {
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
        .filter((field: CustomField) => field.isActive)
        .map((field: CustomField) => ({
          name: field.label,
          value: userData.customFields?.[field.name],
          required: field.isRequired,
        })),
    };

    // Count filled fields
    const requiredFilled = fields.required.filter(
      (f: { value: any }) => !!f.value
    ).length;
    const recommendedFilled = fields.recommended.filter(
      (f: { value: any }) => !!f.value
    ).length;
    const requiredCustomFilled = fields.custom.filter(
      (f: { required: boolean; value: any }) => f.required && !!f.value
    ).length;
    const optionalCustomFilled = fields.custom.filter(
      (f: { required: boolean; value: any }) => !f.required && !!f.value
    ).length;

    // Calculate totals
    const totalRequired =
      fields.required.length +
      fields.custom.filter((f: { required: boolean }) => f.required).length;
    const totalOptional =
      fields.recommended.length +
      fields.custom.filter((f: { required: boolean }) => !f.required).length;
    const totalFieldsFilled =
      requiredFilled +
      recommendedFilled +
      requiredCustomFilled +
      optionalCustomFilled;
    const totalFields = totalRequired + totalOptional;

    // Calculate percentage
    const percentage =
      totalFields === 0
        ? 0
        : Math.round((totalFieldsFilled / totalFields) * 100);

    return {
      percentage,
      totalFieldsFilled,
      totalFields,
      missingRequired: fields.required
        .filter((f: { value: any }) => !f.value)
        .map((f: { name: string }) => f.name),
      missingRecommended: fields.recommended
        .filter((f: { value: any }) => !f.value)
        .map((f: { name: string }) => f.name),
      missingCustomRequired: fields.custom
        .filter(
          (f: { required: boolean; value: any }) => f.required && !f.value
        )
        .map((f: { name: string }) => f.name),
    };
  };

  return (
    <ProfileCompletionContext.Provider value={{}}>
      {children}
      {completionData && (
        <ProfileCompletionDialog
          isOpen={showDialog}
          onClose={() => setShowDialog(false)}
          completionData={completionData}
        />
      )}
    </ProfileCompletionContext.Provider>
  );
}
