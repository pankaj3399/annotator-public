'use client'

import { deleteGroup } from "@/app/actions/chat"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import useUserGroups from "@/hooks/use-userGroups"
import { sortUserGroupsByLastMessage } from "@/lib/utils"
import { MessageCircle, MoreVertical, Trash2, UserMinus, UserPlus, Users, X } from 'lucide-react'
import { useSession } from "next-auth/react"
import { useEffect, useState } from 'react'
import { Annotator } from "../projects/task/[projectId]/page"
import { ChatArea } from "./_components/chatArea"
import { GroupList } from './_components/groupList'
import MemberCombobox from "./_components/MemberCombobox"

type Message = {
  _id: string
  sender: Annotator
  content: string
  sent_at: string
}

export type Groups = {
  _id: string
  name: string
  members: Annotator[]
  projectManager: Annotator
  lastMessage?: Message
  created_at: string
}

export type UserGroups = {
  _id: string
  group: Groups
  user: Annotator
  lastReadMessage?: Message
  joined_at: string
}


export default function ChatUI() {
  const { userGroups, setUserGroups, removeUserGroup } = useUserGroups()
  const [selectedGroup, setSelectedGroup] = useState<UserGroups | null>(null)
  // create
  const [newGroupName, setNewGroupName] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<Annotator[]>([])
  const [openCreateDialog, setOpenCreateDialog] = useState(false)
  const [openEditDialog, setOpenEditDialog] = useState(false)
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    async function init() {
      const res = await fetch('/api/chat/userGroups').then(res => res.json())
      if (!res.success) {
        console.log(res.error)
        return
      }
      setUserGroups(sortUserGroupsByLastMessage(res.userGroups) as UserGroups[])
    }
    init()
    const intervalId = setInterval(() => {
      init() // Fetch messages every 3 seconds
    }, 5000)

    return () => clearInterval(intervalId)
  }, [])


  const handleCreateGroup = async (name?: string, members?: Annotator[]) => {
    if ((name != undefined && members != undefined) ? (name && members.length > 0) : (newGroupName.trim() && selectedMembers.length > 0)) {
      setLoading(true)
      const res = await fetch('/api/chat/createGroup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupName: name != undefined ? name : newGroupName.trim(), members: members != undefined ? members : selectedMembers.map(m => m._id) }),
      })
      const data = await res.json()
      if (!data.success) {
        toast({
          title: 'Error',
          description: data.error,
          variant: 'destructive',
        })
        return
      } else {
        if (newGroupName == '#chat') {
          toast({
            title: 'Success',
            description: 'Chat created successfully',
          })
          return
        }
        toast({
          title: 'Success',
          description: 'Group created successfully',
        })
      }

      setLoading(false)
      setUserGroups([...userGroups, data.userGroups as UserGroups])
      setNewGroupName('')
      setSelectedMembers([])
      setOpenCreateDialog(false)
    }
  }

  const editGroup = async () => {
    if (selectedGroup && newGroupName.trim() && selectedMembers.length > 0) {
      setLoading(true)
      const res = await fetch('/api/chat/editGroup', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groupId: selectedGroup.group._id,
          name: newGroupName.trim(),
          members: selectedMembers.map(m => m._id)
        }),
      })
      const data = await res.json()
      if (!data.success) {
        toast({
          title: 'Error',
          description: data.error,
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      const updatedGroup = {
        ...selectedGroup,
        group: {
          ...selectedGroup.group,
          name: newGroupName.trim(),
          members: selectedMembers
        }
      }

      setUserGroups(userGroups.map(group => group._id === selectedGroup._id ? updatedGroup : group))
      setSelectedGroup(updatedGroup)
      setNewGroupName('')
      setSelectedMembers([])
      setOpenEditDialog(false)
      setLoading(false)

      toast({
        title: 'Success',
        description: 'Group updated successfully',
      })
    }
  }

  async function handleDeleteGroup(id: string) {
    const res = await deleteGroup(id)
    if (!res.success) {
      toast({
        title: 'Error',
        description: res.message,
        variant: 'destructive',
      })
      return
    }

    removeUserGroup(id)
    setSelectedGroup(null)
  }

  const handleGroupSelect = (group: UserGroups) => {
    setSelectedGroup(group)
    setUserGroups(userGroups.map(g => g._id === group._id ? { ...g } : g))
  }

  return (
    <div className="flex h-screen w-full mx-auto overflow-hidden bg-background">
      <GroupList userGroups={userGroups} handleCreateGroup={handleCreateGroup} selectedGroup={selectedGroup} setSelectedGroup={handleGroupSelect} onCreateGroup={() => setOpenCreateDialog(true)} isMobile={isMobile} />
      <div className={`flex-1 flex flex-col ${isMobile && !selectedGroup ? 'hidden' : 'block'}`}>
        {selectedGroup ? (
          <> {isMobile && (
            <Button
              variant="ghost"
              className={`absolute top-5 ${session?.user.role == 'project manager' ? 'right-10 top-5' : 'right-2'} z-10`}
              onClick={() => setSelectedGroup(null)}
            >
              <X className="h-6 w-6" />
            </Button>
          )}
            <div className="p-4 border-b bg-muted/30 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback>{selectedGroup.group.name != '#chat' ? selectedGroup.group.name[0] : selectedGroup.group.members.filter(member => member._id !== session?.user.id)?.[0].name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-lg font-semibold">{selectedGroup.group.name != '#chat' ? selectedGroup.group.name : selectedGroup.group.members.filter(member => member._id !== session?.user.id)?.[0].name}</h2>
                  {selectedGroup.group.name != '#chat' && <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="mr-1" size={14} />
                    {selectedGroup.group.members.length} members
                  </div>}
                </div>
              </div>
              {session?.user.role == 'project manager' && <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">More options</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {selectedGroup.group.name != '#chat' && <DialogTrigger asChild>
                      <DropdownMenuItem onSelect={() => {
                        setNewGroupName(selectedGroup.group.name)
                        setSelectedMembers(selectedGroup.group.members)
                      }}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        <span>Edit group</span>
                      </DropdownMenuItem>
                    </DialogTrigger>}
                    <DropdownMenuItem onClick={() => handleDeleteGroup(selectedGroup.group._id)}><Trash2 className="mr-2 h-4 w-4" />    {selectedGroup.group.name != '#chat' ? 'Delete group' : 'Delete Chat'}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Group</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="edit-group-name">Group Name</Label>
                      <Input
                        id="edit-group-name"
                        placeholder="Enter group name"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Select Members</Label>
                      <MemberCombobox selectedMembers={selectedMembers} setSelectedMembers={setSelectedMembers} />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedMembers.map(member => (
                        <div key={member._id} className="flex items-center bg-muted rounded-full px-3 py-1">
                          <Avatar className="w-6 h-6 mr-2">
                            <AvatarFallback>{member.name[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{member.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-2 h-auto p-0"
                            onClick={() => setSelectedMembers(selectedMembers.filter(m => m._id !== member._id))}
                          >
                            <UserMinus size={14} />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button onClick={editGroup} className="w-full">
                      Save Changes
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              }
            </div>
            <ChatArea groupId={selectedGroup.group._id} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h2 className="mt-2 text-xl font-semibold">Welcome to Chat</h2>
              <p className="mt-1 text-sm text-muted-foreground">Select a group to start chatting</p>
            </div>
          </div>
        )}
      </div>
      <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                placeholder="Enter group name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
            </div>
            <div>
              <Label>Select Members</Label>
              <MemberCombobox selectedMembers={selectedMembers} setSelectedMembers={setSelectedMembers} />
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedMembers.map(member => (
                <div key={member._id} className="flex items-center bg-muted rounded-full px-3 py-1">
                  <Avatar className="w-6 h-6 mr-2">
                    <AvatarFallback>{member.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{member.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-auto p-0"
                    onClick={() => setSelectedMembers(selectedMembers.filter(m => m._id !== member._id))}
                  >
                    <UserMinus size={14} />
                  </Button>
                </div>
              ))}
            </div>
            <Button disabled={loading} onClick={()=>handleCreateGroup()} className="w-full">
              Create Group
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}