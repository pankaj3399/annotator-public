'use client'

import { getAllAnnotators } from "@/app/actions/annotator"
import { SheetMenu } from "@/components/admin-panel/sheet-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/hooks/use-toast"
import { formatDistance, parseISO } from "date-fns"
import { MessageCirclePlus, PlusCircle } from 'lucide-react'
import { useSession } from "next-auth/react"
import { useEffect, useState } from 'react'
import { Annotator } from "../../projects/task/[projectId]/page"
import { UserGroups } from "../page"

type GroupListProps = {
  userGroups: UserGroups[]
  selectedGroup: UserGroups | null
  handleCreateGroup: (name?: string, members?: Annotator[]) => void
  setSelectedGroup: (group: UserGroups) => void
  onCreateGroup: () => void
  isMobile: boolean
}

export function GroupList({ userGroups, selectedGroup, handleCreateGroup, setSelectedGroup, onCreateGroup, isMobile }: GroupListProps) {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('')
  const [isCommandOpen, setIsCommandOpen] = useState(false)

  const filteredGroups = userGroups.filter(group =>
    group.group.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const isUserOnline = (lastLogin: string): boolean => {
    const lastLoginDate = new Date(lastLogin);
    const currentTime = new Date();
    return (currentTime.getTime() - lastLoginDate.getTime()) / 1000 <= 15;
  };

  function createchat(user: Annotator) {
    const group = userGroups.find(group =>
      group.group.name === "#chat" &&
      group.group.members.some(member => member._id === user._id))
    if (group) {
      setSelectedGroup(group)
    } else {
      handleCreateGroup('#chat', [user])
      toast({
        title: "Creating chat",
        description: 'Starting chat with ' + user.name + '!'
      })
    }
    setIsCommandOpen(false)
  }

  return (
    <div className={`${isMobile && selectedGroup ? 'hidden' : 'block'} ${isMobile ? 'w-full' : 'w-96'} relative border-r flex flex-col`}>
      <header className="bg-white">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Chat</h1>
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
          {filteredGroups.map(userGroup => (
            <Button
              key={userGroup._id}
              variant={selectedGroup?._id === userGroup._id ? "secondary" : "ghost"}
              className="w-full justify-start h-auto py-2"
              onClick={() => setSelectedGroup(userGroup)}
            >
              <div className="flex items-center space-x-3 w-full">
                <div className="relative">
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarFallback>{userGroup.group.name != '#chat' ? userGroup.group.name[0] : userGroup.group.members.filter(member => member._id !== session?.user.id)?.[0].name[0]}</AvatarFallback>
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
                    <p className="font-medium truncate text-left">{userGroup.group.name != '#chat' ? userGroup.group.name : userGroup.group.members.filter(member => member._id !== session?.user.id)?.[0].name}</p>
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
          ))}
          {filteredGroups.length === 0 && (
            <div className="text-xl text-muted-foreground h-16 flex items-center justify-center">No chats found.</div>
          )}
        </div>
      </ScrollArea>
      {session?.user.role == 'project manager' && <div className="p-4 border-t bg-muted/30">
        <Button onClick={onCreateGroup} className="w-full">
          <PlusCircle className="mr-2" size={16} />
          Create New Group
        </Button>
      </div>}

      <Dialog open={isCommandOpen} onOpenChange={setIsCommandOpen}>
        {session?.user.role == 'project manager' &&
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="absolute h-14 w-14 bottom-[5rem] right-4 rounded-full"
            >
              <MessageCirclePlus className="h-6 w-6" />
            </Button>
          </DialogTrigger>
        }
        <DialogContent className="sm:max-w-[425px] p-0 bg-transparent">
          <AnnotatorList createchat={createchat} />
        </DialogContent>
      </Dialog >
    </div >
  )
}

export default function AnnotatorList({ createchat }: { createchat: (user: Annotator) => void }) {
  const [annotators, setAnnotators] = useState<Annotator[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      setAnnotators(JSON.parse(await getAllAnnotators()))
      setLoading(false)
    }
    init();
  }, []);

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
            >
              {member.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  )
}