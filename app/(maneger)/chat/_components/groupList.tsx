'use client'

import { getAllAnnotators } from "@/app/actions/annotator"
import { SheetMenu } from "@/components/admin-panel/sheet-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/hooks/use-toast"
import { formatDistance, parseISO } from "date-fns"
import { MessageCirclePlus, PlusCircle } from 'lucide-react'
import { useSession } from "next-auth/react"
import { useEffect, useState } from 'react'
import { UserGroups } from "../page"
import { Switch } from "@/components/ui/switch"

import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
type Annotator = {
  _id: string;
  name: string;
  email: string;
  isReadyToWork: boolean; 
  lastLogin: string;
  permission?: string[];
  role : string | null;
}

type GroupListProps = {
  userGroups: UserGroups[]
  selectedGroup: UserGroups | null
  handleCreateGroup: (name?: string, members?: Annotator[]) => void
  setSelectedGroup: (group: UserGroups) => void
  onCreateGroup: () => void
  isMobile: boolean
}

export function GroupList({
  userGroups,
  selectedGroup,
  handleCreateGroup,
  setSelectedGroup,
  onCreateGroup,
  isMobile,
}: GroupListProps) {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isReadyToWork, setIsReadyToWork] = useState(false);
  const [isToggleWorkDialogOpen, setIsToggleWorkDialogOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // Default to 'all'

  const filteredGroups = userGroups.filter(group =>
    group.group.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (filter === 'all' || (filter === 'ready' && group.group.members.some(member => member.isReadyToWork)))

  );

  const isUserOnline = (lastLogin: string): boolean => {
    const lastLoginDate = new Date(lastLogin);
    const currentTime = new Date();
    return (currentTime.getTime() - lastLoginDate.getTime()) / 1000 <= 15;
  };

  function createchat(user: Annotator) {
    const group = userGroups.find(group =>
      group.group.name === "#chat" &&
      group.group.members.some(member => member._id === user._id)
    );
    if (group) {
      setSelectedGroup(group);
    } else {
      handleCreateGroup('#chat', [user]);
      toast({
        title: "Creating chat",
        description: 'Starting chat with ' + user.name + '!',
      });
    }
    setIsCommandOpen(false);
  }

  useEffect(() => {
    if (session?.user?.role === 'annotator') {
      fetchReadyToWorkStatus();
    }
  }, [session]);

  async function fetchReadyToWorkStatus() {
    try {
      const response = await fetch('/api/updateAnnotatorWorkStatus');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setIsReadyToWork(data.isReadyToWork);
    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
  }

  const router = useRouter();
  const updateReadyToWorkStatus = async (newStatus: boolean) => {
    try {
      const response = await fetch('/api/updateAnnotatorWorkStatus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isReadyToWork: newStatus }),
      });
      if (response.ok) {
        setIsReadyToWork(newStatus);
        router.refresh();
        toast({
          title: "Updated successfully",
          description: newStatus
            ? "You will start to recieve tasks soon!!"
            : "Thanks for your work, see you next time",
        })
        
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating ready to work status:', error);
      toast({
        title: "Error",
        description: "Failed to update your status. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div
      className={`${isMobile && selectedGroup ? 'hidden' : 'block'} ${isMobile ? 'w-full' : 'w-96'} relative border-r flex flex-col`}
    >
      <header className="bg-white">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Chat</h1>
          <div className="text-sm flex space-x-4 ">
            <div className="flex items-center space-x-2">
            {session?.user?.role === 'annotator' ? (
    <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-md">
      <Switch
        checked={isReadyToWork}
        onCheckedChange={() => setIsToggleWorkDialogOpen(true)}
      />
      <span className="text-sm font-medium">
        {isReadyToWork ? (
          <span className="flex items-center gap-1.5 text-green-600">
            Ready to work
            <div className="h-2 w-2 rounded-full bg-green-500" />
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            Not ready
            <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
          </span>
        )}
      </span>
    </div>
  ) : session?.user?.role === 'project manager' ? (
    <div className="flex items-center gap-2">
<Select
  value={filter}
  onValueChange={(value) => setFilter(value)} 
>
  <SelectTrigger className="w-full px-4 py-2 rounded-md bg-white text-sm text-gray-800 hover:bg-indigo-100 focus:bg-indigo-100 focus:text-indigo-600">
    {filter === 'all' ? 'All Users' : 'Ready to Work'}
  </SelectTrigger>

  <SelectContent className="border border-gray-300 rounded-lg mt-2 bg-white shadow-lg">
    <SelectItem value="all" className="py-2 px-4 text-gray-800 rounded-md hover:bg-indigo-100 hover:text-indigo-600 focus:bg-indigo-100 focus:text-indigo-600">
      All Users
    </SelectItem>
    <SelectItem value="ready" className="py-2 px-4 text-green-600 rounded-md hover:bg-green-100 hover:text-green-700 focus:bg-green-100 focus:text-green-700">
      Ready to Work
    </SelectItem>
  </SelectContent>
</Select>


    </div>
  ) : null}
            </div>
          </div>
          <SheetMenu />
        </div>
      </header>
      <div className="p-4">
        <Input
          type="search"
          placeholder="Search chats..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
      </div>
      <ScrollArea className="flex-grow">
        <div className="p-4 space-y-2">
          {filteredGroups.length === 0 ? (
            <div className="text-xl text-muted-foreground h-16 flex items-center justify-center">No chats found.</div>
          ) : (
            filteredGroups.map((userGroup) => (
              <Button
                key={userGroup._id}
                variant={selectedGroup?._id === userGroup._id ? "secondary" : "ghost"}
                className="w-full justify-start h-auto py-2"
                onClick={() => setSelectedGroup(userGroup)}
              >
                <div className="flex items-center space-x-3 w-full">
                  <div className="relative">
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarFallback>{userGroup.group.name !== '#chat' ? userGroup.group.name[0] : userGroup.group.members.filter(member => member._id !== session?.user.id)?.[0].name[0]}</AvatarFallback>
                    </Avatar>
                    {userGroup.group.name === '#chat' && (
                      <>
                        {isUserOnline(userGroup.group.members.filter(member => member._id !== session?.user.id)?.[0].lastLogin) && (
                          <span className="absolute z-30 bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex justify-between">
                      <p className="font-medium truncate text-left">{userGroup.group.name !== '#chat' ? userGroup.group.name : userGroup.group.members.filter(member => member._id !== session?.user.id)?.[0].name}</p>
                      <p className="font-normal text-muted-foreground text-xs truncate text-left">{userGroup.group.lastMessage?.sent_at ? formatDistance(parseISO(userGroup.group.lastMessage.sent_at), new Date()) : 'No messages yet'}</p>
                    </div>
                    <p className="text-xs text-muted-foreground truncate text-left">
                      {userGroup?.group.lastMessage ? (
                        <>
                          <span className="font-medium">{userGroup.group.lastMessage.sender?.name ? userGroup.group.lastMessage.sender.name : 'Deleted User'}: </span>
                          {userGroup.group.lastMessage.content}
                        </>
                      ) : (
                        'No messages yet'
                      )}
                    </p>
                  </div>
                  {(!userGroup?.lastReadMessage ? (userGroup.group.lastMessage) : (userGroup.lastReadMessage && userGroup.group.lastMessage && userGroup?.lastReadMessage._id !== userGroup.group.lastMessage._id)) && (
                    <span className="flex h-2 w-2 rounded-full bg-blue-600 flex-shrink-0" />
                  )}
                </div>
              </Button>
            ))
          )}
        </div>
      </ScrollArea>
      {session?.user.role === 'project manager' && (
        <div className="p-4 border-t bg-muted/30">
          <Button onClick={onCreateGroup} className="w-full">
            <PlusCircle className="mr-2" size={16} />
            Create New Group
          </Button>
        </div>
      )}

      {/* Dialogs for toggling work status */}
      <Dialog open={isCommandOpen} onOpenChange={setIsCommandOpen}>
        {session?.user.role === 'project manager' && (
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="absolute h-14 w-14 bottom-[5rem] right-4 rounded-full"
            >
              <MessageCirclePlus className="h-6 w-6" />
            </Button>
          </DialogTrigger>
        )}
        <DialogContent className="sm:max-w-[425px] p-0 bg-transparent">
          <AnnotatorList createchat={createchat} />
        </DialogContent>
      </Dialog >

      <Dialog open={isToggleWorkDialogOpen} onOpenChange={setIsToggleWorkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogDescription>
              {isReadyToWork
                ? "Are you sure you want to change your status? Project managers will not be able to assign you tasks."
                : "Are you sure you want to change your status? This will allow project managers to assign you tasks."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsToggleWorkDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              updateReadyToWorkStatus(!isReadyToWork);
              setIsToggleWorkDialogOpen(false);
            }}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AnnotatorList({ createchat }: { createchat: (user: Annotator) => void }) {
  const [annotators, setAnnotators] = useState<Annotator[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const data = JSON.parse(await getAllAnnotators())
      // Sort annotators such that `isReadyToWork: true` appear first
      const sortedAnnotators = data.sort((a: Annotator, b: Annotator) =>
        Number(b.isReadyToWork) - Number(a.isReadyToWork)
      )
      setAnnotators(sortedAnnotators)
      setLoading(false)
    }
    init()
  }, [])

  return (
    <Command>
      <CommandInput placeholder="Search members..." />
      <CommandEmpty>{loading ? 'Loading...' : 'No member found.'}</CommandEmpty>
      <CommandList>
        <CommandGroup>
          {annotators.map((member) => (
            <CommandItem
              key={member._id}
              onSelect={() => createchat(member)}
              className="flex items-center space-x-2"
            >
              <span
                className={`w-3 h-3 rounded-full ${
                  member.isReadyToWork ? 'bg-green-500' : 'bg-gray-400'
                }`}
              ></span>
              <span>{member.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  )
}