import React from "react";
import _ from "lodash";
import { useState } from "react";

const inputValue = (e: any): string => e.target.value;

function isEnterOrEscapeKeyEvent(event: React.KeyboardEvent<HTMLInputElement>) {
  return event.key === "Enter" || event.key === "Escape";
}

const EditableText = ({ initialText, updateMethod }) => {
  const [isEditing, setisEditing] = useState(false);
  const [text, settext] = useState(initialText);

  const onEditEnd = () => {
    // Validate characters before calling updateMethod
    if (/[^a-zA-Z0-9-_ ]/.test(text)) {
      // Reset text to original and stay in edit mode
      settext(initialText);
      console.warn("Invalid characters in tab name:", text);
      return; // Don't exit edit mode, don't call updateMethod
    }
    
    setisEditing(false);
    updateMethod(initialText, text);
  };

  return isEditing ? (
    <input
      value={text}
      className="bg-transparent border-none"
      maxLength={22}
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
      autoFocus
    />
  ) : (
    <div 
      className="select-none" 
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
