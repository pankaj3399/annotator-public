"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { UserIcon, Mail, Phone, MapPin, Globe, Shield, Calendar, Linkedin, FileText, Settings, Briefcase, Languages, ArrowLeft } from 'lucide-react';
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import Loader from "@/components/ui/Loader/Loader";
import { useParams, useRouter } from "next/navigation";

interface UserData {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  location?: string;
  domain?: string[];
  lang?: string[];
  permission?: string[];
  lastLogin: string;
  created_at: string;
  linkedin?: string;
  resume?: string;
  nda?: string;
  customFields?: { [key: string]: any };
}

export default function AnnotatorProfile() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const { data: session, status } = useSession();
  const router = useRouter();
  const {userId} = useParams();

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (session?.user?.id) {
          const userResponse = await fetch(`/api/users/profile/${userId}`);
          if (!userResponse.ok) throw new Error("Failed to fetch user data");
          const userData = await userResponse.json();
          setUserData(userData);
          toast.success("Profile loaded successfully!");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load profile data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (status === "loading") return;
    if (!session) {
      router.push("/auth/login");
      return;
    }

    fetchData();
  }, [session, status, router]);

  if (status === "loading" || loading) return <Loader />;

  if (!userData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-gray-600">No user data available</p>
      </div>
    );
  }

  const handleGoBack = ()=>{
    router.push('/annotator')
  }

  const renderValue = (value: string | string[] | undefined, fallback: string = "Not specified") => {
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(", ") : fallback;
    }
    return value || fallback;
  };
  const renderArrayValue = (arr: string[] | undefined) => {
    if (!arr) return "Not Specified";
    
    const validValues = arr.filter(item => item.trim().length > 0);
    
    if (validValues.length === 0) {
      return "Not Specified";
    }
    
    return validValues.join(", ");
  };

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center space-x-4">
        <button
          className="flex items-center justify-center w-8 h-8 bg-gray-200 text-gray-700 rounded-full shadow-md hover:bg-gray-300 transition-colors"
          onClick={handleGoBack} 
          aria-label="Go Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Annotator Profile</h1>
      </div>

      {userData.role === "system admin" && (
        <Button
          onClick={() => router.push("/admin/custom-fields")}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          Manage Custom Fields
        </Button>
      )}
        <Card className="overflow-hidden">
          <CardHeader className="bg-primary/5 pb-4">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <UserIcon className="w-6 h-6" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <InfoItem icon={<UserIcon />} label="Full Name" value={renderValue(userData.name)} />
              <InfoItem icon={<Mail />} label="Email" value={renderValue(userData.email)} />
              <InfoItem icon={<Phone />} label="Phone" value={renderValue(userData.phone)} />
              <InfoItem icon={<MapPin />} label="Location" value={renderValue(userData.location)} />
              <InfoItem icon={<Linkedin />} label="LinkedIn Profile" value={renderValue(userData.linkedin)} />
                <InfoItem 
                icon={<Briefcase />} 
                label="Domain" 
                value={renderArrayValue(userData.domain)} 
              />
              <InfoItem 
                icon={<Languages />} 
                label="Languages" 
                value={renderArrayValue(userData.lang)} 
              />
            </div>
            <Separator className="my-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <InfoItem icon={<FileText />} label="Resume" value={renderValue(userData.resume, "No resume uploaded")} />
              <InfoItem icon={<FileText />} label="NDA Document" value={renderValue(userData.nda, "No NDA uploaded")} />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="bg-primary/5 pb-4">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Shield className="w-6 h-6" />
              Role & Permissions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Role</h3>
                <Badge variant="outline" className="text-base capitalize">
                  {renderValue(userData.role)}
                </Badge>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Permissions</h3>
                <div className="flex flex-wrap gap-2">
                  {userData.permission && userData.permission.length > 0 ? (
                    userData.permission.map((perm, index) => (
                      <Badge key={index} variant="secondary">
                        {perm}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-gray-500">No permissions assigned</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="bg-primary/5 pb-4">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Calendar className="w-6 h-6" />
              Account Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <InfoItem
                icon={<Calendar />}
                label="Last Login"
                value={userData.lastLogin ? format(new Date(userData.lastLogin), "PPP") : "Not available"}
              />
              <InfoItem
                icon={<Calendar />}
                label="Account Created"
                value={userData.created_at ? format(new Date(userData.created_at), "PPP") : "Not available"}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function InfoItem({ icon, label, value }: InfoItemProps) {
  return (
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0 mt-1">
        {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5 text-gray-400" })}
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-500">{label}</h3>
        <p className="mt-1 text-sm text-gray-900">{value}</p>
      </div>
    </div>
  );
}

