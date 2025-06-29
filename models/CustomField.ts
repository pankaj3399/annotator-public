import mongoose, { Schema, model, models } from "mongoose";

const customFieldSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        "text",
        "link",
        "file",
        "array",
        "select",
        "multiselect",
        "date",
        "number",
        "boolean",
        "email",
        "phone"
      ],
      required: true,
    },
    isRequired: {
      type: Boolean,
      default: false,
    },
    acceptedFileTypes: {
      type: String,
      default: null, // For file type fields, e.g., ".pdf,.doc,.docx"
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    teams: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
    }],
    forAllTeams: {
      type: Boolean,
      default: false,
    },
    // New fields for enhanced functionality
    options: [{
      type: String,
    }], // For select/multiselect fields
    placeholder: {
      type: String,
      default: null,
    },
    validation: {
      min: {
        type: Number,
        default: null,
      },
      max: {
        type: Number,
        default: null,
      },
      pattern: {
        type: String,
        default: null,
      },
      dateFormat: {
        type: String,
        enum: ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"],
        default: "MM/DD/YYYY",
      },
    },
    referenceTab: {
      type: String,
      default: null, // For fields that reference external data sources
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

export const CustomField = models?.CustomField || model("CustomField", customFieldSchema);