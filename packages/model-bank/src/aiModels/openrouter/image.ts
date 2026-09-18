import { gptImage2_5Schema } from '../../const/imageParameters';
import type { ModelParamsSchema } from '../../standard-parameters';
import type { AIImageModelCard } from '../../types/aiModel';

// OpenRouter-specific capabilities; direct provider APIs may accept different options.
// https://openrouter.ai/api/v1/images/models
// https://openrouter.ai/api/v1/images/models/<author>/<model>/endpoints
const qwenImage3Parameters: ModelParamsSchema = {
  aspectRatio: {
    default: '1:1',
    enum: [
      '1:1',
      '1:2',
      '1:4',
      '2:1',
      '2:3',
      '3:2',
      '3:4',
      '4:1',
      '4:3',
      '4:5',
      '5:4',
      '9:16',
      '16:9',
    ],
  },
  imageUrls: { default: [], maxCount: 4 },
  prompt: { default: '' },
  resolution: { default: '1K', enum: ['1K', '2K'] },
  seed: { default: null },
};

const seedreamParameters: ModelParamsSchema = {
  aspectRatio: {
    default: '1:1',
    enum: [
      '1:1',
      '1:2',
      '2:1',
      '2:3',
      '3:2',
      '3:4',
      '4:3',
      '4:5',
      '5:4',
      '9:16',
      '16:9',
      '9:19.5',
      '19.5:9',
      '9:20',
      '20:9',
      '9:21',
      '21:9',
      'auto',
    ],
  },
  imageUrls: { default: [], maxCount: 14 },
  prompt: { default: '' },
  seed: { default: null },
};

const maiImage26Parameters: ModelParamsSchema = {
  aspectRatio: {
    default: '1:1',
    enum: ['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3', 'auto'],
  },
  imageUrls: { default: [], maxCount: 5 },
  prompt: { default: '' },
};

export const openrouterImageModels: AIImageModelCard[] = [
  {
    description: 'GPT Image 2.5 Sunburst for precise image generation and editing via OpenRouter.',
    displayName: 'GPT Image 2.5 Sunburst',
    id: 'openai/gpt-image-2.5-sunburst',
    parameters: gptImage2_5Schema,
    type: 'image',
  },
  {
    description: 'GPT Image 2.5 Flare for fast image generation and editing via OpenRouter.',
    displayName: 'GPT Image 2.5 Flare',
    id: 'openai/gpt-image-2.5-flare',
    parameters: gptImage2_5Schema,
    type: 'image',
  },
  {
    description:
      'Qwen Image 3 Pro for detailed image generation, text rendering, and editing via OpenRouter.',
    displayName: 'Qwen Image 3 Pro',
    id: 'qwen/qwen-image-3-pro',
    parameters: qwenImage3Parameters,
    type: 'image',
  },
  {
    description:
      'Qwen Image 3 for image generation and editing with up to four reference images via OpenRouter.',
    displayName: 'Qwen Image 3',
    id: 'qwen/qwen-image-3',
    parameters: qwenImage3Parameters,
    type: 'image',
  },
  {
    description:
      'Seedream 5.0 Pro for commercial image generation and precise editing via OpenRouter.',
    displayName: 'Seedream 5.0 Pro',
    id: 'bytedance-seed/seedream-5-0-pro',
    parameters: { ...seedreamParameters, resolution: { default: '1K', enum: ['1K', '2K'] } },
    type: 'image',
  },
  {
    description:
      'Seedream 5.0 Lite for image generation and reference-based editing at 2K or 4K via OpenRouter.',
    displayName: 'Seedream 5.0 Lite',
    id: 'bytedance-seed/seedream-5-0-lite',
    parameters: { ...seedreamParameters, resolution: { default: '2K', enum: ['2K', '4K'] } },
    type: 'image',
  },
  {
    description:
      'Seedream 4.5 for image generation and consistent reference-based editing via OpenRouter.',
    displayName: 'Seedream 4.5',
    id: 'bytedance-seed/seedream-4.5',
    parameters: { ...seedreamParameters, resolution: { default: '1K', enum: ['1K', '2K', '4K'] } },
    type: 'image',
  },
  {
    description:
      'Krea 2 Large for textured image generation with optional reference-image conditioning via OpenRouter.',
    displayName: 'Krea 2 Large',
    id: 'krea/krea-2-large',
    parameters: {
      aspectRatio: { default: '1:1', enum: ['1:1', '4:3', '3:2', '16:9', '4:5', '2:3', '9:16'] },
      imageUrls: { default: [], maxCount: 1 },
      prompt: { default: '' },
      resolution: { default: '1K', enum: ['1K'] },
      seed: { default: null },
    },
    type: 'image',
  },
  {
    description:
      'Grok Imagine Image 2.0 for image generation and editing at low or medium quality via OpenRouter.',
    displayName: 'Grok Imagine Image 2.0',
    id: 'x-ai/grok-imagine-image-2.0',
    parameters: {
      aspectRatio: {
        default: '1:1',
        enum: [
          '1:1',
          '3:4',
          '4:3',
          '9:16',
          '16:9',
          '2:3',
          '3:2',
          '9:19.5',
          '19.5:9',
          '9:20',
          '20:9',
          '1:2',
          '2:1',
          'auto',
        ],
      },
      imageUrls: { default: [], maxCount: 3 },
      prompt: { default: '' },
      quality: { default: 'low', enum: ['low', 'medium'] },
      resolution: { default: '1K', enum: ['1K', '2K'] },
    },
    type: 'image',
  },
  {
    description:
      'MAI-Image-2.6 for precise image generation and editing with up to five references via OpenRouter.',
    displayName: 'MAI-Image-2.6',
    id: 'microsoft/mai-image-2.6',
    parameters: maiImage26Parameters,
    type: 'image',
  },
  {
    description:
      'MAI-Image-2.6 Flash for lower-latency image generation and editing via OpenRouter.',
    displayName: 'MAI-Image-2.6 Flash',
    id: 'microsoft/mai-image-2.6-flash',
    parameters: maiImage26Parameters,
    type: 'image',
  },
  {
    // Muse currently exposes Chat Completions, not a native Images API endpoint.
    // https://openrouter.ai/meta/muse-image/llms.txt
    description:
      'Muse Image for image generation and reference-based editing via OpenRouter Chat Completions.',
    displayName: 'Muse Image',
    id: 'meta/muse-image',
    parameters: { imageUrl: { default: null }, prompt: { default: '' } },
    type: 'image',
  },
];
