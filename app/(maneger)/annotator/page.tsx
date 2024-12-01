'use client'
import { useEffect, useState } from 'react'
import { getAllAnnotators } from "@/app/actions/annotator"
import { SheetMenu } from "@/components/admin-panel/sheet-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format, parseISO } from "date-fns"
import { CalendarIcon, Save, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import MultiCombobox from "@/components/ui/multi-combobox"

interface User {
  _id: string;
  name: string;
  email: string;
  permission: string[];
  lastLogin: Date;
}

interface Option {
  value: string;
  label: string;
}

// Permission mapping between frontend display and backend values
const permissionMapping: { [key: string]: string } = {
  canReview: "Can Review",
  noPermission: "No Permission",
  "Can Review": "canReview",
  "No Permission": "noPermission"
};

const permissions = ['No Permission', 'Can Review'];
const permissionOptions: Option[] = permissions.map((permission) => ({
  value: permission,
  label: permission,
}));
;

export default function AnnotatorsPage() {
  const [annotators, setAnnotators] = useState<User[]>([])
  const [filteredAnnotators, setFilteredAnnotators] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [reviewPermissionsState, setReviewPermissionsState] = useState<{ [key: string]: string[] }>({});
  const { toast } = useToast()

  useEffect(() => {
    const fetchAnnotators = async () => {
      try {
        const data = JSON.parse(await getAllAnnotators())
        const transformedData = data.map((annotator: User) => {
          // Handle the case where permission is empty or contains backend values
          const currentPermissions = annotator.permission || ['noPermission'];
          
          // Transform permissions to frontend format
          const transformedPermissions = currentPermissions.map(perm => 
            permissionMapping[perm] || 'No Permission'
          );

          return {
            ...annotator,
            permission: transformedPermissions
          };
        });

        setAnnotators(transformedData)
        setFilteredAnnotators(transformedData)

        // Initialize the reviewPermissionsState
        const initialPermissionsState = transformedData.reduce((acc: { [key: string]: string[] }, user: User) => {
          acc[user._id] = user.permission;
          return acc;
        }, {});

        setReviewPermissionsState(initialPermissionsState);
      } catch (error) {
        console.error('Error fetching annotators:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch annotators",
        });
      }
    }

    fetchAnnotators()
  }, [toast])

  useEffect(() => {
    const filtered = annotators.filter(user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredAnnotators(filtered)
  }, [searchTerm, annotators])

  const savePermissions = async (userId: string) => {
    // Get the current permissions for this user
    const currentPermissions = reviewPermissionsState[userId] || ['No Permission'];
    
    // Transform the permissions back to backend format
    const backendPermissions = currentPermissions.map(permission => 
      permissionMapping[permission] || permission
    );

    try {
      const response = await fetch(`/api/annotator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          user_id: userId, 
          permission: backendPermissions
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update permissions');
      }

      const data = await response.json();
      toast({
        variant: "default",
        title: "Success!",
        description: data.message || "Permissions updated successfully",
      });

      // Update local state with the frontend display values
      setAnnotators(prevAnnotators => 
        prevAnnotators.map(annotator => 
          annotator._id === userId 
            ? { ...annotator, permission: reviewPermissionsState[userId] }
            : annotator
        )
      );

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: error.message || "An unexpected error occurred.",
      });
    }
  }
  return (
    <div className="min-h-screen">
      <header className="bg-white">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Experts</h1>
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
            <p className="mt-2 text-gray-600">All annotators will be shown here</p>
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Permission</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAnnotators.map((user) => {
                  const localReviewPermission = reviewPermissionsState[user._id] || ['No Permission'];

                  return (
                    <TableRow key={user._id} className="cursor-pointer hover:bg-gray-50">
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center w-2/3">
                          <MultiCombobox
                            options={permissionOptions}
                            value={localReviewPermission}
                            onChange={(value: string[]) => {
                              setReviewPermissionsState(prevState => ({
                                ...prevState,
                                [user._id]: value,
                              }));
                            }}
                            placeholder="Select Permission"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-gray-500">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(parseISO(user.lastLogin.toString()), 'PPPpp')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <button
                          className=""
                          onClick={() => savePermissions(user._id)}
                        >
                          <Save className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  )
}