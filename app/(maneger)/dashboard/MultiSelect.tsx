'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList, CommandInput } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { getProjectNameAndId } from '@/app/actions/dashboard'

type MemberComboboxProps = {
  selectedMembers: string[]
  setSelectedMembers: React.Dispatch<React.SetStateAction<string[]>>
}

export default function MultiSelect({ selectedMembers, setSelectedMembers }: MemberComboboxProps) {
  const [open, setOpen] = useState(false)
  const [projects, setProjects] = useState<{ id: string, name: string }[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null) // Track hovered project by ID
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(async () => {
      const projectNamesString = await getProjectNameAndId()
      const projectNames = JSON.parse(projectNamesString)
      setProjects(projectNames)
    }, 2500)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchTerm])

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
            ? "Filter projects..."
            : `${selectedMembers.length} project${selectedMembers.length > 1 ? 's' : ''} selected`}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput 
            placeholder="Search projects..." 
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandEmpty>No project found.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {projects.map((project) => (
                <CommandItem
                  key={project.id} // Ensure unique key
                  onSelect={() => handleSelect(project.id)}
                  onMouseEnter={() => setHoveredProjectId(project.id)}
                  onMouseLeave={() => setHoveredProjectId(null)}
                  className={cn(
                    "cursor-pointer",
                    hoveredProjectId === project.id && "bg-accent"
                  )}
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
