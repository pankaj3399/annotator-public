// app/projects/[projectId]/discussions/ProjectDiscussions.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Loader from '@/components/ui/NewLoader/Loader';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { MessageCircle, Heart } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface User {
  _id: string;
  name: string;
  role: string;
  team_id?: string;
}

interface Comment {
  _id: string;
  content: string;
  author: User;
  created_at: string;
}

interface Discussion {
  _id: string;
  title: string;
  content: string;
  project: {
    _id: string;
    name: string;
  };
  author: User;
  tags: string[];
  visibility: 'public' | 'internal' | 'private';
  likes: string[];
  comments: Comment[];
  created_at: string;
  updated_at: string;
  likeCount: number;
  commentCount: number;
}

interface Project {
  _id: string;
  name: string;
  project_Manager: User;
}

export default function ProjectDiscussionsPage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;
  const [projectData, setProjectData] = useState<Project | null>(null);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [currentDiscussionId, setCurrentDiscussionId] = useState<string>('');
  const [currentDiscussion, setCurrentDiscussion] = useState<Discussion | null>(null);
  const [newComment, setNewComment] = useState('');
  const [newDiscussion, setNewDiscussion] = useState({
    title: '',
    content: '',
    tags: '',
    visibility: 'public' as 'public' | 'internal' | 'private'
  });

  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const isProjectManager = session?.user?.role === 'project manager';

  // Fetch project discussions
  useEffect(() => {
    if (session && projectId) {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          // Fetch project data
          const projectRes = await fetch(`/api/projects/${projectId}`);
          const projectData = await projectRes.json();
          
          if (projectData.success) {
            setProjectData(projectData.project);
          } else {
            throw new Error(projectData.error || 'Failed to fetch project');
          }
          
          // Fetch discussions for this project
          const discussionRes = await fetch(`/api/discussions?project=${projectId}`);
          const discussionData = await discussionRes.json();
          
          if (discussionData.success) {
            setDiscussions(discussionData.discussions);
          } else {
            throw new Error(discussionData.error || 'Failed to fetch discussions');
          }
        } catch (error) {
          toast({
            variant: 'destructive',
            title: 'Error loading discussions',
            description: error instanceof Error ? error.message : 'An unknown error occurred',
          });
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchData();
    }
  }, [session, projectId, toast]);

  // Create new discussion
  const handleCreateDiscussion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newDiscussion.title || !newDiscussion.content.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing required fields',
        description: 'Please fill in all required fields',
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch('/api/discussions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newDiscussion.title.trim(),
          content: newDiscussion.content.trim(),
          project: projectId,
          tags: newDiscussion.tags.split(',').map(tag => tag.trim()).filter(Boolean),
          visibility: newDiscussion.visibility
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setDiscussions([data.discussion, ...discussions]);
        setNewDiscussion({
          title: '',
          content: '',
          tags: '',
          visibility: 'public'
        });
        toast({
          title: 'Discussion created successfully',
        });
      } else {
        throw new Error(data.error || 'Failed to create discussion');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error creating discussion',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Like a discussion
  const handleLike = async (discussionId: string) => {
    try {
      const res = await fetch(`/api/discussions/${discussionId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await res.json();
      
      if (data.success) {
        // Update the discussions state with the updated discussion
        setDiscussions(
          discussions.map(discussion => 
            discussion._id === discussionId ? data.discussion : discussion
          )
        );
      } else {
        throw new Error(data.error || 'Failed to like discussion');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error liking discussion',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  };

  // Add comment to a discussion
  const handleAddComment = async () => {
    if (!newComment.trim() || !currentDiscussionId) {
      return;
    }
    
    try {
      const res = await fetch(`/api/discussions/${currentDiscussionId}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment.trim()
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        // Update the discussions state with the updated discussion
        setDiscussions(
          discussions.map(discussion => 
            discussion._id === currentDiscussionId ? data.discussion : discussion
          )
        );
        setCommentDialogOpen(false);
        setNewComment('');
        toast({
          title: 'Comment added successfully',
        });
      } else {
        throw new Error(data.error || 'Failed to add comment');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error adding comment',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  };

  // Open comment dialog for a specific discussion
  const openCommentDialog = (discussionId: string) => {
    const discussion = discussions.find(d => d._id === discussionId);
    if (discussion) {
      setCurrentDiscussion(discussion);
      setCurrentDiscussionId(discussionId);
      setCommentDialogOpen(true);
    }
  };

  // Generate user initials for avatar
  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Handle creating a new discussion from the textarea
  const handleNewDiscussionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiscussion.content.trim()) return;
    
    // Set default title if empty
    if (!newDiscussion.title) {
      newDiscussion.title = newDiscussion.content.split('\n')[0].slice(0, 50);
    }
    
    handleCreateDiscussion(e);
  };

  if (!session || isLoading) {
    return <Loader />;
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <h1 className="text-3xl font-bold mb-6">Project Discussion</h1>
      
      {/* Create new discussion card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-10 w-10 bg-gray-200">
              <AvatarFallback>{getUserInitials(session.user.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium mb-2">Create a new discussion</p>
              <form onSubmit={handleNewDiscussionSubmit}>
                <Textarea 
                  className="w-full p-3 border rounded-lg text-gray-700"
                  placeholder="Start a new discussion..."
                  value={newDiscussion.content}
                  onChange={(e) => setNewDiscussion({...newDiscussion, content: e.target.value})}
                  rows={1}
                />
                {newDiscussion.content.trim() && (
                  <div className="mt-3 space-y-3">
                    <Input
                      placeholder="Title (optional)"
                      value={newDiscussion.title}
                      onChange={(e) => setNewDiscussion({...newDiscussion, title: e.target.value})}
                    />
                    <Input
                      placeholder="Tags (comma separated, e.g. timeline, planning, concerns)"
                      value={newDiscussion.tags}
                      onChange={(e) => setNewDiscussion({...newDiscussion, tags: e.target.value})}
                    />
                    <select
                      className="w-full p-2 border rounded-md"
                      value={newDiscussion.visibility}
                      onChange={(e) => setNewDiscussion({
                        ...newDiscussion, 
                        visibility: e.target.value as 'public' | 'internal' | 'private'
                      })}
                    >
                      <option value="public">Public (All team members)</option>
                      <option value="internal">Internal (Project team only)</option>
                      <option value="private">Private (Project managers only)</option>
                    </select>
                    <Button type="submit" className="w-full">Post Discussion</Button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </CardContent>
      </Card>

      {discussions.length === 0 ? (
        <div className="text-center py-10">
          <h2 className="text-xl font-semibold text-gray-900">
            No discussions yet
          </h2>
          <p className="mt-2 text-gray-600">
            {isProjectManager 
              ? "Create your first discussion to start collaborating!" 
              : "Check back later for new discussions from the project manager."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {discussions.map((discussion) => (
            <Card key={discussion._id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{getUserInitials(discussion.author.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{discussion.author.name}</p>
                      <p className="text-sm text-gray-500">
                        {discussion.author.role} • {format(parseISO(discussion.created_at), 'dd MMM')} ago
                      </p>
                    </div>
                  </div>
                  {discussion.visibility !== 'public' && (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                      {discussion.visibility.charAt(0).toUpperCase() + discussion.visibility.slice(1)}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pb-3">
                <h2 className="text-xl font-bold mb-2">{discussion.title}</h2>
                <p className="mb-4">{discussion.content}</p>
                
                <div className="flex gap-2 mb-2">
                  {discussion.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="bg-gray-100 text-gray-800">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
              
              <CardFooter className="pt-0 pb-2 flex justify-between border-t border-gray-100 py-3">
                <div className="flex items-center text-gray-500">
                  <Heart className="h-5 w-5 mr-1" />
                  <span>{discussion.likeCount} likes</span>
                </div>
                <div className="flex items-center text-gray-500">
                  <MessageCircle className="h-5 w-5 mr-1" />
                  <span>{discussion.commentCount} comments</span>
                </div>
              </CardFooter>
              
              <CardFooter className="pt-0 border-t border-gray-100 flex justify-between py-3">
                <Button 
                  variant="ghost" 
                  className={`flex items-center gap-1 text-gray-500 ${
                    discussion.likes.includes(session.user.id) ? 'text-rose-500' : ''
                  }`}
                  onClick={() => handleLike(discussion._id)}
                >
                  <Heart className={`h-5 w-5 ${
                    discussion.likes.includes(session.user.id) ? 'fill-rose-500' : ''
                  }`} />
                  Like
                </Button>
                <Button 
                  variant="ghost" 
                  className="flex items-center gap-1 text-gray-500"
                  onClick={() => openCommentDialog(discussion._id)}
                >
                  <MessageCircle className="h-5 w-5" />
                  Comment
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Comments Dialog */}
      <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{currentDiscussion?.title}</DialogTitle>
            <DialogDescription>
              View and add comments to this discussion
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-80 overflow-y-auto py-4 space-y-4">
            {currentDiscussion?.comments.length === 0 ? (
              <p className="text-center text-gray-500">No comments yet</p>
            ) : (
              currentDiscussion?.comments.map((comment) => (
                <div key={comment._id} className="border-b pb-3 last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{getUserInitials(comment.author.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{comment.author.name}</p>
                        <p className="text-xs text-gray-500">
                          {format(parseISO(comment.created_at), 'PPp')}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {comment.author.role}
                    </Badge>
                  </div>
                  <p className="mt-2 ml-10 text-gray-700">{comment.content}</p>
                </div>
              ))
            )}
          </div>
          
          <div className="pt-4">
            <Textarea
              placeholder="Add your comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="w-full"
            />
          </div>
          
          <DialogFooter>
            <Button onClick={handleAddComment} disabled={!newComment.trim()}>
              Add Comment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}