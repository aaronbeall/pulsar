import { RoutinePromptKey } from "../models/types";

export const workoutPrompts = [
  {
    question: "What are your goals?",
    placeholder: "Ex. lose weight, get stronger, arms and upper body, or be healthier",
    key: "goals",
  },
  {
    question: "What equipment will you use?",
    placeholder: "Ex. dumbbells, bands, treadmill, whatever I need, or nothing",
    key: "equipment",
  },
  {
    question: "How much time can you workout?",
    placeholder: "Ex. 30 min daily, as much as I need, or very little",
    key: "time",
  },
  {
    question: "Anything else I should know?",
    placeholder: "Ex. I have asthma, I hate running, or I'm overweight",
    key: "additionalInfo",
  },
] as { question: string; placeholder: string; key: RoutinePromptKey }[];
