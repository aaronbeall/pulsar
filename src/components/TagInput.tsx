import React from "react";
import { HStack, Tag, TagLabel, TagCloseButton, Input } from "@chakra-ui/react";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

const TagInput: React.FC<TagInputProps> = ({ tags, onChange, placeholder }) => {
  const [input, setInput] = React.useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      const newTag = input.trim();
      if (newTag && !tags.includes(newTag)) {
        onChange([...tags, newTag]);
      }
      setInput("");
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      // Remove last tag on backspace if input is empty
      onChange(tags.slice(0, -1));
    }
  };

  const handleRemove = (tag: string) => {
    onChange(tags.filter(t => t !== tag));
  };

  return (
    <HStack spacing={2} flexWrap="wrap" alignItems="flex-start">
      {tags.map(tag => (
        <Tag key={tag} colorScheme="cyan" borderRadius="md">
          <TagLabel>{tag}</TagLabel>
          <TagCloseButton onClick={() => handleRemove(tag)} />
        </Tag>
      ))}
      <Input
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleInputKeyDown}
        placeholder={placeholder || "Add tag"}
        size="sm"
        width="auto"
        minW="120px"
        border="none"
        _focus={{ boxShadow: "none", border: "none" }}
        variant="unstyled"
      />
    </HStack>
  );
};

export default TagInput;
