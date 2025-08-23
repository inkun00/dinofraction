'use server';
/**
 * @fileOverview Provides personalized learning feedback based on user game data.
 *
 * - getPersonalizedFeedback - A function that generates personalized feedback for the user.
 * - PersonalizedFeedbackInput - The input type for the getPersonalizedFeedback function.
 * - PersonalizedFeedbackOutput - The return type for the getPersonalizedFeedback function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedFeedbackInputSchema = z.object({
  correctProblemTypes: z.record(z.number()).describe('Record of correct problem types and their counts.'),
  wrongProblemTypes: z.record(z.number()).describe('Record of incorrect problem types and their counts.'),
});
export type PersonalizedFeedbackInput = z.infer<typeof PersonalizedFeedbackInputSchema>;

const PersonalizedFeedbackOutputSchema = z.object({
  feedback: z.string().describe('Personalized feedback based on the user performance.'),
});
export type PersonalizedFeedbackOutput = z.infer<typeof PersonalizedFeedbackOutputSchema>;

export async function getPersonalizedFeedback(input: PersonalizedFeedbackInput): Promise<PersonalizedFeedbackOutput> {
  return personalizedFeedbackFlow(input);
}

const personalizedFeedbackPrompt = ai.definePrompt({
  name: 'personalizedFeedbackPrompt',
  input: {schema: PersonalizedFeedbackInputSchema},
  output: {schema: PersonalizedFeedbackOutputSchema},
  prompt: `You are an AI learning assistant that analyzes a student's performance on fraction problems and provides personalized feedback.

  Here's a summary of the student's performance:
  Correct Problem Types: {{JSON.stringify correctProblemTypes}}
  Wrong Problem Types: {{JSON.stringify wrongProblemTypes}}

  Based on this, provide concise feedback to the student, highlighting their strengths and weaknesses, and suggesting areas for improvement. Be encouraging and supportive.
  Format your response as a single paragraph.
  `,
});

const personalizedFeedbackFlow = ai.defineFlow(
  {
    name: 'personalizedFeedbackFlow',
    inputSchema: PersonalizedFeedbackInputSchema,
    outputSchema: PersonalizedFeedbackOutputSchema,
  },
  async input => {
    const {output} = await personalizedFeedbackPrompt(input);
    return output!;
  }
);
