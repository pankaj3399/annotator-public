//app/(manager)/dashboard/[projectId]/_components/dashboard-overview-card.tsx
'use client';

import { getAllAnnotators } from '@/app/actions/annotator';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { CheckSquare, FileText, Layers, Users } from 'lucide-react';
import { useEffect, useState } from 'react'; // Import useState and useEffect

export default function MinimalistDashboardOverviewCard({
  projects,
  templates,
  totalTasks,
}: {
  projects: number;
  templates: number;
  totalTasks: number;
}) {
  // State to hold the fetched annotator count
  const [annotatorCount, setAnnotatorCount] = useState<number>(0); // Initialize with 0 or null
  const [isLoadingAnnotators, setIsLoadingAnnotators] = useState<boolean>(true);

  useEffect(() => {
    async function fetchAnnotators() {
      setIsLoadingAnnotators(true);
      try {
        const annotatorsJsonString = await getAllAnnotators(); // Call the server action
        const annotatorsArray = JSON.parse(annotatorsJsonString);
        setAnnotatorCount(annotatorsArray.length);
      } catch (error) {
        console.error('Failed to fetch annotators:', error);
        setAnnotatorCount(0); // Set to 0 or handle error appropriately
      } finally {
        setIsLoadingAnnotators(false);
      }
    }

    fetchAnnotators();
  }, []); // Empty dependency array means this runs once after initial render

  const items = [
    { label: 'Projects', value: projects, icon: Layers },
    { label: 'Templates', value: templates, icon: FileText },
    { label: 'Tasks', value: totalTasks ? totalTasks : 0, icon: CheckSquare },
    {
      label: 'Annotators',
      value: isLoadingAnnotators ? '...' : annotatorCount,
      icon: Users,
    }, // Use the state variable
  ];

  return (
    <Card className='w-full overflow-hidden'>
      <CardContent className='p-6'>
        <div className='grid grid-cols-2 gap-6 sm:grid-cols-4'>
          {items.map((item, index) => (
            <motion.div
              key={index}
              className='flex flex-col items-center justify-center space-y-2 p-4 bg-muted rounded-lg transition-shadow hover:shadow-md'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <item.icon className='h-8 w-8 text-primary' />
              </motion.div>
              <motion.span
                className='text-3xl font-bold'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
              >
                {item.value}
              </motion.span>
              <span className='text-sm text-muted-foreground'>
                {item.label}
              </span>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
