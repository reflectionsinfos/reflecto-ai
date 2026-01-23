"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X, User as UserIcon, Users as UsersIcon, Loader2 } from "lucide-react";
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

interface RecipientSelectorProps {
  type: "individual" | "team";
  onTypeChange: (type: "individual" | "team") => void;
  selectedRecipients: GraphUser[];
  onRecipientsChange: (recipients: GraphUser[]) => void;
  className?: string;
  error?: string;
}

export function RecipientSelector({
  type,
  onTypeChange,
  selectedRecipients,
  onRecipientsChange,
  className,
  error
}: RecipientSelectorProps) {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<GraphUser[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Debounced search
  React.useEffect(() => {
    if (!isAuthenticated) return;
    
    const timer = setTimeout(async () => {
      if (query.trim().length >= 3) {
        setLoading(true);
        const results = await searchUsers(query);
        setSearchResults(results);
        setLoading(false);
      } else {
        setSearchResults([]);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query, isAuthenticated]);

  const handleAddManual = () => {
      const manualUser: GraphUser = {
          id: `manual-${Date.now()}`,
          displayName: query,
          mail: "",
          userPrincipalName: ""
      };
      if (type === "individual") {
          onRecipientsChange([manualUser]);
          setOpen(false);
      } else {
          onRecipientsChange([...selectedRecipients, manualUser]);
          setQuery("");
      }
      setSearchResults([]);
  };

  const handleSelect = (user: GraphUser) => {
    if (type === "individual") {
      onRecipientsChange([user]);
      setOpen(false);
    } else {
      // Team mode: Add if not exists
      if (!selectedRecipients.find((u) => u.id === user.id)) {
        onRecipientsChange([...selectedRecipients, user]);
      }
      // Keep open for multiple selection?
      setQuery(""); 
    }
  };

  const handleRemove = (userId: string) => {
    onRecipientsChange(selectedRecipients.filter((u) => u.id !== userId));
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <Label>Recipient Type</Label>
        <RadioGroup
          defaultValue={type}
          onValueChange={(val) => onTypeChange(val as "individual" | "team")}
          className="flex space-x-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="individual" id="r-individual" />
            <Label htmlFor="r-individual" className="flex items-center gap-1 cursor-pointer">
              <UserIcon className="w-4 h-4" /> Individual
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="team" id="r-team" />
            <Label htmlFor="r-team" className="flex items-center gap-1 cursor-pointer">
              <UsersIcon className="w-4 h-4" /> Team
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label>
          {type === "individual" ? "Select Recipient *" : "Select Team Members *"}
        </Label>
        
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                "w-full justify-between bg-input border-border min-h-[40px] h-auto",
                error && "border-destructive focus-visible:ring-destructive"
              )}
            >
              {selectedRecipients.length > 0 ? (
                 type === "individual" ? (
                   selectedRecipients[0].displayName
                 ) : (
                   <span className="text-muted-foreground">{selectedRecipients.length} members selected</span>
                 )
              ) : (
                <span className="text-muted-foreground">Search by name or email...</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command shouldFilter={false}> 
              {/* disable local filtering since we do async search */}
              <CommandInput 
                placeholder="Type at least 3 chars..." 
                value={query}
                onValueChange={setQuery}
              />
              <CommandList>
                {loading && (
                    <div className="py-6 text-center text-sm text-muted-foreground flex justify-center items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Searching Azure AD...
                    </div>
                )}
                {!loading && query.length < 3 && (
                   <div className="py-6 text-center text-sm text-muted-foreground">
                     Type to search...
                   </div>
                )}
                {!loading && query.length >= 3 && searchResults.length === 0 && (
                   <div className="p-2">
                       <p className="text-sm text-center text-muted-foreground py-2">No user found.</p>
                       <Button 
                           variant="secondary" 
                           onClick={handleAddManual}
                           className="w-full text-xs"
                        >
                           + Add "{query}" manually
                       </Button>
                   </div>
                )}
                {!loading && searchResults.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.id} 
                    onSelect={() => handleSelect(user)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedRecipients.some(u => u.id === user.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                        <span className="font-medium">{user.displayName}</span>
                        <span className="text-xs text-muted-foreground">{user.mail || user.userPrincipalName}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        
        {/* Team Chips Display */}
        {type === "team" && selectedRecipients.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedRecipients.map((user) => (
              <Badge key={user.id} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                {user.displayName}
                <button 
                  onClick={() => handleRemove(user.id)}
                  className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        {type === "team" && (
            <p className="text-xs text-muted-foreground">
                Search and add multiple team members.
            </p>
        )}
      </div>
    </div>
  );
}
