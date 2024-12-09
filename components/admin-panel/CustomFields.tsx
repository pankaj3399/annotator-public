"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/FileUpload";

interface CustomField {
  _id: string;
  name: string;
  label: string;
  type: "text" | "link" | "file" | "array";
  isRequired: boolean;
  acceptedFileTypes: string | null;
  isActive: boolean;
}

interface CustomFieldsProps {
  fields: CustomField[];
  values: { [key: string]: any };
  onChange: (name: string, value: any) => void;
  onFileUpload: (name: string, url: string) => Promise<void>;
  userId: string;
}

const CustomFields: React.FC<CustomFieldsProps> = ({
  fields,
  values = {},
  onChange,
  onFileUpload,
  userId,
}) => {
  const activeFields = fields.filter((field) => field.isActive);

  const handleInputChange = (field: CustomField, value: string) => {
    console.log('Field change:', field.name, value); // Debug log
    
    // Use any type for processedValue since it can be string or string[]
    let processedValue: string | string[];
    
    if (field.type === "array") {
      processedValue = value.split(",").map((item) => item.trim());
    } else {
      processedValue = value;
    }
    
    // Call onChange with the processed value
    onChange(field.name, processedValue);
  };

  return (
    <div className="space-y-4">
      {activeFields.map((field) => {
        // Get current value for the field
        const currentValue = field.type === "array" 
          ? (Array.isArray(values[field.name]) ? values[field.name].join(", ") : "")
          : (values[field.name] || "");

        return (
          <div key={field._id} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            
            {field.type === "file" ? (
              <FileUpload
                uploadType="pdfUploader"
                label={field.label}
                accept={field.acceptedFileTypes || ""}
                onUploadComplete={(url) => onFileUpload(field.name, url)}
                currentFile={values[field.name]}
              />
            ) : (
              <Input
                id={field.name}
                name={field.name}
                value={currentValue}
                onChange={(e) => handleInputChange(field, e.target.value)}
                type={field.type === "link" ? "url" : "text"}
                placeholder={`Enter ${field.label.toLowerCase()}`}
                className="w-full"
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CustomFields;