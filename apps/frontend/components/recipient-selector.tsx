"use client";

import * as React from "react";
import { X, User as UserIcon, Users as UsersIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  error,
}: RecipientSelectorProps) {
  const { isAuthenticated } = useAuth();
  const [inputValue, setInputValue] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<GraphUser[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  // Ref so async paste handlers always see latest recipients
  const recipientsRef = React.useRef(selectedRecipients);
  recipientsRef.current = selectedRecipients;

  // Debounced search
  React.useEffect(() => {
    if (!isAuthenticated) return;
    const q = inputValue.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      const results = await searchUsers(q);
      setSuggestions(results);
      setLoading(false);
      setActiveIndex(-1);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue, isAuthenticated]);

  // Close dropdown on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const makeManualUser = (token: string): GraphUser => {
    const t = token.trim();
    // Handle "Name <email@co.com>" format pasted from Outlook/email clients
    const angleMatch = t.match(/^(.+?)\s*<([^>]+)>$/);
    if (angleMatch) {
      return {
        id: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        displayName: angleMatch[1].trim(),
        mail: angleMatch[2].trim(),
        userPrincipalName: angleMatch[2].trim(),
      };
    }
    const isEmail = t.includes("@");
    return {
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      displayName: isEmail ? t.split("@")[0] : t,
      mail: isEmail ? t : "",
      userPrincipalName: isEmail ? t : "",
    };
  };

  const addUser = React.useCallback((user: GraphUser) => {
    if (type === "individual") {
      onRecipientsChange([user]);
    } else {
      const current = recipientsRef.current;
      if (!current.find(u => u.id === user.id)) {
        onRecipientsChange([...current, user]);
      }
    }
    setInputValue("");
    setSuggestions([]);
    setActiveIndex(-1);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [type, onRecipientsChange]);

  const commitCurrent = React.useCallback(() => {
    const q = inputValue.trim();
    if (!q) return;
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      addUser(suggestions[activeIndex]);
    } else if (suggestions.length === 1) {
      addUser(suggestions[0]);
    } else {
      const manual = makeManualUser(q);
      const current = recipientsRef.current;
      if (type === "individual") {
        onRecipientsChange([manual]);
      } else {
        onRecipientsChange([...current, manual]);
      }
      setInputValue("");
      setSuggestions([]);
    }
  }, [inputValue, activeIndex, suggestions, addUser, type, onRecipientsChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === ";") {
      if (inputValue.trim()) {
        e.preventDefault();
        commitCurrent();
      }
    } else if (e.key === "Backspace" && !inputValue && selectedRecipients.length > 0) {
      const last = selectedRecipients[selectedRecipients.length - 1];
      onRecipientsChange(selectedRecipients.filter(u => u.id !== last.id));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === "Escape") {
      setSuggestions([]);
      setActiveIndex(-1);
      setIsFocused(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    // Only intercept if it looks like multiple values
    if (!/[,;\n\t]/.test(text)) return;

    e.preventDefault();

    const tokens = text
      .split(/[,;\n\t]+/)
      .map(t => t.trim())
      .filter(Boolean);

    if (tokens.length === 0) return;

    if (type === "individual") {
      const results = await searchUsers(tokens[0]);
      const user = results.length > 0 ? results[0] : makeManualUser(tokens[0]);
      onRecipientsChange([user]);
      setInputValue("");
      return;
    }

    // Team: resolve all tokens in parallel
    const resolved = await Promise.all(
      tokens.map(async (token) => {
        const results = await searchUsers(token);
        return results.length > 0 ? results[0] : makeManualUser(token);
      })
    );

    const current = recipientsRef.current;
    const newOnes = resolved.filter(r => !current.find(e => e.id === r.id || (e.mail && e.mail === r.mail)));
    onRecipientsChange([...current, ...newOnes]);
    setInputValue("");
  };

  const canAddMore = type === "team" || selectedRecipients.length === 0;
  const q = inputValue.trim();
  const showDropdown = isFocused && canAddMore && q.length >= 2;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Recipient Type */}
      <div className="space-y-2">
        <Label>Recipient Type</Label>
        <RadioGroup
          defaultValue={type}
          onValueChange={(val) => {
            onTypeChange(val as "individual" | "team");
            onRecipientsChange([]);
            setInputValue("");
          }}
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

      {/* Outlook-style token input */}
      <div className="space-y-1.5">
        <Label>
          {type === "individual" ? "Select Recipient *" : "Select Team Members *"}
        </Label>

        <div ref={containerRef} className="relative">
          {/* Token field */}
          <div
            className={cn(
              "min-h-[40px] w-full rounded-md border bg-input px-3 py-2 text-sm flex flex-wrap gap-1.5 items-center cursor-text transition-colors",
              isFocused ? "ring-2 ring-ring border-ring" : "border-border",
              error && "border-destructive ring-destructive"
            )}
            onClick={() => {
              inputRef.current?.focus();
              setIsFocused(true);
            }}
          >
            {/* Chips */}
            {selectedRecipients.map((user) => (
              <span
                key={user.id}
                className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded px-2 py-0.5 text-xs font-medium shrink-0"
              >
                {user.displayName}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRecipientsChange(selectedRecipients.filter(u => u.id !== user.id));
                  }}
                  className="hover:text-destructive transition-colors ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {/* Text input */}
            {canAddMore && (
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setIsFocused(true);
                }}
                onFocus={() => setIsFocused(true)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={
                  selectedRecipients.length === 0
                    ? type === "individual"
                      ? "Type a name or email..."
                      : "Type names or paste a list..."
                    : ""
                }
                className="flex-1 min-w-[140px] bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              />
            )}

            {loading && (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground ml-auto shrink-0" />
            )}
          </div>

          {/* Suggestions dropdown */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border border-border rounded-md shadow-lg overflow-hidden max-h-56 overflow-y-auto">
              {loading && (
                <div className="px-3 py-4 text-sm text-center text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Searching directory...
                </div>
              )}
              {!loading && suggestions.length === 0 && (
                <div className="px-3 py-2">
                  <p className="text-xs text-muted-foreground text-center py-1">No results found in directory.</p>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      commitCurrent();
                    }}
                    className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent"
                  >
                    Add <span className="font-medium">"{inputValue.trim()}"</span> manually
                  </button>
                </div>
              )}
              {!loading && suggestions.map((user, i) => (
                <button
                  key={user.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addUser(user);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 text-sm flex flex-col hover:bg-accent transition-colors",
                    i === activeIndex && "bg-accent"
                  )}
                >
                  <span className="font-medium">{user.displayName}</span>
                  <span className="text-xs text-muted-foreground">{user.mail || user.userPrincipalName}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}
        {type === "team" && (
          <p className="text-xs text-muted-foreground">
            Type a name or paste multiple names separated by commas — each resolves automatically.
          </p>
        )}
      </div>
    </div>
  );
}
