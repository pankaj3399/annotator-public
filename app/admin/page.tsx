"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { PlusCircle, Save, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Loader from "@/components/ui/Loader/Loader";

interface CustomField {
  _id?: string;
  name: string;
  label: string;
  type: "text" | "link" | "file" | "array";
  isRequired: boolean;
  acceptedFileTypes: string | null;
  isActive: boolean;
}

const CustomFieldsPage = () => {
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    const fetchCustomFields = async () => {
      try {
        const response = await fetch("/api/admin/custom-fields");
        if (!response.ok) throw new Error("Failed to fetch custom fields");
        const data = await response.json();
        setCustomFields(data);
      } catch (error) {
        console.error("Error fetching custom fields:", error);
        toast.error("Failed to load custom fields");
      } finally {
        setLoading(false);
      }
    };

    if (status === "loading") return;
    if (!session || session.user.role !== "system admin") {
      router.push("/");
      return;
    }

    fetchCustomFields();
  }, [session, status, router]);

  const handleAddField = () => {
    setCustomFields([
      ...customFields,
      {
        name: "",
        label: "",
        type: "text",
        isRequired: false,
        acceptedFileTypes: null,
        isActive: true,
      },
    ]);
  };

  const handleRemoveField = (index: number) => {
    const updatedFields = [...customFields];
    updatedFields.splice(index, 1);
    setCustomFields(updatedFields);
  };

  const handleFieldChange = (
    index: number,
    field: keyof CustomField,
    value: any
  ) => {
    const updatedFields = [...customFields];
    updatedFields[index] = { ...updatedFields[index], [field]: value };
    setCustomFields(updatedFields);
  };

  const validateFields = () => {
    for (const field of customFields) {
      if (!field.name || !field.label) {
        toast.error("All fields must have a name and label");
        return false;
      }
      if (field.type === "file" && !field.acceptedFileTypes) {
        toast.error("File fields must have accepted file types specified");
        return false;
      }
      // Ensure field names are unique
      const nameCount = customFields.filter((f) => f.name === field.name).length;
      if (nameCount > 1) {
        toast.error(`Duplicate field name found: ${field.name}`);
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateFields()) return;

    try {
      const response = await fetch("/api/admin/custom-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: customFields }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save custom fields");
      }

      const savedFields = await response.json();
      setCustomFields(savedFields);
      toast.success("Custom fields saved successfully!");
    } catch (error) {
      console.error("Error saving custom fields:", error);
      toast.error(`Failed to save custom fields: ${(error as Error).message}`);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Custom Fields</h1>
          <div className="flex gap-4">
            <Button
              onClick={handleAddField}
              variant="outline"
              className="flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Add Field
            </Button>
            <Button onClick={handleSave} className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              Save All
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {customFields.map((field, index) => (
            <Card key={field._id || index}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Field #{index + 1}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveField(index)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Field Name (Internal)</Label>
                    <Input
                      value={field.name}
                      onChange={(e) =>
                        handleFieldChange(index, "name", e.target.value)
                      }
                      className="mt-1"
                      placeholder="e.g., githubProfile"
                    />
                  </div>

                  <div>
                    <Label>Display Label</Label>
                    <Input
                      value={field.label}
                      onChange={(e) =>
                        handleFieldChange(index, "label", e.target.value)
                      }
                      className="mt-1"
                      placeholder="e.g., GitHub Profile"
                    />
                  </div>

                  <div>
                    <Label>Field Type</Label>
                    <Select
                      value={field.type}
                      onValueChange={(value: any) =>
                        handleFieldChange(index, "type", value)
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="link">Link</SelectItem>
                        <SelectItem value="file">File Upload</SelectItem>
                        <SelectItem value="array">Array (comma-separated)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {field.type === "file" && (
                    <div>
                      <Label>Accepted File Types</Label>
                      <Input
                        value={field.acceptedFileTypes || ""}
                        onChange={(e) =>
                          handleFieldChange(
                            index,
                            "acceptedFileTypes",
                            e.target.value
                          )
                        }
                        className="mt-1"
                        placeholder=".pdf,.doc,.docx"
                      />
                    </div>
                  )}

                  {/* <div className="flex items-center space-x-2">
                    <Switch
                      checked={field.isRequired}
                      onCheckedChange={(checked) =>
                        handleFieldChange(index, "isRequired", checked)
                      }
                    />
                    <Label>Required Field</Label>
                  </div> */}

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={field.isActive}
                      onCheckedChange={(checked) =>
                        handleFieldChange(index, "isActive", checked)
                      }
                    />
                    <Label>Active</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CustomFieldsPage;