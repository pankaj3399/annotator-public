// For app directory: app/api/translate/route.ts
// For pages directory: pages/api/translate.ts

import { NextRequest } from 'next/server';

// For pages directory API route uncomment this:
// import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Translation API handler for Google Translate, DeepL, LibreTranslate and MyMemory
 * 
 * Expected request body:
 * {
 *   text: string,              // Text to translate
 *   model: string,             // 'google-translate', 'deepl', 'libretranslate', or 'mymemory'
 *   apiKey: string,            // API key for the service (optional for LibreTranslate and MyMemory)
 *   sourceLanguage: string,    // Source language code (e.g., 'en', 'auto')
 *   targetLanguage: string     // Target language code (e.g., 'fr', 'es')
 * }
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, model, apiKey, sourceLanguage, targetLanguage } = body;

    // Validate request
    if (!text) {
      return Response.json({ error: 'No text provided for translation' }, { status: 400 });
    }

    let translation = '';

    // Handle different translation models
    if (model === 'deepl') {
      if (!apiKey) {
        return Response.json({ error: 'API key is required for DeepL' }, { status: 400 });
      }
      translation = await translateWithDeepL(text, apiKey, sourceLanguage, targetLanguage);
    } else if (model === 'google-translate') {
      if (!apiKey) {
        return Response.json({ error: 'API key is required for Google Translate' }, { status: 400 });
      }
      translation = await translateWithGoogle(text, apiKey, sourceLanguage, targetLanguage);
    } else if (model === 'libretranslate') {
      try {
        // LibreTranslate may require an API key depending on the instance
        translation = await translateWithLibreTranslate(text, sourceLanguage, targetLanguage, apiKey);
      } catch (error) {
        console.error('LibreTranslate failed, trying MyMemory as fallback:', error);
        // Fallback to MyMemory if all LibreTranslate options fail
        translation = await translateWithMyMemory(text, sourceLanguage, targetLanguage);
      }
    } else if (model === 'mymemory') {
      // MyMemory has optional email for higher rate limits (not API key)
      translation = await translateWithMyMemory(text, sourceLanguage, targetLanguage, apiKey);
    } else {
      return Response.json({ error: 'Unsupported translation model' }, { status: 400 });
    }

    return Response.json({ translation });
  } catch (error) {
    console.error('Translation error:', error);
    return Response.json(
      { error: error.message || 'An error occurred during translation' },
      { status: 500 }
    );
  }
}

/**
 * Translate text using Google Translate API
 */
async function translateWithGoogle(
  text: string,
  apiKey: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string> {
  const url = 'https://translation.googleapis.com/language/translate/v2';

  const params = new URLSearchParams({
    key: apiKey,
    q: text,
    target: targetLanguage,
    format: 'text',
  });

  // Only add source language if it's not 'auto'
  if (sourceLanguage && sourceLanguage !== 'auto') {
    params.append('source', sourceLanguage);
  }

  const response = await fetch(`${url}?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `Google Translate API error (${response.status}): ${errorData.error?.message || JSON.stringify(errorData)
      }`
    );
  }

  const data = await response.json();
  return data.data.translations[0].translatedText;
}

/**
 * Translate text using LibreTranslate API
 * LibreTranslate is an open-source translation service
 * Default URL is public instance, but may have rate limits
 */
async function translateWithLibreTranslate(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  apiKey?: string,
  url: string = 'https://libretranslate.de/translate' // Changed default to more reliable instance
): Promise<string> {
  // Construct request body
  const requestBody: any = {
    q: text,
    source: sourceLanguage === 'auto' ? 'auto' : sourceLanguage,
    target: targetLanguage,
    format: 'text'
  };

  // Add API key if provided (some LibreTranslate instances require this)
  if (apiKey) {
    requestBody.api_key = apiKey;
  }

  try {
    const controller = new AbortController();
    // Set 10 second timeout to prevent hanging
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LibreTranslate API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.translatedText) {
      throw new Error(`LibreTranslate API returned unexpected format: ${JSON.stringify(data)}`);
    }

    return data.translatedText;
  } catch (error) {
    // Check for timeout error
    if (error.name === 'AbortError' || error.code === 'UND_ERR_CONNECT_TIMEOUT') {
      console.error(`Timeout connecting to LibreTranslate at ${url}`);
    }

    // Try fallback URL if primary fails and we're not already using a fallback
    if (url !== 'https://translate.argosopentech.com/translate') {
      console.log('Trying fallback LibreTranslate endpoint...');
      return translateWithLibreTranslate(
        text,
        sourceLanguage,
        targetLanguage,
        apiKey,
        'https://translate.argosopentech.com/translate'
      );
    } else {
      // Use MyMemory as a last resort fallback
      console.log('LibreTranslate failed, falling back to MyMemory...');
      return translateWithMyMemory(text, sourceLanguage, targetLanguage);
    }
  }
}

/**
 * Translate text using MyMemory Translation API
 * This is a free service with higher limits for registered users
 */
async function translateWithMyMemory(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  email?: string // Optional email for higher rate limits
): Promise<string> {
  // Format language pair
  const langPair = sourceLanguage === 'auto'
    ? targetLanguage
    : `${sourceLanguage}|${targetLanguage}`;

  // Build URL with parameters
  let url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;

  // Add email for higher rate limits if provided
  if (email) {
    url += `&de=${encodeURIComponent(email)}`;
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`MyMemory API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.responseStatus && data.responseStatus !== 200) {
    throw new Error(`MyMemory API error: ${data.responseStatus} - ${data.responseDetails || 'Unknown error'}`);
  }

  if (!data.responseData || !data.responseData.translatedText) {
    throw new Error(`MyMemory API returned unexpected format: ${JSON.stringify(data)}`);
  }

  return data.responseData.translatedText;
}

function mapLanguageCodeForDeepL(languageCode: string, isSourceLang: boolean = false): string {
  // First, normalize the input code to uppercase
  const normalizedCode = languageCode.toUpperCase();

  // DeepL supported source languages
  const supportedSourceLanguages = [
    'AR', 'BG', 'CS', 'DA', 'DE', 'EL', 'EN',
    'ES', 'ET', 'FI', 'FR', 'HU', 'ID', 'IT',
    'JA', 'KO', 'LT', 'LV', 'NB', 'NL', 'PL',
    'PT', 'RO', 'RU', 'SK', 'SL', 'SV', 'TR',
    'UK', 'ZH'
  ];

  // DeepL supported target languages (includes source languages plus variants)
  const supportedTargetLanguages = [
    ...supportedSourceLanguages,
    'EN-GB', 'EN-US', 'PT-BR', 'PT-PT', 'ZH-HANS', 'ZH-HANT'
  ];

  // Handle common language code variations
  const languageMapping: Record<string, string> = {
    'en-us': 'EN-US',
    'en-gb': 'EN-GB',
    'en-uk': 'EN-GB',
    'en': 'EN',
    'zh-cn': 'ZH-HANS',
    'zh-hans': 'ZH-HANS',
    'zh-tw': 'ZH-HANT',
    'zh-hant': 'ZH-HANT',
    'zh': 'ZH',
    'pt-br': 'PT-BR',
    'pt-pt': 'PT-PT',
    'pt': 'PT',
    'nb-no': 'NB',
    'nb': 'NB'
  };

  // Try to get the mapped language code
  let mappedCode = languageMapping[languageCode.toLowerCase()] || normalizedCode;

  // Validate the language code
  const validCodes = isSourceLang ? supportedSourceLanguages : supportedTargetLanguages;

  if (!validCodes.includes(mappedCode)) {
    console.warn(`Warning: Language code "${mappedCode}" is not in DeepL's supported ${isSourceLang ? 'source' : 'target'} languages list.`);
  }

  return mappedCode;
}

/**
 * Translate text using DeepL API
 */
async function translateWithDeepL(
  text: string,
  apiKey: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string> {
  const url = 'https://api-free.deepl.com/v2/translate';

  const formData = new URLSearchParams();
  formData.append('text', text);

  // Map target language to DeepL format
  const mappedTargetLang = mapLanguageCodeForDeepL(targetLanguage, false);
  formData.append('target_lang', mappedTargetLang);

  // Only add source language if it's not 'auto'
  if (sourceLanguage && sourceLanguage.toLowerCase() !== 'auto') {
    const mappedSourceLang = mapLanguageCodeForDeepL(sourceLanguage, true);
    formData.append('source_lang', mappedSourceLang);
  }

  try {
    // Log request details for debugging
    console.log(`DeepL Request - Source: ${sourceLanguage || 'auto'}, Target: ${targetLanguage}, Mapped Source: ${sourceLanguage && sourceLanguage.toLowerCase() !== 'auto' ? mapLanguageCodeForDeepL(sourceLanguage, true) : 'auto'}, Mapped Target: ${mappedTargetLang}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepL API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.translations[0].text;
  } catch (error) {
    console.error('DeepL translation error:', error);

    // If the source language is causing problems and it's not auto, try with auto detection
    if (error.message.includes('source_lang') && sourceLanguage && sourceLanguage.toLowerCase() !== 'auto') {
      console.log('Trying translation with auto-detected source language...');

      // Create new form data without source_lang parameter
      const formDataRetry = new URLSearchParams();
      formDataRetry.append('text', text);
      formDataRetry.append('target_lang', mappedTargetLang);

      try {
        const retryResponse = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `DeepL-Auth-Key ${apiKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formDataRetry.toString(),
        });

        if (!retryResponse.ok) {
          const retryErrorText = await retryResponse.text();
          throw new Error(`DeepL API retry error (${retryResponse.status}): ${retryErrorText}`);
        }

        const retryData = await retryResponse.json();
        return retryData.translations[0].text;
      } catch (retryError) {
        console.error('DeepL translation retry error:', retryError);
        throw retryError;
      }
    }

    // Provide more detailed error message for debugging
    if (error.message.includes('not supported')) {
      throw new Error(`DeepL API error: Language code not supported. Source: '${sourceLanguage}', Target: '${targetLanguage}'. Make sure you're using DeepL-supported language codes.`);
    }

    throw error;
  }
}
