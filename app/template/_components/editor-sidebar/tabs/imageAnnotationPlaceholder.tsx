import React from 'react';
import { Target } from 'lucide-react';

const ImageAnnotationPlaceholder = () => {
  return (
    <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
      <Target className="w-6 h-6 text-white" />
    </div>
  );
};

export default ImageAnnotationPlaceholder;