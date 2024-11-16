'use client'

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown } from "lucide-react"
import * as React from "react"
import { Button } from "@/components/ui/button"

interface Option {
  value: string
  label: string
}

interface ComboboxProps {
  options: Option[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder: string
  allowCustom?: boolean
}

export default function MultiCombobox({ options, value, onChange, placeholder, allowCustom = false }: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")

  const handleSelect = (currentValue: string) => {
    if (value.includes(currentValue)) {
      onChange(value.filter(v => v !== currentValue))
    } else {
      onChange([...value, currentValue])
    }
    // setOpen(false)
  }

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue)
    if (allowCustom && !options.some(option => option.value.toLowerCase() === newValue.toLowerCase())) {
      onChange([...value, newValue])
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between truncate ..."
        >
          {value.length ? value.join(", ") : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandList>
            <CommandInput
              placeholder={`Search ${placeholder.toLowerCase()}...`}
              value={inputValue}
              onValueChange={handleInputChange}
            />
            <CommandEmpty>
              {allowCustom ? `Use "${inputValue}" as custom value` : `No ${placeholder.toLowerCase()} found.`}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => handleSelect(option.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value.includes(option.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}