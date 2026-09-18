// @vitest-environment node
import { azure } from 'model-bank';
import { describe, expect, it, vi } from 'vitest';

import { LobeAzureOpenAI } from './index';

describe('Azure GPT Image 2.5', () => {
  it.each(['gpt-image-2.5-sunburst', 'gpt-image-2.5-flare'])(
    'registers %s and uses its configured Azure deployment',
    async (model) => {
      const card = azure.find((entry) => entry.id === model);
      expect(card?.type).toBe('image');
      if (card?.type !== 'image') throw new Error('Expected an Azure image model');
      expect(card.parameters?.quality?.enum).toContain('xhigh');

      const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (input, init) => {
        expect(String(input)).toBe('https://test.openai.azure.com/openai/v1/images/generations');
        expect(JSON.parse(String(init?.body))).toMatchObject({
          model: 'my-image-deployment',
          prompt: 'A landscape',
          quality: 'xhigh',
        });
        return Response.json({ data: [{ b64_json: 'aW1hZ2U=' }] });
      });
      const runtime = new LobeAzureOpenAI({
        apiKey: 'test',
        baseURL: 'https://test.openai.azure.com',
        fetch,
        maxRetries: 0,
        modelIdMapping: { [model]: 'my-image-deployment' },
      });
      const result = await runtime.createImage({
        model,
        params: { prompt: 'A landscape', quality: 'xhigh' },
      });
      expect(result.imageUrl).toBe('data:image/png;base64,aW1hZ2U=');
    },
  );
});
