'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { signOut } from 'next-auth/react';
import { LogOut, PlusCircle, Users, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Loader from '@/components/ui/NewLoader/Loader';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { createTeam, getTeams } from '@/app/actions/team';

interface Team {
  _id: string;
  name: string;
  description: string | null;
  members: string[];
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

const TeamsPage = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const data = await getTeams();
        setTeams(data);
      } catch (error) {
        console.error('Error fetching teams:', error);
        toast.error('Failed to load teams');
      } finally {
        setLoading(false);
      }
    };

    if (status === 'loading') return;
    if (!session || session.user.role !== 'system admin') {
      router.push('/');
      return;
    }

    fetchTeams();
  }, [session, status, router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!formData.name.trim()) {
        toast.error('Team name is required');
        return;
      }

      if (!session?.user?.id) {
        toast.error('User session not found');
        return;
      }

      const teamData = {
        ...formData,
        createdBy: session.user.id,
        members: [session.user.id],
      };

      await createTeam(teamData);

      // Refresh the teams list
      const updatedTeams = await getTeams();
      setTeams(updatedTeams);

      setIsModalOpen(false);
      setFormData({ name: '', description: '' });
      toast.success('Team created successfully!');
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error('Failed to create team');
    }
  };

  if (loading) return <Loader />;

  return (
    <div className='min-h-screen p-6 bg-gray-50 relative'>
      {/* Logout button */}
      <div className='absolute top-6 right-6'>
        <Button
          onClick={() => signOut()}
          variant='outline'
          className='flex items-center gap-2'
        >
          <LogOut size={18} />
          <span className={cn('whitespace-nowrap')}>Logout</span>
        </Button>
      </div>

      <div className='max-w-4xl mx-auto'>
        <div className='flex justify-between items-center mb-8'>
          <h1 className='text-3xl font-bold text-gray-900'>Teams</h1>
          <div className='flex gap-4'>
            <Button>
              <Link href={'/admin/custom-fields'}>Custom Fields</Link>
            </Button>
            <Button>
              <Link href={'/admin/orders'}>View Orders</Link>
            </Button>
            <Button>
              <Link href={'/admin/label'}>Add Label</Link>
            </Button>
            <Button
              onClick={() => setIsModalOpen(true)}
              variant='outline'
              className='flex items-center gap-2'
            >
              <PlusCircle className='w-4 h-4' />
              Add Team
            </Button>
          </div>
        </div>

        <div className='grid grid-cols-1 gap-6'>
          {teams.length === 0 ? (
            <div className='text-center py-8'>
              <p className='text-gray-500'>
                No teams found. Create your first team!
              </p>
            </div>
          ) : (
            teams.map((team) => (
              <Card key={team._id} className='overflow-hidden'>
                <CardHeader className='bg-gray-50'>
                  <CardTitle className='flex justify-between items-center'>
                    <div className='flex items-center gap-2'>
                      <Users className='h-5 w-5 text-blue-500' />
                      <span>{team.name}</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className='pt-4'>
                  <div className='space-y-4'>
                    <div>
                      <p className='text-sm text-gray-500'>Description</p>
                      <p className='text-gray-700'>
                        {team.description || 'No description'}
                      </p>
                    </div>
                    <div>
                      <p className='text-sm text-gray-500'>Created By</p>
                      <p className='text-gray-700'>
                        {team.createdBy?.name || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <p className='text-sm text-gray-500'>Members</p>
                      <p className='text-gray-700'>
                        {team.members?.length || 0} member(s)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Add Team Modal */}
      {isModalOpen && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white p-6 rounded-lg max-w-md w-full'>
            <h2 className='text-xl font-bold mb-4'>Add New Team</h2>
            <form onSubmit={handleSubmit}>
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='name'>Team Name</Label>
                  <Input
                    id='name'
                    name='name'
                    value={formData.name}
                    onChange={handleChange}
                    placeholder='Enter team name'
                    required
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='description'>Description</Label>
                  <Textarea
                    id='description'
                    name='description'
                    value={formData.description}
                    onChange={handleChange}
                    placeholder='Enter team description'
                    rows={3}
                  />
                </div>

                <div className='flex justify-end space-x-2 pt-4'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type='submit'>Create Team</Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamsPage;