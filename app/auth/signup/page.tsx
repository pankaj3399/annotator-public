'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InvitationStep from '@/components/invitationStep';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import Combobox from '@/components/ui/combobox';
import { domains, languages, locations } from '@/lib/constants';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Pencil,
  Building2,
  CheckCircle2,
  DollarSign,
  Clock,
  Database,
  FileSpreadsheet,
  Globe,
  MapPin,
  Mail,
  Users,
  Briefcase,
  Lock,
  FlaskConical,
  BarChart,
  LineChart,
  Brain,
  Shield,
} from 'lucide-react';
import MultiCombobox from '@/components/ui/multi-combobox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getTestTemplateTasks, createTestTasks } from '@/app/actions/task';
import { getTeams } from '@/app/actions/team';
import { Checkbox } from '@/components/ui/checkbox';
import Loader from '@/components/ui/NewLoader/Loader';
import AcoladPolicyDialog from '@/components/AcoladPolicyDialog';

interface Option {
  value: string;
  label: string;
}

interface Team {
  _id: string;
  name: string;
  description: string | null;
  logo: string | null;
}

type Step = 'role' | 'invitation' | 'details';
type UserRole =
  | 'annotator'
  | 'project manager'
  | 'agency owner'
  | 'data scientist';

// Custom Team Select Component with Logo Support
interface TeamSelectProps {
  teams: Team[];
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

// Removed the TeamSelect component since we're using inline Select now

// This internal component uses searchParams
function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Get URL parameters if they exist
  const roleParam = searchParams.get('role');
  const teamParam = searchParams.get('team');

  // Determine initial step based on URL parameters
  const initialStep = roleParam ? 'details' : 'role';

  const [step, setStep] = useState<Step>(initialStep);
  const [invitationMode, setInvitationMode] = useState<'enter' | 'request'>(
    'enter'
  );
  const [isRequestSubmitted, setIsRequestSubmitted] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);

  // Acolad policy states
  const [showAcoladDialog, setShowAcoladDialog] = useState(false);
  const [acoladPolicyAccepted, setAcoladPolicyAccepted] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    'google' | 'submit' | null
  >(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: roleParam || '',
    name: '',
    phone: '',
    domain: [] as string[],
    lang: [] as string[],
    location: '',
    invitationCode: '',
    linkedin: '',
    resume: '',
    nda: '',
    team_id: teamParam || '',
    termsAccepted: false,
  });

  // Determine if team selection should be disabled
  const isTeamSelectionDisabled = !!teamParam;

  // Check if selected team is Acolad
  const isAcoladTeam = () => {
    const selectedTeam = teams.find((team) => team._id === formData.team_id);
    return selectedTeam?.name?.toLowerCase() === 'acolad';
  };

  // Fetch teams when component mounts
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);
        const data = await getTeams();
        setTeams(data);
      } catch (error) {
        console.error('Error fetching teams:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  const domainOptions: Option[] = domains.map((domain) => ({
    value: domain.toLowerCase(),
    label: domain,
  }));
  const languageOptions: Option[] = languages.map((lang) => ({
    value: lang.toLowerCase(),
    label: lang,
  }));
  const locationOptions: Option[] = locations.map((location) => ({
    value: location.toLowerCase(),
    label: location,
  }));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleRoleSelect = (selectedRole: UserRole) => {
    setFormData({ ...formData, role: selectedRole });
    setStep(selectedRole === 'project manager' ? 'invitation' : 'details');
  };

  // Handle team selection with Acolad check
  const handleTeamSelection = (teamId: string) => {
    setFormData({ ...formData, team_id: teamId });

    // Reset Acolad policy acceptance when team changes
    if (acoladPolicyAccepted) {
      setAcoladPolicyAccepted(false);
    }
  };

  // Check for Acolad team before proceeding with action
  const checkAcoladPolicyAndProceed = (action: 'google' | 'submit') => {
    if (isAcoladTeam() && !acoladPolicyAccepted) {
      setPendingAction(action);
      setShowAcoladDialog(true);
      return false;
    }
    return true;
  };

  // Handle Acolad policy acceptance
  const handleAcoladPolicyAcceptance = () => {
    setAcoladPolicyAccepted(true);
    setShowAcoladDialog(false);

    // Execute the pending action
    if (pendingAction === 'google') {
      executeGoogleSignIn();
    } else if (pendingAction === 'submit') {
      executeFormSubmit();
    }
    setPendingAction(null);
  };

  const handleGoogleSignIn = async () => {
    // Check Acolad policies first
    if (!checkAcoladPolicyAndProceed('google')) {
      return;
    }

    await executeGoogleSignIn();
  };

  const executeGoogleSignIn = async () => {
    try {
      console.log('Google sign-in button clicked');
      console.log('Current form data:', {
        role: formData.role,
        team_id: formData.team_id,
      });

      // For annotators, require team selection
      if (
        (formData.role === 'annotator' || formData.role === 'data scientist') &&
        !formData.team_id
      ) {
        console.log('Team ID missing, showing error');
        toast({
          variant: 'destructive',
          title: 'Team Selection Required',
          description: 'Please select a team before signing in with Google.',
        });
        return;
      }

      // Ensure we're properly setting the team in the URL
      const callbackUrl = new URL('/dashboard', window.location.origin);

      // Add the team parameter only if we have one
      if (formData.team_id) {
        console.log('Adding team ID to callback URL:', formData.team_id);
        callbackUrl.searchParams.set('team', formData.team_id);
      }

      console.log('Final callback URL:', callbackUrl.toString());

      // Also save team ID in localStorage as a backup mechanism
      if (formData.team_id) {
        console.log('Saving team ID in localStorage:', formData.team_id);
        localStorage.setItem('signup_team_id', formData.team_id);
      }

      // Use NextAuth signIn with Google provider and the callbackUrl as a string
      console.log('Calling NextAuth signIn with Google provider');
      const result = await signIn('google', {
        callbackUrl: callbackUrl.toString(),
        redirect: true,
      });

      if (result?.error) {
        console.error('Google sign-in error:', result.error);
        toast({
          variant: 'destructive',
          title: 'Authentication failed',
          description: 'Failed to sign in with Google. Please try again.',
        });
      }
    } catch (error) {
      console.error('Exception in Google sign-in:', error);
      toast({
        variant: 'destructive',
        title: 'Authentication failed',
        description: 'An unexpected error occurred. Please try again.',
      });
    }
  };

  async function assignTestTasksToAnnotator(annotatorId: string) {
    try {
      const testTasksResponse = await getTestTemplateTasks();
      const testTasksData = JSON.parse(testTasksResponse);

      if (!testTasksData.success || !testTasksData.tasks.length) {
        return;
      }

      const tasksToCreate = testTasksData.tasks.map((testTask: any) => {
        const task = {
          project: testTask.project,
          name: testTask.name.replace('undefined', ''),
          content: testTask.content,
          timer: testTask.timer || 0,
          annotator: annotatorId,
          reviewer: null,
          project_Manager: testTask.project_Manager,
          submitted: false,
          status: 'pending',
          timeTaken: 0,
          feedback: '',
          template: testTask.template,
          ai: null,
        };

        return task;
      });

      const result = await createTestTasks(tasksToCreate);
      const parsedResult = JSON.parse(result);
      return parsedResult;
    } catch (error) {
      throw new Error(`Failed to assign test tasks: ${(error as any).message}`);
    }
  }

  const handleInvitationRequest = async () => {
    try {
      const res = await fetch('/api/auth/request-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email }),
      });

      if (res.ok) {
        setIsRequestSubmitted(true);
        toast({
          title: 'Request submitted',
          description:
            "We'll review your request and send an invitation code to your email if approved.",
        });
      } else {
        const data = await res.json();
        toast({
          variant: 'destructive',
          title: 'Request failed',
          description: data.error,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Request failed',
        description: 'An unexpected error occurred. Please try again.',
      });
    }
  };

  const verifyInvitationCode = async () => {
    try {
      const res = await fetch('/api/auth/verify-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: formData.invitationCode }),
      });

      if (res.ok) {
        setStep('details');
      } else {
        const data = await res.json();
        toast({
          variant: 'destructive',
          title: 'Invalid code',
          description:
            data.error || 'The invitation code is invalid or expired.',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Verification failed',
        description: 'An unexpected error occurred. Please try again.',
      });
    }
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData({ ...formData, termsAccepted: checked });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check Acolad policies first
    if (!checkAcoladPolicyAndProceed('submit')) {
      return;
    }

    await executeFormSubmit();
  };

  const executeFormSubmit = async () => {
    // Validate required fields based on role
    if (formData.role === 'annotator' || formData.role === 'agency owner') {
      if (
        formData.domain.length === 0 ||
        formData.lang.length === 0 ||
        formData.location === ''
      ) {
        toast({
          variant: 'destructive',
          title: 'Uh oh! Something went wrong.',
          description: 'Please fill in all the required fields.',
        });
        return;
      }
    }

    // For data scientist, validate only required fields (name, email, phone, location, team)
    if (formData.role === 'data scientist') {
      if (
        !formData.name ||
        !formData.email ||
        !formData.phone ||
        !formData.location
      ) {
        toast({
          variant: 'destructive',
          title: 'Uh oh! Something went wrong.',
          description: 'Please fill in all the required fields.',
        });
        return;
      }
    }

    // Validate team selection
    if (!formData.team_id) {
      toast({
        variant: 'destructive',
        title: 'Team Selection Required',
        description: 'Please select a team to join.',
      });
      return;
    }

    if (!formData.termsAccepted) {
      toast({
        variant: 'destructive',
        title: 'Terms and Conditions Required',
        description: 'Please accept the Terms and Conditions to continue.',
      });
      return;
    }

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (res.status === 201) {
        const userData = await res.json();

        if (formData.role === 'annotator') {
          try {
            await assignTestTasksToAnnotator(userData.userId);
            toast({
              title: 'Account created with test tasks.',
              description: 'You can now log in and start with your test tasks.',
            });
          } catch (error) {
            console.error('Error assigning test tasks:', error);
            toast({
              title: 'Account created.',
              description:
                'Account created but there was an issue assigning test tasks. Please contact support.',
            });
          }
        } else {
          toast({
            title: 'Account created.',
            description: 'You can now log in with your new account.',
          });
        }

        router.push('/auth/login');
      } else {
        const data = await res.json();
        toast({
          variant: 'destructive',
          title: 'Uh oh! Something went wrong.',
          description: data.error,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'An unexpected error occurred.',
      });
    }
  };

  if (step === 'role') {
    return (
      <div className='h-screen flex justify-center items-center'>
        <div>
          <h1 className='text-4xl font-bold text-left mb-8'>
            What's Your Mission?
          </h1>
          <p className='text-left mb-8 text-muted-foreground'>
            Choose the role that aligns with your goals.
          </p>
          <div className='grid md:grid-cols-4 gap-6'>
            <Card
              className='cursor-pointer hover:border-primary'
              onClick={() => handleRoleSelect('annotator')}
            >
              <CardHeader>
                <CardTitle className='flex items-center'>
                  <Pencil className='mr-2 h-6 w-6' />
                  Domain Expert
                </CardTitle>
                <CardDescription>
                  Sign up and earn on your terms.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className='mt-4 space-y-2'>
                  <li className='flex items-center'>
                    <CheckCircle2 className='mr-2 h-4 w-4 text-green-500' />
                    Complete meaningful tasks and get paid fast.
                  </li>
                  <li className='flex items-center'>
                    <DollarSign className='mr-2 h-4 w-4 text-green-500' />
                    Work whenever, wherever - total flexibility.
                  </li>
                  <li className='flex items-center'>
                    <Clock className='mr-2 h-4 w-4 text-green-500' />
                    Your skills, your schedule, your rewards.
                  </li>
                </ul>
              </CardContent>
            </Card>
            <Card
              className='cursor-pointer hover:border-primary'
              onClick={() => handleRoleSelect('data scientist')}
            >
              <CardHeader>
                <CardTitle className='flex items-center'>
                  <FlaskConical className='mr-2 h-6 w-6' />
                  Data Scientist
                </CardTitle>
                <CardDescription>
                  Analyze and transform data into insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className='mt-4 space-y-2'>
                  <li className='flex items-center'>
                    <BarChart className='mr-2 h-4 w-4 text-indigo-500' />
                    Discover patterns in complex datasets
                  </li>
                  <li className='flex items-center'>
                    <LineChart className='mr-2 h-4 w-4 text-indigo-500' />
                    Create predictive models
                  </li>
                  <li className='flex items-center'>
                    <Brain className='mr-2 h-4 w-4 text-indigo-500' />
                    Leverage AI for data-driven decisions
                  </li>
                </ul>
              </CardContent>
            </Card>
            <Card
              className='cursor-pointer hover:border-primary'
              onClick={() => handleRoleSelect('project manager')}
            >
              <CardHeader>
                <CardTitle className='flex items-center'>
                  <Building2 className='mr-2 h-6 w-6' />
                  AI Innovator
                </CardTitle>
                <CardDescription>I need data for my projects</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className='mt-4 space-y-2'>
                  <li className='flex items-center'>
                    <Database className='mr-2 h-4 w-4 text-blue-500' />
                    Get data labeled
                  </li>
                  <li className='flex items-center'>
                    <FileSpreadsheet className='mr-2 h-4 w-4 text-blue-500' />
                    Run surveys
                  </li>
                  <li className='flex items-center'>
                    <Globe className='mr-2 h-4 w-4 text-blue-500' />
                    Collect online data
                  </li>
                  <li className='flex items-center'>
                    <MapPin className='mr-2 h-4 w-4 text-blue-500' />
                    Gather field data
                  </li>
                </ul>
              </CardContent>
            </Card>
            <Card
              className='cursor-pointer hover:border-primary'
              onClick={() => handleRoleSelect('agency owner')}
            >
              <CardHeader>
                <CardTitle className='flex items-center'>
                  <Briefcase className='mr-2 h-6 w-6' />
                  Agency Owner
                </CardTitle>
                <CardDescription>
                  Manage a team of domain experts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className='mt-4 space-y-2'>
                  <li className='flex items-center'>
                    <Users className='mr-2 h-4 w-4 text-purple-500' />
                    Build and lead specialized teams
                  </li>
                  <li className='flex items-center'>
                    <Globe className='mr-2 h-4 w-4 text-purple-500' />
                    Access global annotation projects
                  </li>
                  <li className='flex items-center'>
                    <DollarSign className='mr-2 h-4 w-4 text-purple-500' />
                    Scale your agency's revenue
                  </li>
                  <li className='flex items-center'>
                    <CheckCircle2 className='mr-2 h-4 w-4 text-purple-500' />
                    Deliver high-quality work at scale
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'invitation') {
    return (
      <InvitationStep
        formData={formData}
        handleChange={handleChange}
        verifyInvitationCode={verifyInvitationCode}
        handleInvitationRequest={handleInvitationRequest}
        isRequestSubmitted={isRequestSubmitted}
        invitationMode={invitationMode}
        setInvitationMode={setInvitationMode}
        onBack={() => setStep('role')}
      />
    );
  }

  return (
    <>
      {/* Acolad Privacy Policy Dialog */}
      <AcoladPolicyDialog
        isOpen={showAcoladDialog}
        onClose={() => {
          setShowAcoladDialog(false);
          setPendingAction(null);
        }}
        onAccept={handleAcoladPolicyAcceptance}
      />

      <div className='min-h-screen flex items-center justify-center p-4'>
        <div
          className={`bg-white p-8 ${
            formData.role === 'annotator' ||
            formData.role === 'agency owner' ||
            formData.role === 'data scientist'
              ? 'max-w-xl'
              : 'max-w-md'
          } w-full`}
        >
          <h2 className='text-4xl font-bold text-center mb-6'>Sign Up</h2>

          {/* Role-specific banners */}
          {isTeamSelectionDisabled && formData.role === 'annotator' && (
            <Alert className='mb-6 bg-blue-50 border-blue-200'>
              <AlertDescription className='flex items-center'>
                <Users className='mr-2 h-5 w-5 text-blue-500' />
                <span>
                You've been invited to join as a <strong>Domain Expert</strong>
                </span>
              </AlertDescription>
            </Alert>
          )}

          {formData.role === 'data scientist' && (
            <Alert className='mb-6 bg-indigo-50 border-indigo-200'>
              <AlertDescription className='flex items-center'>
                <FlaskConical className='mr-2 h-5 w-5 text-indigo-500' />
                <span>
                  Join our platform as a <strong>Data Scientist</strong> to
                  analyze datasets, build models, and extract valuable insights.
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* Acolad Policy Notice */}
          {isAcoladTeam() && (
            <Alert className='mb-6 bg-amber-50 border-amber-200'>
              <AlertDescription className='flex items-center'>
                <Shield className='mr-2 h-5 w-5 text-amber-600' />
                <span>
                  <strong>Acolad Partnership:</strong> Additional privacy
                  policies apply for this team.
                  {acoladPolicyAccepted && (
                    <span className='text-green-600 ml-2'>
                      ✓ Policies accepted
                    </span>
                  )}
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* Google Sign In Button - For annotators and data scientists */}
          {formData.role === 'annotator' &&
            process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
              <>
                <Button
                  type='button'
                  variant='outline'
                  className='w-full mb-6 flex items-center justify-center gap-2'
                  onClick={handleGoogleSignIn}
                >
                  <svg className='h-4 w-4' viewBox='0 0 24 24'>
                    <path
                      d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                      fill='#4285F4'
                    />
                    <path
                      d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                      fill='#34A853'
                    />
                    <path
                      d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                      fill='#FBBC05'
                    />
                    <path
                      d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                      fill='#EA4335'
                    />
                  </svg>
                  Continue with Google
                </Button>

                <div className='relative mb-6'>
                  <div className='absolute inset-0 flex items-center'>
                    <div className='w-full border-t border-gray-300'></div>
                  </div>
                  <div className='relative flex justify-center text-sm'>
                    <span className='px-2 bg-white text-gray-500'>
                      Or continue with email
                    </span>
                  </div>
                </div>
              </>
            )}

          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className='space-y-2'>
                <Label htmlFor='name'>Name</Label>
                <Input
                  id='name'
                  type='text'
                  value={formData.name}
                  onChange={handleChange}
                  placeholder='Enter your name'
                  required
                />
              </div>
              
              <div className='space-y-2'>
                <Label htmlFor='email'>Email</Label>
                <Input
                  id='email'
                  type='email'
                  value={formData.email}
                  onChange={handleChange}
                  placeholder='Enter your email'
                  required
                  disabled={
                    formData.role === 'project manager' &&
                    invitationMode === 'request' &&
                    isRequestSubmitted
                  }
                />
              </div>
              
              <div className='space-y-2'>
                <Label htmlFor='password'>Password</Label>
                <Input
                  id='password'
                  type='password'
                  value={formData.password}
                  minLength={6}
                  onChange={handleChange}
                  placeholder='Enter your password'
                  required
                />
              </div>

              {/* Team Selection */}
              <div className='space-y-2'>
                <Label htmlFor='team flex flex-col items-center'>
                  Select Team

                </Label>
                <Select
                  value={formData.team_id}
                  onValueChange={handleTeamSelection}
                  disabled={isTeamSelectionDisabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team">
                      {(() => {
                        const selectedTeam = teams.find(team => team._id === formData.team_id);
                        if (selectedTeam) {
                          return (
                            <div className="flex items-center gap-2">
                              {selectedTeam.logo ? (
                                <img
                                  src={selectedTeam.logo}
                                  alt={`${selectedTeam.name} logo`}
                                  className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const fallback = target.nextElementSibling as HTMLElement;
                                    if (fallback) fallback.style.display = 'inline-block';
                                  }}
                                />
                              ) : null}
                              <Users 
                                className={`w-4 h-4 flex-shrink-0 ${selectedTeam.logo ? 'hidden' : 'inline-block'}`} 
                              />
                              <span className="truncate">{selectedTeam.name}</span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team._id} value={team._id}>
                        <div className="flex items-center gap-2">
                          {team.logo ? (
                            <img
                              src={team.logo}
                              alt={`${team.name} logo`}
                              className="w-4 h-4 rounded-full object-cover flex-shrink-0"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const fallback = target.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'inline-block';
                              }}
                            />
                          ) : null}
                          <Users 
                            className={`w-4 h-4 flex-shrink-0 ${team.logo ? 'hidden' : 'inline-block'}`} 
                          />
                          <span>{team.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Phone field - For annotators, agency owners and data scientists */}
              {(formData.role === 'annotator' ||
                formData.role === 'agency owner' ||
                formData.role === 'data scientist') && (
                <div className='space-y-2'>
                  <Label htmlFor='phone'>Phone number</Label>
                  <Input
                    id='phone'
                    type='tel'
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder='Enter your phone number'
                    required
                  />
                </div>
              )}

              {/* Location/Country field - For annotators, agency owners and data scientists */}
              {(formData.role === 'annotator' ||
                formData.role === 'agency owner' ||
                formData.role === 'data scientist') && (
                <div className='space-y-2'>
                  <Label htmlFor='location'>Country</Label>
                  <Combobox
                    options={locationOptions}
                    value={formData.location}
                    onChange={(value) =>
                      setFormData({ ...formData, location: value })
                    }
                    placeholder='Select country'
                  />
                </div>
              )}

              {/* Fields specific to annotators and agency owners only */}
              {(formData.role === 'annotator' ||
                formData.role === 'agency owner') && (
                <>
                  <div className='space-y-2'>
                    <Label htmlFor='domain'>Domain</Label>
                    <MultiCombobox
                      options={domainOptions}
                      value={formData.domain}
                      onChange={(value) =>
                        setFormData({ ...formData, domain: value })
                      }
                      placeholder='Select domain'
                      allowCustom={true}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='lang'>Language</Label>
                    <MultiCombobox
                      options={languageOptions}
                      value={formData.lang}
                      onChange={(value) =>
                        setFormData({ ...formData, lang: value })
                      }
                      placeholder='Select language'
                    />
                  </div>
                </>
              )}
            </div>

            {/* Terms and conditions and Submit button */}
            <div className="space-y-4">
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='terms'
                  checked={formData.termsAccepted}
                  onCheckedChange={handleCheckboxChange}
                  required
                />
                <label
                  htmlFor='terms'
                  className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                >
                  I agree to the{' '}
                  <a
                    href='https://www.blolabel.ai/blogs/terms-and-conditions-for-blolabel'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-primary underline'
                  >
                    Terms and Conditions
                  </a>
                </label>
              </div>
              <Button
                type='submit'
                className='w-full'
                disabled={!formData.termsAccepted}
              >
                Sign Up
              </Button>
            </div>
          </form>

          <div className='mt-4 text-center'>
            <button
              className='text-sm text-gray-600 hover:underline'
              onClick={() => router.push('/auth/login')}
            >
              Already have an account? Login
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Main component that wraps the content with Suspense
export default function AuthPageComponent() {
  return (
    <Suspense fallback={<Loader />}>
      <AuthPageContent />
    </Suspense>
  );
}