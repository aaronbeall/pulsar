import { Flex, Input, IconButton } from '@chakra-ui/react';
import { FaCheck, FaTimes } from 'react-icons/fa';
import React, { useRef, useEffect } from 'react';

// Inline editor for routine kind badge (now DayKindEditor)
export const DayKindEditor: React.FC<{
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}> = ({ value, onChange, onSave, onCancel }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  // Track if a button was clicked to prevent onBlur from firing cancel
  const buttonClicked = useRef(false);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const handleBlur = () => {
    // Only call onCancel if a button wasn't just clicked
    if (!buttonClicked.current) onCancel();
    buttonClicked.current = false;
  };
  return (
    <Flex align="center" ml={2} gap={1} w="100%">
      <Input
        size="xs"
        value={value}
        ref={inputRef}
        flex={1}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') onSave();
          else if (e.key === 'Escape') onCancel();
        }}
        onBlur={handleBlur}
      />
      <IconButton
        aria-label="Save kind"
        icon={<FaCheck />}
        size="xs"
        colorScheme="green"
        onMouseDown={() => { buttonClicked.current = true; }}
        onClick={onSave}
      />
      <IconButton
        aria-label="Cancel kind edit"
        icon={<FaTimes />}
        size="xs"
        colorScheme="gray"
        onMouseDown={() => { buttonClicked.current = true; }}
        onClick={onCancel}
      />
    </Flex>
  );
};

export default DayKindEditor;
