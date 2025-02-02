import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { processWithCleanvoice } from '@/lib/cleanvoice-service';

interface AudioEnhancementProps {
  audioBlob: Blob | null;
  onEnhancementComplete: (enhancedBlob: Blob) => void;
  onCancel: () => void;
}

const AudioEnhancement = ({
  audioBlob,
  onEnhancementComplete,
  onCancel,
}: AudioEnhancementProps) => {
  const [isEnhancing, setIsEnhancing] = React.useState(false);
  const [status, setStatus] = React.useState('');
  const [options, setOptions] = React.useState({
    removeFillers: true,
    removePauses: true,
    removeBreath: true,
    removeNoise: true,
  });

  const enhanceAudio = async () => {
    if (!audioBlob) return;
    setIsEnhancing(true);

    try {
      const enhancedBlob = await processWithCleanvoice(
        audioBlob,
        options,
        (status) => setStatus(status)
      );

      onEnhancementComplete(enhancedBlob);
      toast.success('Audio enhanced successfully');
    } catch (error) {
      console.error('Error enhancing audio:', error);
      toast.error('Failed to enhance audio');
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <Card className='w-full'>
      <CardContent className='p-6'>
        <div className='space-y-4'>
          <h3 className='text-lg font-semibold'>Enhance Audio</h3>

          <div className='space-y-3'>
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='removeFillers'
                checked={options.removeFillers}
                onCheckedChange={(checked) =>
                  setOptions((prev) => ({
                    ...prev,
                    removeFillers: checked as boolean,
                  }))
                }
              />
              <label
                htmlFor='removeFillers'
                className='text-sm font-medium leading-none cursor-pointer'
              >
                Remove Filler Words
              </label>
            </div>

            <div className='flex items-center space-x-2'>
              <Checkbox
                id='removePauses'
                checked={options.removePauses}
                onCheckedChange={(checked) =>
                  setOptions((prev) => ({
                    ...prev,
                    removePauses: checked as boolean,
                  }))
                }
              />
              <label
                htmlFor='removePauses'
                className='text-sm font-medium leading-none cursor-pointer'
              >
                Remove Long Pauses
              </label>
            </div>

            <div className='flex items-center space-x-2'>
              <Checkbox
                id='removeNoise'
                checked={options.removeNoise}
                onCheckedChange={(checked) =>
                  setOptions((prev) => ({
                    ...prev,
                    removeNoise: checked as boolean,
                  }))
                }
              />
              <label
                htmlFor='removeNoise'
                className='text-sm font-medium leading-none cursor-pointer'
              >
                Remove Background Noise
              </label>
            </div>
          </div>

          {status && <div className='text-sm text-gray-500 mt-2'>{status}</div>}

          <div className='flex justify-end space-x-2 pt-4'>
            <Button variant='outline' onClick={onCancel} disabled={isEnhancing}>
              Cancel
            </Button>
            <Button
              onClick={enhanceAudio}
              disabled={isEnhancing}
              className='flex items-center'
            >
              <Wand2 className='mr-2 h-4 w-4' />
              {isEnhancing ? 'Enhancing...' : 'Enhance Audio'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AudioEnhancement;
