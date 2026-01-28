"use client";

import React, { forwardRef, useCallback, useState } from "react";
import { FaPlus, FaImage, FaLink } from "react-icons/fa";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/common/components/atoms/avatar";
import styled from "styled-components";
import { FaPencil } from "react-icons/fa6";
import CSSInput from "@/common/components/molecules/CSSInput";
import { Link } from "@/fidgets/ui/Links";

export interface LinksInputProps {
  value: Link[];
  onChange?: (value: Link[]) => void;
}

const Box = styled.div`
  width: 100%;
`;

const TextFieldRoot = styled.div<{ isActive: boolean }>`
  display: flex;
  align-items: center;
  position: relative;
  background: white;
  border: ${({ isActive }) =>
    isActive ? "2px solid lightblue" : "1px solid lightgray"};
  padding: 5px;
  border-radius: 4px;
  width: 100%;
`;

const TextFieldSlot = styled.div`
  display: flex;
  align-items: center;
`;

const TextFieldInput = styled.input`
  border: none;
  outline: none;
  flex: 1;
  padding: 0 5px;
`;

const LinkContainer = styled.div`
  margin-bottom: 1em;
`;

const Title = styled.p`
  font-size: 0.875rem;
  color: black;
  font-weight: bold;
`;

const SubTitle = styled.p`
  font-size: 0.875rem;
  color: gray;
`;

const AddLinkButton = styled.button`
  display: flex;
  align-items: center;
  margin-top: 10px;
  background: none;
  border: none;
  color: #007bff;
  cursor: pointer;
  font-size: 1rem;

  &:hover {
    text-decoration: underline;
  }
`;

const LinksInput = forwardRef<HTMLInputElement, LinksInputProps>(
  (props, ref) => {
    const { value = [], onChange } = props;

    // Initialize visibleFields state
    const [visibleFields, setVisibleFields] = useState(
      Array.isArray(value) ? value.map(() => false) : [],
    );

    // Handle link changes
    const handleLinkChange = useCallback(
      (index: number, newLink: Link) => {
        if (!Array.isArray(value)) return; // Ensure value is an array
        const updatedLinks = [...value];
        updatedLinks[index] = newLink;
        onChange?.(updatedLinks);
      },
      [value, onChange],
    );

    // Add a new link
    const addNewLink = () => {
      const newLink = {
        text: "New Link",
        url: "https://",
        avatar: "https://www.nounspace.com/ui/chainEmoji.png",
        description: "Description",
      };

      onChange?.([...value, newLink]);
      setVisibleFields([...visibleFields, true]);
    };

    // Remove a link
    const removeLink = (index: number) => {
      if (!Array.isArray(value)) return; // Ensure value is an array
      const updatedLinks = [...value];
      updatedLinks.splice(index, 1);
      onChange?.(updatedLinks);

      const updatedVisibleFields = [...visibleFields];
      updatedVisibleFields.splice(index, 1);
      setVisibleFields(updatedVisibleFields);
    };

    // Show additional fields for a link
    const showAdditionalFields = (index: number) => {
      const updatedVisibleFields = [...visibleFields];
      updatedVisibleFields[index] = true;
      setVisibleFields(updatedVisibleFields);
    };

    // Render LinksInput component
    return (
      <Box>
        {Array.isArray(value) &&
          value.map((link, index) => (
            <LinkContainer key={index}>
              <Title>{link.text || `Link ${index + 1}`}</Title>
              <SubTitle>URL {index + 1}</SubTitle>
              <TextFieldRoot isActive={visibleFields[index]}>
                <TextFieldSlot>
                  <FaLink color="lightgray" size={14} />
                </TextFieldSlot>
                <TextFieldInput
                  placeholder="Link URL"
                  value={link.url}
                  onChange={(e: any) => {
                    handleLinkChange(index, { ...link, url: e.target.value });
                    showAdditionalFields(index);
                  }}
                  onFocus={() => showAdditionalFields(index)}
                />
                <TextFieldSlot>
                  <p
                    style={{
                      color: "lightgray",
                      cursor: "pointer",
                      marginRight: "2px",
                    }}
                    onClick={() => removeLink(index)}
                  >
                    x
                  </p>
                </TextFieldSlot>
              </TextFieldRoot>
              {visibleFields[index] && (
                <>
                  <SubTitle>Title</SubTitle>
                  <TextFieldRoot isActive={true}>
                    <TextFieldSlot>
                      <FaPencil color="lightgray" size={14} />
                    </TextFieldSlot>
                    <TextFieldInput
                      placeholder="Link text"
                      value={link.text}
                      onChange={(e: any) =>
                        handleLinkChange(index, {
                          ...link,
                          text: e.target.value,
                        })
                      }
                      onFocus={() => showAdditionalFields(index)}
                    />
                  </TextFieldRoot>
                  <SubTitle>Avatar</SubTitle>
                  <TextFieldRoot isActive={true}>
                    <TextFieldSlot>
                      {link.avatar ? (
                        <Avatar style={{ width: "24px", height: "24px" }}>
                          <AvatarImage src={link.avatar} alt={"choose image"} />
                          <AvatarFallback>
                            <span className="sr-only">{link.text}</span>
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <FaImage color="lightgray" size={14} />
                      )}
                    </TextFieldSlot>
                    <TextFieldInput
                      placeholder="Avatar URL"
                      value={link.avatar}
                      onChange={(e: any) =>
                        handleLinkChange(index, {
                          ...link,
                          avatar: e.target.value,
                        })
                      }
                      onFocus={() => showAdditionalFields(index)}
                    />
                  </TextFieldRoot>
                  <SubTitle>Description</SubTitle>
                  <CSSInput
                    value={link.description || ""}
                    onFocus={() => showAdditionalFields(index)}
                    onChange={(description) =>
                      handleLinkChange(index, { ...link, description })
                    }
                  />
                </>
              )}
            </LinkContainer>
          ))}
        <AddLinkButton type="button" onClick={addNewLink}>
          <FaPlus style={{ marginRight: "5px" }} /> Add link
        </AddLinkButton>
      </Box>
    );
  },
);

LinksInput.displayName = "LinksInput";

export default LinksInput;
