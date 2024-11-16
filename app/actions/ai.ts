'use server'

import { AIJob } from '@/models/aiModel';
import Task from '@/models/Task';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { task } from '../preview/page';

function updateSelectedCheckbox(item: any, responseText: string) {
  if (!item.content.selectedCheckbox) {
    item.content.selectedCheckbox = [];
  }

  const normalizedResponseText = responseText.toLowerCase();

  const validOptions = item.content.checkboxes.filter(option =>
    normalizedResponseText.includes(option.toLowerCase())
  );

  console.log('validOptions:', validOptions);

  validOptions.forEach(option => {
    if (!item.content.selectedCheckbox.includes(option)) {
      item.content.selectedCheckbox.push(option);
    }
  });
  console.log('selectedCheckbox:', item.content.selectedCheckbox);
}

function updateInputTextContent(content: any[], response: []) {
  // return contentArray.map(item => {
  //   if (item.type === 'inputText') {
  //     item.content.innerText = responseText;
  //   }

  //   if (item.type === 'checkbox') {
  //     updateSelectedCheckbox(item, responseText);
  //   }

  //   if (item.content && Array.isArray(item.content)) {
  //     item.content = updateInputTextContent(item.content, responseText);
  //   }

  //   return item;
  // });
  // Sample data parsing
  // Function to find and update the element by name
  function updateContent(elements, responseItem) {
    for (let el of elements) {
      // Check if current element matches by name
      if (el.name === responseItem.name) {
        if (el.type === 'inputText') {
          el.content.innerText = responseItem.content;
        } else if (el.type === 'checkbox') {
          el.content.selectedCheckbox = responseItem.selectedCheckbox;
        }
        return true; // Stop search after updating
      }
      // If content is nested, recurse into it
      if (Array.isArray(el.content)) {
        const found = updateContent(el.content, responseItem);
        if (found) return true; // Stop search if found in nested content
      }
    }
    return false; // Continue search
  }

  // Process each response item
  response.forEach(respItem => updateContent(content, respItem));

  // Log or return updated content
  // console.log(JSON.stringify(content, null, 2));

  return content
}


async function saveToDatabase(content: string, response: string, taskId: string) {
  console.log(response)
  const newContent = updateInputTextContent(JSON.parse(content), JSON.parse(response));
  await Task.updateOne({ _id: taskId }, { content: JSON.stringify(newContent), submitted: true });
  await AIJob.updateOne({ taskid: taskId }, { completed: true });
  // console.log('Saving to database:', { content, response })
}

export async function generateAndSaveAIResponse(content: string, taskId: string, apiKey: string, provider: string, model: string, systemPrompt: string) {
  if (!taskId || !content) {
    return { error: 'Missing required fields' }
  }

  const openai = createOpenAI({
    apiKey: apiKey,
    compatibility: 'strict',
  });

  const google = createGoogleGenerativeAI({
    apiKey: apiKey,
  });

  const anthropic = createAnthropic({
    apiKey: apiKey,
  });

  try {
    const { text } = await generateText({
      model: provider === 'OpenAI' ? openai(`${model}`)
        : provider === 'Gemini' ? google(`${model}`)
          : provider === 'Anthropic' ? anthropic(`${model}`)
            : undefined,
      prompt: `
          Please only and only return the response  " [{
          "name": "name of the element",
          "content": "answer here only"
          },{
            "name": "name of the element",
            "content": "if a content is given in this format :[Option1, Option2], which one is better?: [Option1, Option2]",
            "selectedCheckbox" : ["Option1"]
          }] " format with the names given in {} in an array [] and put the answer in content field for each question and if options are given then put in "selectedCheckbox" field in the format of string[].
       
        .
        ${systemPrompt}
        `,
    });

    const response = text

    await saveToDatabase(content, response, taskId)

    return { response, message: 'Response generated and saved successfully' }
  } catch (error) {
    console.error('Error generating or saving AI response:', error)
    return { error: 'An error occurred while generating or saving the AI response' }
  }
}

export async function aiSolve(id: string) {
  const Jobs = await AIJob.find({ projectid: id }).populate('taskid modelid');

  const JobPromises = Jobs.map(async (job) => {
    if (!job.taskid.annotator) {
      try {
        const element = await extractElementDetails(JSON.parse(job.taskid.content));
        const systemPrompt = replacePlaceholders(job.modelid.systemPrompt, element);
        // console.log('systemPrompt:', systemPrompt);
        const response = await generateAndSaveAIResponse(job.taskid.content, job.taskid._id, job.modelid.apiKey, job.modelid.provider, job.modelid.model, systemPrompt);
        if (response.error) {
          throw new Error(`Error: ${response.error}`);
        }
      } catch (error) {
        await AIJob.deleteMany({ _id: job._id });
      }
    }
  });
  await Promise.all(JobPromises);
  await AIJob.deleteMany({ projectid: id });
}

function replacePlaceholders(systemPrompt: string, elements: any[]) {
  elements.forEach(element => {
    const placeholder = `{${element.name}}`;
    if (systemPrompt.includes(placeholder)) {
      let replacementContent;
      if (element.type === 'checkbox' && typeof element.content === 'object') {
        const { checkboxTitle, checkboxes } = element.content;
        replacementContent = { name: element.name, content: `${checkboxTitle}: ${checkboxes.join(', ')}` };
      } else {
        replacementContent = { name: element.name, content: element.content };
      }
      systemPrompt = systemPrompt.replace(placeholder, JSON.stringify(replacementContent));
    }
  });
  return systemPrompt;
}

function extractPlaceholdersFromResponse(task: task) {
  const content = JSON.parse(task.content)
  const extractedPlaceholders: string[] = []
  let hasInputText = false;
  const extractPlaceholders = (item: any) => {
    if (Array.isArray(item.content)) {
      item.content.forEach(extractPlaceholders)
    } else if (item.type) {
      if (item.type === "inputText") {
        hasInputText = true;
      }
      if ((item.type === "dynamicText" || item.type === "text") && item.content?.innerText) {
        extractedPlaceholders.push(item.content.innerText);
      }
    }
  }

  try {
    content.forEach(extractPlaceholders)
    if (!hasInputText) {
      throw new Error("Error: Missing 'inputText' type.");
    }
    if (extractedPlaceholders.length === 0) {
      throw new Error("Error: Missing 'dynamicText' or 'text' types.");
    }
    return extractedPlaceholders.join("\n")
  } catch (error: any) {
    console.error(error.message);
  }
}

async function extractElementDetails(content: any[]) {
  const elements: any[] = [];

  function extractContent(node: any) {
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(extractContent);
    } else if (node.name && node.content) {
      let extractedContent;

      switch (node.type) {
        case 'inputText':
        case 'text':
        case 'dynamicText':
          extractedContent = node.content.innerText || '';
          break;
        case 'dynamicVideo':
        case 'dynamicImage':
        case 'dynamicAudio':
        case 'recordAudio':
        case 'recordVideo':
        case 'inputRecordAudio':
        case 'inputRecordVideo':
          extractedContent = node.content.src || '';
          break;
        case 'checkbox':
          extractedContent = {
            checkboxTitle: node.content.title || '',
            checkboxes: node.content.checkboxes || [],
          };
          break;
        default:
          extractedContent = 'Unknown content';
      }

      if (typeof extractedContent === 'object' && !Array.isArray(extractedContent)) {
        elements.push({ name: `${node.name}`, type: node.type, content: extractedContent });
      } else {
        elements.push({ name: node.name, type: node.type, content: extractedContent });
      }
    }
  }

  extractContent(content[0]);

  return elements;
}

