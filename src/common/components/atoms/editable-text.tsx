import React from "react";
import _ from "lodash";
import { useState, useEffect } from "react";
import { validateTabName } from "@/common/utils/tabUtils";

const inputValue = (e: any): string => e.target.value;

function isEnterOrEscapeKeyEvent(event: React.KeyboardEvent<HTMLInputElement>) {
  return event.key === "Enter" || event.key === "Escape";
}

interface EditableTextProps {
  initialText: string;
  updateMethod: (oldText: string, newText: string) => void;
  validateInput?: (text: string) => string | null; // Returns error message or null
  maxLength?: number;
}

const EditableText = ({ 
  initialText, 
  updateMethod,
  validateInput,
  maxLength = 22,
}: EditableTextProps) => {
  const [isEditing, setisEditing] = useState(false);
  const [text, settext] = useState(initialText);

  // Sync text state when initialText changes (when not editing)
  useEffect(() => {
    if (!isEditing) {
      settext(initialText);
    }
  }, [initialText, isEditing]);

  const onEditEnd = () => {
    const trimmedText = text.trim();
    
    // Use provided validation function, or fall back to default tab name validation
    const validationError = validateInput 
      ? validateInput(trimmedText)
      : validateTabName(trimmedText);
    
    if (validationError) {
      // Reset text to original and stay in edit mode
      settext(initialText);
      console.warn("Invalid input:", validationError);
      return; // Don't exit edit mode, don't call updateMethod
    }
    
    setisEditing(false);
    updateMethod(initialText, trimmedText);
  };

  return isEditing ? (
    <input
      value={text}
      className="bg-transparent border-none outline-none text-center"
      style={{ width: `${Math.max(text.length, 1)}ch` }}
      maxLength={maxLength}
      onKeyDown={(event) => {
        if (isEnterOrEscapeKeyEvent(event)) {
          event.preventDefault();
          event.stopPropagation();
          onEditEnd();
        }
      }}
      onChange={_.flow(inputValue, settext)}
      onBlur={onEditEnd}
      onClick={(e) => {
        // Prevent navigation when clicking on input
        e.stopPropagation();
      }}
      onDoubleClick={(e) => {
        // Stop propagation to prevent navigation, but don't preventDefault
        // so that the browser's native text selection on double-click works
        e.stopPropagation();
      }}
      autoFocus
    />
  ) : (
    <div 
      className="select-none min-w-0" 
      onDoubleClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setisEditing(true);
      }}
    >
      {text}
    </div>
  );
};

export default EditableText;
