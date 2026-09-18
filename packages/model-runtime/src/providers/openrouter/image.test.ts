// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LobeOpenRouterAI, params } from './index';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('OpenRouter native image models', () => {
  it('preserves chat-based image generation for :image models', async () => {
    const imageUrl = 'data:image/png;base64,aW1hZ2U=';
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (input) => {
      expect(String(input)).toBe('https://openrouter.ai/api/v1/chat/completions');
      return Response.json({
        choices: [{ message: { images: [{ image_url: { url: imageUrl } }] } }],
      });
    });
    const runtime = new LobeOpenRouterAI({ apiKey: 'test', fetch, maxRetries: 0 });
    await expect(
      runtime.createImage({
        model: 'google/gemini-2.5-flash-image:image',
        params: { prompt: 'A landscape' },
      }),
    ).resolves.toEqual({ imageUrl });
  });

  it('generates without reference images and honors a mapped model ID', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (input, init) => {
      expect(String(input)).toBe('https://openrouter.ai/api/v1/images');
      const body = JSON.parse(String(init?.body));
      expect(body.model).toBe('openai/gpt-image-2.5-flare');
      expect(body.size).toBe('1024x1024');
      expect(body).not.toHaveProperty('input_references');
      return Response.json({ data: [{ b64_json: 'aW1hZ2U=' }] });
    });
    const runtime = new LobeOpenRouterAI({
      apiKey: 'test',
      fetch,
      maxRetries: 0,
      modelIdMapping: { 'my-image': 'openai/gpt-image-2.5-flare' },
    });
    await expect(
      runtime.createImage({
        model: 'my-image',
        params: { prompt: 'A landscape', size: '1024x1024' },
      }),
    ).resolves.toEqual({ imageUrl: 'data:image/png;base64,aW1hZ2U=' });
  });

  it('discovers image-only models alongside text models', async () => {
    const ids = ['openai/gpt-image-2.5-sunburst', 'openai/gpt-image-2.5-flare'];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const modalities = new URL(String(input)).searchParams.get('output_modalities');
      const includesImages = modalities === 'all' || modalities?.split(',').includes('image');
      return Response.json({
        data: (includesImages ? ids : []).map((id) => ({
          architecture: { input_modalities: ['text', 'image'], output_modalities: ['image'] },
          context_length: 400_000,
          created: 1788916350,
          id,
          name: id,
          pricing: { completion: '0', image_output: '0.00003', prompt: '0.000008' },
          supported_parameters: [],
          top_provider: { context_length: 400_000, max_completion_tokens: null },
        })),
      });
    });

    const models = await params.models();
    expect(models.map((model) => model.id)).toEqual(ids);
    for (const model of models) {
      expect(model.type).toBe('image');
      expect(model.parameters?.quality?.enum).toContain('max');
    }
  });

  it.each(['sunburst', 'flare'])(
    'generates and edits with %s via the native Images API',
    async (variant) => {
      const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (input, init) => {
        expect(String(input)).toBe('https://openrouter.ai/api/v1/images');
        const body = JSON.parse(String(init?.body));
        expect(body).toMatchObject({
          input_references: [
            { image_url: { url: 'data:image/png;base64,aW1hZ2U=' }, type: 'image_url' },
          ],
          model: `openai/gpt-image-2.5-${variant}`,
          prompt: 'A watercolor landscape',
          quality: 'max',
        });
        expect(body).not.toHaveProperty('size');
        expect(body).not.toHaveProperty('imageUrls');
        return Response.json({
          data: [{ b64_json: 'aW1hZ2U=', media_type: 'image/webp' }],
          usage: { completion_tokens: 100, cost: 0.03, prompt_tokens: 20, total_tokens: 120 },
        });
      });
      const runtime = new LobeOpenRouterAI({ apiKey: 'test', fetch, maxRetries: 0 });
      const result = await runtime.createImage({
        model: `openai/gpt-image-2.5-${variant}`,
        params: {
          imageUrls: ['data:image/png;base64,aW1hZ2U='],
          prompt: 'A watercolor landscape',
          quality: 'max',
          size: 'auto',
        },
      });
      expect(result.imageUrl).toBe('data:image/webp;base64,aW1hZ2U=');
      expect(result.modelUsage?.cost).toBe(0.03);
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );
});
