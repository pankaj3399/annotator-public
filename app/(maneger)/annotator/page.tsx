'use client'

import { getAllAnnotators } from "@/app/actions/annotator"
import { SheetMenu } from "@/components/admin-panel/sheet-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format, parseISO } from "date-fns"
import { CalendarIcon, Search } from "lucide-react"
import { useEffect, useState } from 'react'

interface User {
  _id: string;
  name: string;
  email: string;
  lastLogin: Date;
}

export default function AnnotatorsPage() {
  const [annotators, setAnnotators] = useState<User[]>([])
  const [filteredAnnotators, setFilteredAnnotators] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchAnnotators = async () => {
      const data = JSON.parse(await getAllAnnotators())
      setAnnotators(data)
      setFilteredAnnotators(data)
    }
    fetchAnnotators()
  }, [])

  useEffect(() => {
    const filtered = annotators.filter(user => 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredAnnotators(filtered)
  }, [searchTerm, annotators])

  return (
    <div className="min-h-screen">
      <header className="bg-white">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Annotators</h1>
          <SheetMenu />
        </div>
      </header>
      <main className="max-w-7xl mx-auto sm:px-6 lg:px-8">
        <div className="mb-6 mt-4">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search annotators..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          </div>
        </div>
        {filteredAnnotators.length === 0 ? (
          <div className="text-center py-10">
            <h2 className="text-xl font-semibold text-gray-900">No annotators found</h2>
            <p className="mt-2 text-gray-600">Alll annotators will be shown here</p>
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Last Login</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAnnotators.map((user) => (
                  <TableRow
                    key={user._id}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-gray-500">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(parseISO(user.lastLogin.toString()), 'PPPpp')}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  )
}