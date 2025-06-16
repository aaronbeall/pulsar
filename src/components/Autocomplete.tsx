import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { Box, Input, List, ListItem, ListIcon, Flex, IconButton, useOutsideClick } from '@chakra-ui/react';
import { FaPlus, FaCheck } from 'react-icons/fa';

interface AutocompleteProps<T> {
  items: T[];
  getItemLabel: (item: T) => string;
  getKey: (item: T, idx: number) => string | number;
  onSelect: (item: T) => void;
  onCreate: (input: string) => void;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  renderItemLabel?: (item: T, isHighlighted: boolean) => ReactNode;
  renderCreateLabel?: (input: string) => ReactNode;
  filterItems?: (items: T[], inputValue: string) => T[];
  isLoading?: boolean;
  maxSuggestions?: number; // NEW: limit number of suggestions
}

export function Autocomplete<T>({
  items,
  getItemLabel,
  getKey,
  onSelect,
  onCreate,
  placeholder = '',
  value = '',
  onChange,
  renderItemLabel = (item, _isHighlighted) => (<><ListIcon as={FaCheck} color="green.400" />{getItemLabel(item)}</>),
  renderCreateLabel = (input) => `Create "${input}"`,
  filterItems = (items, inputValue) =>
    inputValue
      ? items.filter(item => getItemLabel(item).trim().toLowerCase().includes(inputValue.trim().toLowerCase()))
      : items,
  isLoading = false,
  maxSuggestions = 10,
}: AutocompleteProps<T>) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useOutsideClick({ ref: containerRef, handler: () => setIsOpen(false) });

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const filtered = filterItems(items, inputValue);
  const limited = filtered.slice(0, maxSuggestions); // NEW: limit suggestions
  const exactMatch = limited.find(item => getItemLabel(item).toLowerCase() === inputValue.toLowerCase());
  const showCreate = inputValue && !exactMatch;
  const suggestions = limited;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    onChange?.(e.target.value);
    setIsOpen(true);
    setHighlightedIdx(0);
  };

  const handleSelect = (item: T) => {
    setIsOpen(false);
    setInputValue(typeof item === 'string' ? item : getItemLabel(item));
    onSelect(item);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      e.preventDefault();
      return;
    }
    if (e.key === 'ArrowDown') {
      setHighlightedIdx(idx => Math.min(idx + 1, suggestions.length - 1));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setHighlightedIdx(idx => Math.max(idx - 1, 0));
      e.preventDefault();
    } else if (e.key === 'Enter') {
      if (isOpen && suggestions.length > 0) {
        const sel = suggestions[highlightedIdx];
        if (sel !== null && sel !== undefined) {
          handleSelect(sel);
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <Box ref={containerRef} position="relative" w="100%">
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        size="sm"
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls="autocomplete-list"
        aria-activedescendant={isOpen && suggestions[highlightedIdx] ? `autocomplete-item-${highlightedIdx}` : undefined}
      />
      {isOpen && (suggestions.length > 0 || showCreate) && (
        <List
          ref={listRef}
          id="autocomplete-list"
          position="absolute"
          zIndex={10}
          bg="white"
          _dark={{ bg: 'gray.800' }}
          borderWidth="1px"
          borderRadius="md"
          boxShadow="md"
          mt={1}
          w="100%"
          maxH="220px"
          overflowY="auto"
        >
          {suggestions.map((item, idx) => (
            <ListItem
              key={getKey(item, idx)}
              id={`autocomplete-item-${idx}`}
              bg={highlightedIdx === idx ? 'cyan.50' : undefined}
              _dark={{ bg: highlightedIdx === idx ? 'cyan.900' : undefined }}
              px={3}
              py={2}
              cursor="pointer"
              fontWeight={highlightedIdx === idx ? 'bold' : 'normal'}
              color={highlightedIdx === idx ? 'cyan.700' : undefined}
              onMouseDown={e => { e.preventDefault(); handleSelect(item); }}
              onMouseEnter={() => setHighlightedIdx(idx)}
            >
              {renderItemLabel(item, highlightedIdx === idx)}
            </ListItem>
          ))}
          {showCreate && (
            <ListItem
              key="create"
              id={`autocomplete-item-${suggestions.length}`}
              bg={highlightedIdx === suggestions.length ? 'cyan.50' : undefined}
              _dark={{ bg: highlightedIdx === suggestions.length ? 'cyan.900' : undefined }}
              px={3}
              py={2}
              cursor="pointer"
              fontWeight="bold"
              color="cyan.700"
              onMouseDown={e => { e.preventDefault(); onCreate(inputValue); }}
              onMouseEnter={() => setHighlightedIdx(suggestions.length)}
            >
              <ListIcon as={FaPlus} color="cyan.400" />
              {renderCreateLabel(inputValue)}
            </ListItem>
          )}
        </List>
      )}
    </Box>
  );
}
