// app/annotator/onboardedExperts/[projectId]/page.tsx

// Make sure to import the default export which includes the ErrorBoundary
import OnboardedExpertsDashboard from '@/components/experts/OnboardedExpertsDashboard';
import React from 'react';

// The page component now automatically receives `params` from the URL
interface PageProps {
  params: {
    projectId: string; // This name must match the folder name `[projectId]`
  };
}

function Page({ params }: PageProps) {
  const { projectId } = params;

  return (
    <div>
      {/* Pass the projectId down as a prop */}
      <OnboardedExpertsDashboard projectId={projectId} />
    </div>
  );
}

export default Page;