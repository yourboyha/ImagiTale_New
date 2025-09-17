import { GoogleGenAI, Type } from "@google/genai";
import { Language, StoryScene, StoryTone } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const sceneSchema = {
    type: Type.OBJECT,
    properties: {
        text: { type: Type.STRING, description: "The paragraph of the story for the current scene." },
        image_prompt: { type: Type.STRING, description: "A simple English prompt for an AI image generator to create an illustration for this scene." },
    },
    required: ["text", "image_prompt"],
};

const choiceSceneSchema = {
    type: Type.OBJECT,
    properties: {
        ...sceneSchema.properties,
        choices: {
            type: Type.ARRAY,
            description: "Three short, creative choices for the child to pick from to continue the story.",
            items: { type: Type.STRING }
        },
    },
    required: ["text", "image_prompt", "choices"],
};

async function generateImage(prompt: string): Promise<string> {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: `A beautiful watercolor storybook illustration of ${prompt}, whimsical and magical style for children.`,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '16:9',
            },
        });
        const base64Image = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64Image}`;
    } catch (error) {
        console.error("Image generation failed:", error);
        return `https://loremflickr.com/640/360/${prompt.split(' ').join(',')},storybook?lock=${Math.random()}`;
    }
}

async function callTextAPI(prompt: string, schema: any) {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Text generation failed:", error);
        return null;
    }
}


export async function generateVocabImage(word: string): Promise<string> {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: `A simple, cute, cartoon-style illustration of a ${word}, with a plain white background, for a children's flashcard.`,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '4:3'
            },
        });
        const base64Image = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64Image}`;
    } catch (error) {
        console.error(`Image generation for ${word} failed:`, error);
        return `https://loremflickr.com/400/300/${word},illustration,simple?lock=${word.replace(/\s/g, '')}`;
    }
}

const getSystemInstruction = (language: Language, storyTone: StoryTone) => (
    `You are a master storyteller for children aged 4-7. Your stories are engaging, simple, and always positive, with a tone of ${storyTone}. Never generate scary or negative content.
    The story must be in ${language === Language.TH ? 'Thai' : 'English'}.
    Image prompts must always be in English.`
);

export async function generateInitialStoryScene(words: string[], language: Language, storyTone: StoryTone, isImageGenerationEnabled: boolean): Promise<StoryScene> {
    const systemInstruction = getSystemInstruction(language, storyTone);
    const prompt = `${systemInstruction}
    Start a story that includes some of these words: ${words.join(', ')}.
    The story should be one paragraph and end with an engaging question for the child.
    Generate three short, creative choices for the child to pick from to continue the story.`;

    const data = await callTextAPI(prompt, choiceSceneSchema);
    if (!data) return { text: "เกิดข้อผิดพลาดในการสร้างเรื่องราว", imageUrl: "", choices: ["ลองอีกครั้ง"] };

    const imageUrl = isImageGenerationEnabled
        ? await generateImage(data.image_prompt)
        : `https://loremflickr.com/640/360/${data.image_prompt.split(' ').join(',')},storybook?lock=1`;

    return { text: data.text, imageUrl, choices: data.choices };
}

export async function generateNextStoryScene(storySoFar: string, userChoice: string, language: Language, storyTone: StoryTone, allWords: string[], isImageGenerationEnabled: boolean, sceneIndex: number): Promise<StoryScene> {
    const systemInstruction = getSystemInstruction(language, storyTone);
    const prompt = `${systemInstruction}
    Here is the story so far: "${storySoFar}".
    The user wants to continue the story with this idea: "${userChoice}". Incorporate it naturally.
    Try to include some of these words if they fit: ${allWords.join(', ')}.
    The new paragraph should end with an engaging question for the child.
    Generate three short, creative choices for the child to pick from to continue the story.`;

    const data = await callTextAPI(prompt, choiceSceneSchema);
    if (!data) return { text: "AI กำลังคิดเรื่องราวต่อ... แต่เกิดข้อผิดพลาด", imageUrl: "", choices: ["ลองอีกครั้ง"] };

    const imageUrl = isImageGenerationEnabled
        ? await generateImage(data.image_prompt)
        : `https://loremflickr.com/640/360/${data.image_prompt.split(' ').join(',')},storybook?lock=${sceneIndex}`;
    
    return { text: data.text, imageUrl, choices: data.choices };
}

export async function generateFinalStoryScene(storySoFar: string, language: Language, storyTone: StoryTone, allWords: string[], isImageGenerationEnabled: boolean): Promise<StoryScene> {
    const systemInstruction = getSystemInstruction(language, storyTone);
    const prompt = `${systemInstruction}
    Write a warm and satisfying conclusion for this story: "${storySoFar}".
    Incorporate any remaining words from this list if possible: ${allWords.join(', ')}.
    This is the final scene.`;

    const data = await callTextAPI(prompt, sceneSchema);
    if (!data) return { text: "นิทานของเราจบลงแล้วอย่างมีความสุข!", imageUrl: "" };

    const imageUrl = isImageGenerationEnabled
        ? await generateImage(data.image_prompt)
        : `https://loremflickr.com/640/360/castle,happy,ending,storybook?lock=5`;

    return { text: data.text, imageUrl };
}

export async function generateStoryTitle(fullStory: string, language: Language): Promise<string> {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Based on the following children's story, create a short, magical, and fitting title. The story is in ${language === Language.TH ? 'Thai' : 'English'}. Respond with only the title text, nothing else. Story: "${fullStory}"`,
        });
        return response.text.replace(/["*]/g, '').trim();
    } catch (error) {
        console.error("Title generation failed:", error);
        return language === Language.TH ? "นิทานของฉัน" : "My Story";
    }
}