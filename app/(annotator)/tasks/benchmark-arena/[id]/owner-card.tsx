'use client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  Mail, 
  UserCircle, 
  MapPin, 
  Clock, 
  BookOpen, 
  GraduationCap,
  Briefcase,
  Phone
} from "lucide-react"
import { format } from "date-fns"

interface OwnerCardProps {
  owner: {
    _id: string
    name: string
    role: string
    email: string
    domain: string[]
    lastLogin: string
    location: string
    phone: string
    isReadyToWork: boolean
    lang: string[]
    enrolledCourses: string[]
    created_at: string
    permission: string[]
  }
}

export function OwnerCard({ owner }: OwnerCardProps) {
  return (
    <Card className="bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16 border-2 border-primary">
            <AvatarFallback className="bg-primary/10 text-primary">
              {owner.name[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold">{owner.name}</CardTitle>
            <Badge variant="secondary" className="capitalize">
              {owner.role}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            <span className="text-sm">{owner.email}</span>
          </div>
          {owner.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              <span className="text-sm">{owner.phone}</span>
            </div>
          )}
          {owner.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-sm">{owner.location || "Location not set"}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <UserCircle className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Domains</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {owner.domain.filter(d => d).length > 0 ? (
              owner.domain.map((d, i) => (
                <Badge key={i} variant="outline">{d}</Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No domains specified</span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Languages</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {owner.lang.filter(l => l).length > 0 ? (
              owner.lang.map((l, i) => (
                <Badge key={i} variant="outline">{l}</Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No languages specified</span>
            )}
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm">Last Active</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {format(new Date(owner.lastLogin), "MMM d, yyyy")}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              <span className="text-sm">Status</span>
            </div>
            <Badge variant={owner.isReadyToWork ? "default" : "secondary"}>
              {owner.isReadyToWork ? "Available" : "Unavailable"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="text-sm">Courses</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {owner.enrolledCourses.length}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}