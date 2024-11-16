'use client'

import { useState, useCallback, useEffect } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { getAllAnnotators } from '@/app/actions/annotator'
import { Annotator } from '../../projects/task/[projectId]/page'

type MemberComboboxProps = {
  selectedMembers: Annotator[]
  setSelectedMembers: React.Dispatch<React.SetStateAction<Annotator[]>>
}

export default function MemberCombobox({ selectedMembers, setSelectedMembers }: MemberComboboxProps) {
  const [open, setOpen] = useState(false)
  const [annotators, setAnnotators] = useState<Annotator[]>([])


  useEffect(() => {
    async function init() {
      setAnnotators(JSON.parse(await getAllAnnotators()))
    }
    init();
  }, []);

  const handleSelect = useCallback((member: Annotator) => {
    setSelectedMembers((prev) => {
      const index = prev.findIndex((m) => m._id === member._id)
      if (index >= 0) {
        return prev.filter((m) => m._id !== member._id)
      } else {
        return [...prev, member]
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
            ? "Select members..."
            : `${selectedMembers.length} member${selectedMembers.length > 1 ? 's' : ''} selected`}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search members..." />
          <CommandEmpty>No member found.</CommandEmpty>
            <CommandList>
          <CommandGroup>
              {annotators.map((member) => (
                <CommandItem
                  key={member._id}
                  onSelect={() => handleSelect(member)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedMembers.some((m) => m._id === member._id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {member.name}
                </CommandItem>
              ))}
          </CommandGroup>
            </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}