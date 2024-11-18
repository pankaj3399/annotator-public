"use client";
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Globe,
  Shield,
  Calendar,
  Linkedin,
  FileText,
  Save,
  Upload,
} from "lucide-react";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import Loader from "@/components/ui/Loader/Loader";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/FileUpload";

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
}

const ProfilePage = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [editedData, setEditedData] = useState<Partial<UserData>>({});
  const [loading, setLoading] = useState(true);

  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (session?.user?.id) {
          const response = await fetch(`/api/users/profile/${session.user.id}`);
          if (!response.ok) throw new Error("Failed to fetch user data");
          const data = await response.json();
          setUserData(data);
          setEditedData(data);
          toast.success("Profile loaded successfully!");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
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

    fetchUserData();
  }, [session, status, router]);

  const handleInputChange = (field: keyof UserData, value: any) => {
    setEditedData((prev) => ({ ...prev, [field]: value }));
  };

  const validateData = () => {
    if (editedData.name && editedData.name.trim().length < 2) {
      toast.error("Name must be at least 2 characters long");
      return false;
    }

    if (editedData.phone && !/^\+?[\d\s-]{10,}$/.test(editedData.phone)) {
      toast.error("Please enter a valid phone number");
      return false;
    }

    if (editedData.linkedin && !editedData.linkedin.includes("linkedin.com")) {
      toast.error("Please enter a valid LinkedIn URL");
      return false;
    }

    return true;
  };

  const handleSaveAll = async () => {
    if (!userData?._id) return;
    if (!validateData()) return;

    try {
      const response = await fetch(`/api/users/profile/${userData._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editedData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update profile");
      }

      const { user: updatedUser } = await response.json();
      setUserData(updatedUser);
      setEditedData(updatedUser);
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(`Failed to update profile: ${(error as any).message}`);
    }
  };

  if (status === "loading" || loading) return <Loader />;

  if (!userData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-gray-600">No user data available</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <Button onClick={handleSaveAll} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </div>

        <div className="space-y-6">
          {/* Basic Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="w-5 h-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={editedData.name || ""}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Email</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-700">{userData.email}</p>
                  </div>
                </div>

                <div>
                  <Label>Phone</Label>
                  <Input
                    value={editedData.phone || ""}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    className="mt-1"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <Label>Location</Label>
                  <Input
                    value={editedData.location || ""}
                    onChange={(e) =>
                      handleInputChange("location", e.target.value)
                    }
                    className="mt-1"
                    placeholder="Enter location"
                  />
                </div>

                <div>
                  <Label>LinkedIn Profile</Label>
                  <Input
                    value={editedData.linkedin || ""}
                    onChange={(e) =>
                      handleInputChange("linkedin", e.target.value)
                    }
                    className="mt-1"
                    placeholder="LinkedIn URL"
                  />
                </div>

                <div>
                  <Label>Domain</Label>
                  <Input
                    value={editedData.domain?.join(", ") || ""}
                    onChange={(e) =>
                      handleInputChange(
                        "domain",
                        e.target.value.split(",").map((item) => item.trim())
                      )
                    }
                    className="mt-1"
                    placeholder="Enter domains (comma-separated)"
                  />
                </div>

                <div>
                  <Label>Languages</Label>
                  <Input
                    value={editedData.lang?.join(", ") || ""}
                    onChange={(e) =>
                      handleInputChange(
                        "lang",
                        e.target.value.split(",").map((item) => item.trim())
                      )
                    }
                    className="mt-1"
                    placeholder="Enter languages (comma-separated)"
                  />
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <Label>Resume</Label>
                  <div className="mt-1">
                    <FileUpload
                      uploadType="pdfUploader"
                      label="Resume"
                      accept=".pdf,.doc,.docx"
                      onUploadComplete={async (url) => {
                        try {
                          const response = await fetch(
                            `/api/users/profile/${userData._id}`,
                            {
                              method: "PUT",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({ resume: url }),
                            }
                          );

                          if (!response.ok) {
                            throw new Error(
                              "Failed to update profile with resume"
                            );
                          }

                          const { user: updatedUser } = await response.json();
                          setUserData(updatedUser);
                          setEditedData(updatedUser);
                          toast.success("Resume uploaded and profile updated!");
                        } catch (error) {
                          console.error(
                            "Error updating profile with resume:",
                            error
                          );
                          toast.error("Failed to update profile with resume");
                        }
                      }}
                      currentFile={userData.resume}
                    />
                  </div>
                </div>

                <div>
                  <Label>NDA Document</Label>
                  <div className="mt-1">
                    <FileUpload
                      uploadType="pdfUploader"
                      label="NDA"
                      accept=".pdf"
                      onUploadComplete={async (url) => {
                        try {
                          const response = await fetch(
                            `/api/users/profile/${userData._id}`,
                            {
                              method: "PUT",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({ nda: url }),
                            }
                          );

                          if (!response.ok) {
                            throw new Error(
                              "Failed to update profile with NDA"
                            );
                          }

                          const { user: updatedUser } = await response.json();
                          setUserData(updatedUser);
                          setEditedData(updatedUser);
                          toast.success("NDA uploaded and profile updated!");
                        } catch (error) {
                          console.error(
                            "Error updating profile with NDA:",
                            error
                          );
                          toast.error("Failed to update profile with NDA");
                        }
                      }}
                      currentFile={userData.nda}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Role & Permissions Card - Now Read Only */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Role & Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Role</Label>
                  <div className="mt-1">
                    <Badge variant="outline" className="text-base capitalize">
                      {userData.role}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Permissions</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {userData.permission?.map((perm, index) => (
                      <Badge key={index} variant="secondary">
                        {perm}
                      </Badge>
                    )) || (
                      <span className="text-gray-500">
                        No permissions assigned
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Account Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Last Login</Label>
                  <p className="mt-1 text-gray-700">
                    {format(new Date(userData.lastLogin), "PPP")}
                  </p>
                </div>
                <div>
                  <Label>Account Created</Label>
                  <p className="mt-1 text-gray-700">
                    {format(new Date(userData.created_at), "PPP")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
