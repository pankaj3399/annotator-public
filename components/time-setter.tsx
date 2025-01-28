'use client';

import { updateTimer } from '@/app/actions/template';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEditor } from '@/providers/editor/editor-provider';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface TimeSetterProps {
  templateId: string;
}

export function TimeSetterComponent({ templateId }: TimeSetterProps) {
  const { pageDetails } = useEditor();
  const time = pageDetails?.timer;
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState(time ? Math.floor(time / 3600) : 0);
  const [minutes, setMinutes] = useState(
    time ? Math.floor((time % 3600) / 60) : 0
  );
  const [seconds, setSeconds] = useState(time ? time % 60 : 0);
  const [displayHours, setDisplayHours] = useState(hours.toString());
  const [displayMinutes, setDisplayMinutes] = useState(minutes.toString());
  const [displaySeconds, setDisplaySeconds] = useState(seconds.toString());
  const [hasChanged, setHasChanged] = useState(false);

  useEffect(() => {
    setHasChanged(true);
  }, [hours, minutes, seconds]);

  const handleSave = async () => {
    if (hasChanged) {
      try {
        const total = hours * 3600 + minutes * 60 + seconds;
        await updateTimer(templateId, total);
        toast.success(`Timer set to ${hours}h ${minutes}m ${seconds}s`);
        setHasChanged(false);
        setOpen(false);
      } catch (error) {
        toast.error('Failed to set timer');
      }
    }
  };

  const handleFocus = (setter: (value: string) => void) => {
    setter('');
  };

  const handleBlur = (
    value: string,
    setter: (value: string) => void,
    numericSetter: (value: number) => void,
    originalValue: number,
    max?: number
  ) => {
    if (value === '') {
      setter(originalValue.toString());
      return;
    }

    const numValue = parseInt(value) || 0;
    const validValue =
      max !== undefined
        ? Math.min(max, Math.max(0, numValue))
        : Math.max(0, numValue);

    setter(validValue.toString());
    numericSetter(validValue);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="hover:bg-slate-800">
          <Clock className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Timer</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col space-y-6 py-4">
          <div className="flex justify-center items-center space-x-4">
            <div className="flex flex-col items-center space-y-2">
              <Input
                type="number"
                id="hours"
                min="0"
                value={displayHours}
                onFocus={() => handleFocus(setDisplayHours)}
                onBlur={(e) =>
                  handleBlur(e.target.value, setDisplayHours, setHours, hours)
                }
                onChange={(e) => setDisplayHours(e.target.value)}
                className="w-16 text-center"
              />
              <Label htmlFor="hours" className="text-sm">
                hr
              </Label>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <Input
                type="number"
                id="minutes"
                min="0"
                max="59"
                value={displayMinutes}
                onFocus={() => handleFocus(setDisplayMinutes)}
                onBlur={(e) =>
                  handleBlur(
                    e.target.value,
                    setDisplayMinutes,
                    setMinutes,
                    minutes,
                    59
                  )
                }
                onChange={(e) => setDisplayMinutes(e.target.value)}
                className="w-16 text-center"
              />
              <Label htmlFor="minutes" className="text-sm">
                min
              </Label>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <Input
                type="number"
                id="seconds"
                min="0"
                max="59"
                value={displaySeconds}
                onFocus={() => handleFocus(setDisplaySeconds)}
                onBlur={(e) =>
                  handleBlur(
                    e.target.value,
                    setDisplaySeconds,
                    setSeconds,
                    seconds,
                    59
                  )
                }
                onChange={(e) => setDisplaySeconds(e.target.value)}
                className="w-16 text-center"
              />
              <Label htmlFor="seconds" className="text-sm">
                sec
              </Label>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={!hasChanged}>
              Save Timer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
