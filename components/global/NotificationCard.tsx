import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NotificationTemplate {
  _id: string;
  triggerName: string;
  triggerBody: string;
  project: string;
  active: boolean;
}

interface NotificationCardProps {
  template: NotificationTemplate;
  onUpdate: (
    _id: string,
    field: keyof NotificationTemplate,
    value: any
  ) => void;
  onSave: (_id: string) => void;
  onDelete: (_id: string) => void;
  availableTriggers: string[];
}

const NotificationCard: React.FC<NotificationCardProps> = ({
  template,
  onUpdate,
  onSave,
  onDelete,
  availableTriggers,
}) => {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Notification Template</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Trigger Name</label>
          <Select
            value={template.triggerName}
            onValueChange={(value) =>
              onUpdate(template._id, "triggerName", value)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a trigger" />
            </SelectTrigger>
            <SelectContent>
              {availableTriggers.map((trigger) => (
                <SelectItem key={trigger} value={trigger}>
                  {trigger}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Trigger Body</label>
          <Input
            value={template.triggerBody}
            onChange={(e) =>
              onUpdate(template._id, "triggerBody", e.target.value)
            }
          />
        </div>
        <div className="flex items-center space-x-3">
          <Switch
            checked={template.active}
            onCheckedChange={(checked) =>
              onUpdate(template._id, "active", checked)
            }
          />
          <span>{template.active ? "Active" : "Inactive"}</span>
        </div>
        <div className="pt-4 flex space-x-2">
          <Button variant="outline" onClick={() => onSave(template._id)}>
            Save Changes
          </Button>
          <Button variant="outline" color="red" onClick={() => onDelete(template._id)}>
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationCard;
