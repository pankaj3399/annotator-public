import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getStatusBadgeVariant } from "@/lib/constants"
import { format, parseISO } from "date-fns"
import { CalendarIcon, NotebookPen } from "lucide-react"
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { task } from "../all/page"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

export default function TaskTable({ tasks }: { tasks: task[] }) {
  const [dialog, setDialog] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const page = searchParams.get('page')
    if (page) {
      setCurrentPage(Number(page))
    }
  }, [searchParams])

  function handleclick(e: React.MouseEvent, feedback: string) {
    e.stopPropagation()
    setFeedback(feedback)
    setDialog(true)
  }

  // Calculate pagination values
  const totalPages = Math.ceil(tasks.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const currentTasks = tasks.slice(startIndex, endIndex)

  // Handle page changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    const params = new URLSearchParams(searchParams)
    params.set('page', page.toString())
    router.push(`?${params.toString()}`)
  }

  // Handle page size changes
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setCurrentPage(1)
    const params = new URLSearchParams(searchParams)
    params.set('page', '1')
    params.set('size', newSize.toString())
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="bg-white shadow-sm rounded-lg">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Rows per page:</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => handlePageSizeChange(parseInt(value))}
          >
            <SelectTrigger className="w-24">
              <SelectValue>{pageSize}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tasks Name</TableHead>
            <TableHead>Created Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-center">Feedback</TableHead>
            <TableHead className="text-center">Submitted</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentTasks.map((task) => (
            <TableRow
              key={task._id}
              onClick={() => router.push(`/task/${task._id}`)}
              className="cursor-pointer hover:bg-gray-50"
            >
              <TableCell className="font-medium">{task.name}</TableCell>
              <TableCell>
                <div className="flex items-center text-sm text-gray-500">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(parseISO(task.created_at), 'PPP')}
                </div>
              </TableCell>
              <TableCell className="font-medium">
                <Badge variant={getStatusBadgeVariant(task.status)}>
                  {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                {task.feedback ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleclick(e, task.feedback)}
                  >
                    <NotebookPen className="h-4 w-4" />
                    <span className="sr-only">feedback</span>
                  </Button>
                ) : (
                  "no feedback"
                )}
              </TableCell>
              <TableCell className="font-medium text-center">
                {task.submitted ? '✔️' : '❌'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-200">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={`?page=${currentPage - 1}`}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
              
              {[...Array(totalPages)].map((_, index) => {
                const pageNumber = index + 1;
                if (
                  pageNumber === 1 ||
                  pageNumber === totalPages ||
                  (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                ) {
                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        href={`?page=${pageNumber}`}
                        onClick={() => handlePageChange(pageNumber)}
                        isActive={pageNumber === currentPage}
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  );
                } else if (
                  pageNumber === currentPage - 2 ||
                  pageNumber === currentPage + 2
                ) {
                  return <PaginationEllipsis key={pageNumber} />;
                }
                return null;
              })}

              <PaginationItem>
                <PaginationNext
                  href={`?page=${currentPage + 1}`}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Feedback</DialogTitle>
            <DialogDescription>
              {feedback}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-start">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}