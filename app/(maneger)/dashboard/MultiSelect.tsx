'use client'

import { useState, useCallback, useEffect } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { getProjectNameAndId } from '@/app/actions/dashboard'  // Updated function name

type MemberComboboxProps = {
  selectedMembers: string[] // This is an array of project ids
  setSelectedMembers: React.Dispatch<React.SetStateAction<string[]>>
}

export default function MultiSelect({ selectedMembers, setSelectedMembers }: MemberComboboxProps) {
  const [open, setOpen] = useState(false)
  const [projects, setProjects] = useState<{ id: string, name: string }[]>([])

  useEffect(() => {
    async function init() {
      const projectNamesString = await getProjectNameAndId()  // Updated function call
      const projectNames = JSON.parse(projectNamesString)  // Parse the response into an array of objects
      setProjects(projectNames)
    }
    init();
  }, []);

  const handleSelect = useCallback((projectId: string) => {
    setSelectedMembers((prev) => {
      const index = prev.indexOf(projectId)
      if (index >= 0) {
        return prev.filter((p) => p !== projectId)
      } else {
        return [...prev, projectId]
      }
    })
  }, [setSelectedMembers])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedMembers.length === 0
            ? "Select projects..."
            : `${selectedMembers.length} project${selectedMembers.length > 1 ? 's' : ''} selected`}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search projects..." />
          <CommandEmpty>No project found.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  onSelect={() => handleSelect(project.id)} // Handle the project by its id
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedMembers.includes(project.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {project.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
