// Assuming this file is located at: app/[projectId]/page.tsx

import React from 'react';

// Define the expected props structure, including params from Next.js dynamic routing
interface UnderConstructionPageProps {
  params: {
    projectId: string; // The dynamic segment name matches the key here
  };
}

// Use React.FC (Functional Component) with the props type
const UnderConstructionPage: React.FC<UnderConstructionPageProps> = ({ params }) => {
  // Extract projectId. Decode it in case it contains URL-encoded characters.
  // Provide a fallback just in case, though Next.js should guarantee it for this route.
  const projectId = params?.projectId ? decodeURIComponent(params.projectId) : 'this page';

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-6 text-center font-sans">
      {/* Icon */}
      <div className="mb-6 text-6xl text-yellow-500 animate-bounce">
        🚧 {/* Construction Sign Emoji */}
        {/* Or use an SVG or an icon library component if you have one installed */}
        {/* Example with a hypothetical Icon component: <Icon name="construction" className="h-16 w-16 text-yellow-500" /> */}
      </div>

      {/* Heading */}
      <h1 className="mb-3 text-4xl font-bold text-gray-800 drop-shadow-sm md:text-5xl">
        Under Construction!
      </h1>

      {/* Description */}
      <p className="mb-4 max-w-xl text-lg text-gray-600">
        We're working hard to build something amazing for project:
        <strong className="mx-1 font-semibold text-blue-600">{projectId}</strong>.
      </p>

      <p className="max-w-xl text-lg text-gray-600">
        This section isn't quite ready yet, but it'll be worth the wait! Please check back soon.
      </p>

       {/* Optional Footer/Patience Message */}
       <p className="mt-8 text-sm text-gray-500">
        Thanks for your patience!
      </p>
    </div>
  );
};

export default UnderConstructionPage;