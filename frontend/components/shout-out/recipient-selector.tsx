"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X, User as UserIcon, Users as UsersIcon, Loader2, Building, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { searchUsers, GraphUser } from "@/lib/graph-service";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";

interface RecipientSelectorProps {
  type: "department" | "project";
  onTypeChange: (type: "department" | "project") => void;
  entityName: string;
  onEntityNameChange: (name: string) => void;
  className?: string;
  error?: string;
}

export function ShoutOutRecipientSelector({
  type,
  onTypeChange,
  entityName,
  onEntityNameChange,
  className,
  error
}: RecipientSelectorProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <Label>Audience Type</Label>
        <RadioGroup
          defaultValue={type}
          onValueChange={(val) => onTypeChange(val as "department" | "project")}
          className="flex space-x-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="department" id="r-dept" />
            <Label htmlFor="r-dept" className="flex items-center gap-1 cursor-pointer">
              <Building2 className="w-4 h-4" /> Department / Org
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="project" id="r-proj" />
            <Label htmlFor="r-proj" className="flex items-center gap-1 cursor-pointer">
              <Building className="w-4 h-4" /> Project Team
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="entityName">
          {type === "department" ? "Department Name *" : "Project Name *"}
        </Label>
        <Input 
            id="entityName"
            placeholder={type === "department" ? "e.g. Engineering, Sales, HR" : "e.g. Project Apollo, Q3 Migration"}
            value={entityName}
            onChange={(e) => onEntityNameChange(e.target.value)}
            className={cn("bg-input", error && "border-destructive")}
        />
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        <p className="text-xs text-muted-foreground">
            This name will appear prominently on the banner.
        </p>
      </div>
    </div>
  );
}
