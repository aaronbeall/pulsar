import React from "react";
import { HStack, IconButton } from "@chakra-ui/react";
import { FaThumbsUp, FaThumbsDown } from "react-icons/fa";

interface LikeDislikeButtonsProps {
  liked?: boolean;
  disliked?: boolean;
  onLike: () => void;
  onDislike: () => void;
  iconColor?: string;
  size?: string;
}

const LikeDislikeButtons: React.FC<LikeDislikeButtonsProps> = ({ liked, disliked, onLike, onDislike, iconColor, size = "sm" }) => (
  <HStack spacing={1}>
    <IconButton
      aria-label="Like"
      icon={<FaThumbsUp />}
      size={size}
      variant="ghost"
      color={liked ? "cyan.500" : iconColor || "gray.400"}
      bg="transparent"
      _hover={{ color: "cyan.500", bg: "cyan.50" }}
      _active={{ bg: "transparent" }}
      _dark={{ _hover: { bg: "cyan.900" }, _active: { bg: "transparent" } }}
      onClick={onLike}
      isActive={!!liked}
    />
    <IconButton
      aria-label="Dislike"
      icon={<FaThumbsDown />}
      size={size}
      variant="ghost"
      color={disliked ? "red.500" : iconColor || "gray.400"}
      bg="transparent"
      _hover={{ color: "red.500", bg: "red.50" }}
      _active={{ bg: "transparent" }}
      _dark={{ _hover: { bg: "red.900" }, _active: { bg: "transparent" } }}
      onClick={onDislike}
      isActive={!!disliked}
    />
  </HStack>
);

export default LikeDislikeButtons;
