import React from 'react';
import { Video, Target } from 'lucide-react';

const VideoAnnotationPlaceholder = () => {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Video className="w-5 h-5 text-blue-600" />
        <Target className="w-3 h-3 text-red-500 absolute -top-1 -right-1" />
      </div>
      <span className="text-sm">Video Annotation</span>
    </div>
  );
};

export default VideoAnnotationPlaceholder;