import React, { useState, ChangeEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

// Types
interface Task {
  _id: string;
  name: string;
  project: string;
  content: string;
  created_at: string;
  status: string;
  submitted: boolean;
  annotator?: string;
  feedback: string;
  template: {
    _id: string;
    labels: string[];
  };
}

const DomainEnum = {
  Math: 'Math',
  Healthcare: 'Healthcare',
  Language: 'Language',
  Multimodal: 'Multimodal',
  Other: 'Other',
} as const;

type DomainType = keyof typeof DomainEnum;

interface BenchmarkFormData {
  name?: string;
  description?: string;
  domain?: DomainType;
  customDomain?: string;
  datasetUrl?: string;
  evaluationMethodology?: string;
  intendedPurpose?: string;
}

const benchmarkFormSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  domain: z
    .enum(Object.keys(DomainEnum) as [DomainType, ...DomainType[]])
    .optional(),
  customDomain: z.string().optional(),
  datasetUrl: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  evaluationMethodology: z.string().optional(),
  intendedPurpose: z.string().optional(),
});

interface BenchmarkProposalFormProps {
  tasks: Task[];
}

export const BenchmarkProposalForm: React.FC<BenchmarkProposalFormProps> = ({
  tasks,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const hasLLMBenchmarkLabel = tasks.some((task) =>
    task.template?.labels?.some((label) => {
      try {
        const parsedLabel =
          typeof label === 'string' ? label : JSON.parse(label);
        return parsedLabel === 'LLM BENCHMARK';
      } catch {
        return label === 'LLM BENCHMARK';
      }
    })
  );

  const form = useForm<BenchmarkFormData>({
    resolver: zodResolver(benchmarkFormSchema),
    defaultValues: {
      name: '',
      description: '',
      domain: undefined,
      customDomain: '',
      datasetUrl: '',
      evaluationMethodology: '',
      intendedPurpose: '',
    },
  });
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        toast.error('File size must not exceed 100MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    try {
      // Get upload URL using the new file route
      const urlResponse = await fetch('/api/s3/file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
        }),
      });

      if (!urlResponse.ok) {
        const errorData = await urlResponse.json();
        throw new Error(errorData.message || 'Failed to get upload URL');
      }

      const { url: uploadUrl, s3Path } = await urlResponse.json();

      // Upload the file with progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed due to network error'));
        });

        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      // Return the full S3 URL for the file
      return `${process.env.NEXT_PUBLIC_S3_BASE_URL}/${s3Path}`;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const onSubmit = async (data: BenchmarkFormData) => {
    try {
      setIsSubmitting(true);

      const llmBenchmarkTask = tasks.find((task) =>
        task.template?.labels?.some((label) => {
          try {
            const parsedLabel =
              typeof label === 'string' ? label : JSON.parse(label);
            return parsedLabel === 'LLM BENCHMARK';
          } catch {
            return label === 'LLM BENCHMARK';
          }
        })
      );

      if (!llmBenchmarkTask) {
        toast.error('No LLM BENCHMARK task found');
        return;
      }

      // Create FormData object
      const formData = new FormData();
      formData.append('name', data.name || '');
      formData.append('description', data.description || '');
      formData.append('domain', data.domain || '');
      formData.append('project', llmBenchmarkTask.project);
      formData.append(
        'evaluationMethodology',
        data.evaluationMethodology || ''
      );
      formData.append('intendedPurpose', data.intendedPurpose || '');

      if (data.customDomain) {
        formData.append('customDomain', data.customDomain);
      }

      if (data.datasetUrl) {
        formData.append('datasetUrl', data.datasetUrl);
      }

      // Append file if selected
      if (selectedFile) {
        formData.append('datasetFile', selectedFile);
      }

      const response = await fetch('/api/benchmark-proposals', {
        method: 'POST',
        body: formData, // Send as FormData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit proposal');
      }

      toast.success('Benchmark proposal submitted successfully');
      form.reset();
      setSelectedFile(null);
      setUploadProgress(0);
      setIsOpen(false);
    } catch (error) {
      console.error('Submission error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to submit proposal'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hasLLMBenchmarkLabel) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant='default'
          className='bg-yellow-400 hover:bg-yellow-500 text-black font-semibold'
        >
          Submit New Benchmark Proposal
        </Button>
      </DialogTrigger>

      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Submit New Benchmark Proposal</DialogTitle>
        </DialogHeader>

        <div className='max-h-[70vh] overflow-y-auto pr-4'>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
              {/* Existing form fields remain the same */}
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Benchmark Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder='Enter a descriptive name for your benchmark'
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        className='min-h-[200px]'
                        placeholder='Describe the purpose, goals, challenges, and significance of the benchmark'
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='domain'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Domain</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select domain' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(DomainEnum).map((domain) => (
                          <SelectItem key={domain} value={domain}>
                            {domain}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('domain') === 'Other' && (
                <FormField
                  control={form.control}
                  name='customDomain'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Domain</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder='Specify your domain' />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className='space-y-4'>
                <FormLabel>Dataset</FormLabel>
                <Input
                  type='file'
                  accept='.csv,.json,.zip'
                  onChange={handleFileChange}
                  className='cursor-pointer'
                />
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className='w-full bg-gray-200 rounded-full h-2.5'>
                    <div
                      className='bg-blue-600 h-2.5 rounded-full'
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                )}
                <p className='text-sm text-gray-500'>
                  Upload CSV, JSON, or ZIP (max 100MB)
                </p>

                <FormField
                  control={form.control}
                  name='datasetUrl'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          type='url'
                          placeholder='Or provide a URL to your dataset'
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name='evaluationMethodology'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Evaluation Methodology</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        className='min-h-[200px]'
                        placeholder='Detail how the benchmark measures model performance'
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='intendedPurpose'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Intended Purpose</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        className='min-h-[150px]'
                        placeholder='Explain the intended use cases'
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='flex justify-between gap-4 pt-4'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => window.open('/docs/benchmark-template.pdf')}
                >
                  Download Benchmark Template
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => window.open('/docs/benchmark-tutorial')}
                >
                  View Tutorial
                </Button>
              </div>

              <Button type='submit' className='w-full' disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Proposal'}
              </Button>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
