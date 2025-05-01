'use client';

import React, { useState, useEffect } from 'react';
import { Database, ArrowLeft, FileDown, Search, Filter } from 'lucide-react';
import Link from 'next/link';
import {
  getTeamProjects,
  getRawAnnotationData,
} from '../../actions/dataScientist';
import Loader from '@/components/ui/NewLoader/Loader';

interface Project {
  _id: string;
  name: string;
  project_Manager?: {
    _id: string;
    name: string;
    email: string;
  };
}

interface AnnotationData {
  taskId: string;
  annotatorId: string | null;
  templateId: string | null;
  status: string;
  timeTaken: number;
  content: any | null;
  submittedAt: string;
}

export default function DataPage(): React.ReactNode {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [annotationData, setAnnotationData] = useState<AnnotationData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const response = await getTeamProjects();
        const projectsData = JSON.parse(response);
        setProjects(projectsData);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const handleProjectSelect = async (projectId: string) => {
    try {
      setLoading(true);
      setSelectedProject(projectId);

      const response = await getRawAnnotationData(projectId);
      const data = JSON.parse(response);
      setAnnotationData(data);
    } catch (error) {
      console.error('Error fetching annotation data:', error);
      setAnnotationData([]);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!annotationData.length) return;

    // Function to flatten nested JSON structure
    const flattenJSON = (obj: any, prefix = ''): Record<string, any> => {
      let result: Record<string, any> = {};

      // Handle primitive values and nulls
      if (obj === null || obj === undefined || typeof obj !== 'object') {
        return { [prefix]: obj };
      }

      // Handle arrays - convert to string
      if (Array.isArray(obj)) {
        return { [prefix]: JSON.stringify(obj) };
      }

      // Handle objects
      Object.keys(obj).forEach((key) => {
        const newKey = prefix ? `${prefix}_${key}` : key;

        // Don't go too deep for content objects
        if (newKey === 'content' || newKey.startsWith('content_')) {
          result[newKey] = JSON.stringify(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          // For other objects, recurse only one level deep
          if (!prefix) {
            const flattened = flattenJSON(obj[key], key);
            result = { ...result, ...flattened };
          } else {
            result[newKey] = JSON.stringify(obj[key]);
          }
        } else {
          result[newKey] = obj[key];
        }
      });

      return result;
    };

    // Flatten all data objects
    const flattenedData = annotationData.map((item) => flattenJSON(item));

    // Get all unique headers
    const headers = [
      ...new Set(flattenedData.flatMap((item) => Object.keys(item))),
    ];

    // Create CSV content
    let csvContent = headers.join(',') + '\n';
    flattenedData.forEach((item) => {
      const row = headers.map((header) => {
        const value = item[header] === undefined ? '' : item[header];
        // Escape quotes and wrap in quotes if needed
        return typeof value === 'string'
          ? `"${value.replace(/"/g, '""')}"`
          : value;
      });
      csvContent += row.join(',') + '\n';
    });

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `annotation-data-${selectedProject}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter and search the annotation data
  const filteredData = annotationData.filter((item) => {
    const matchesSearch =
      searchQuery === '' ||
      JSON.stringify(item).toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Get unique statuses for the filter dropdown
  const statuses = [
    'all',
    ...new Set(annotationData.map((item) => item.status)),
  ];

  return (
    <div className='p-6'>
      <div className='flex items-center mb-6'>
        <Link href='/dataScientist/dashboard' className='mr-4'>
          <ArrowLeft className='h-5 w-5 text-gray-500 hover:text-gray-700' />
        </Link>
        <h1 className='text-2xl font-bold text-gray-900 flex items-center'>
          <Database className='mr-2 text-indigo-600' />
          Annotation Data Access
        </h1>
      </div>

      <div className='bg-white rounded-lg shadow p-6 mb-6'>
        <h2 className='text-lg font-medium mb-4'>Select a Project</h2>
        {loading && !projects.length ? (
          <div className='animate-pulse space-y-2'>
            {[1, 2, 3].map((i) => (
              <div key={i} className='h-10 bg-gray-200 rounded'></div>
            ))}
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {projects.map((project) => (
              <button
                key={project._id}
                className={`p-4 border rounded-lg text-left hover:bg-gray-50 transition-colors ${
                  selectedProject === project._id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200'
                }`}
                onClick={() => handleProjectSelect(project._id)}
              >
                <h3 className='font-medium'>{project.name}</h3>
                <p className='text-sm text-gray-500 mt-1'>
                  Manager: {project.project_Manager?.name || 'Unknown'}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedProject && (
        <>
          <div className='mb-6 flex flex-col sm:flex-row gap-4'>
            <div className='relative flex-grow'>
              <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                <Search className='h-5 w-5 text-gray-400' />
              </div>
              <input
                type='text'
                className='pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
                placeholder='Search annotations...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className='relative'>
              <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                <Filter className='h-5 w-5 text-gray-400' />
              </div>
              <select
                className='pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status === 'all'
                      ? 'All Statuses'
                      : status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <button
              className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
              onClick={downloadCSV}
              disabled={!annotationData.length}
            >
              <FileDown className='mr-2 h-5 w-5' />
              Export CSV
            </button>
          </div>

          <div className='bg-white rounded-lg shadow overflow-hidden'>
            {loading ? (
              <Loader />
            ) : filteredData.length === 0 ? (
              <div className='p-6 text-center text-gray-500'>
                {annotationData.length === 0
                  ? 'No annotation data available for this project.'
                  : 'No results match your search criteria.'}
              </div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='min-w-full divide-y divide-gray-200'>
                  <thead className='bg-gray-50'>
                    <tr>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Task ID
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Status
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Time Taken
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Submitted At
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Content Preview
                      </th>
                    </tr>
                  </thead>
                  <tbody className='bg-white divide-y divide-gray-200'>
                    {filteredData.slice(0, 50).map((item) => (
                      <tr key={item.taskId}>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>
                          {item.taskId.substring(0, 8)}...
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${
                              item.status === 'accepted'
                                ? 'bg-green-100 text-green-800'
                                : item.status === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                          {item.timeTaken ? `${item.timeTaken}s` : 'N/A'}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                          {new Date(item.submittedAt).toLocaleString()}
                        </td>
                        <td className='px-6 py-4 text-sm text-gray-500 max-w-xs truncate'>
                          {item.content ? (
                            <pre className='text-xs overflow-hidden'>
                              {JSON.stringify(item.content).substring(0, 100)}
                              ...
                            </pre>
                          ) : (
                            'No content available'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredData.length > 50 && (
                  <div className='px-6 py-3 text-gray-500 text-sm bg-gray-50 border-t border-gray-200'>
                    Showing 50 of {filteredData.length} results. Export to CSV
                    to access all data.
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
