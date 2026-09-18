// @vitest-environment node
import { extractDefaultValues, openrouter } from 'model-bank';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LobeOpenRouterAI, params } from './index';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('OpenRouter native image models', () => {
  const addedModels = [
    ['qwen/qwen-image-3-pro', ['1K', '2K'], 4],
    ['qwen/qwen-image-3', ['1K', '2K'], 4],
    ['bytedance-seed/seedream-5-0-pro', ['1K', '2K'], 14],
    ['bytedance-seed/seedream-5-0-lite', ['2K', '4K'], 14],
    ['bytedance-seed/seedream-4.5', ['1K', '2K', '4K'], 14],
    ['krea/krea-2-large', ['1K'], 1],
    ['x-ai/grok-imagine-image-2.0', ['1K', '2K'], 3],
    ['microsoft/mai-image-2.6', undefined, 5],
    ['microsoft/mai-image-2.6-flash', undefined, 5],
  ] as const;

  it.each(addedModels)(
    'registers and generates with supported defaults for %s',
    async (id, resolutions, maxCount) => {
      const model = openrouter.find((model) => model.id === id);
      expect(model?.type).toBe('image');
      if (model?.type !== 'image') throw new Error(`Missing image model: ${id}`);
      expect(model.parameters.resolution?.enum).toEqual(resolutions);
      expect(model.parameters.imageUrls?.maxCount).toBe(maxCount);
      const defaults = extractDefaultValues(model.parameters);
      const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (input, init) => {
        expect(String(input)).toBe('https://openrouter.ai/api/v1/images');
        const body = JSON.parse(String(init?.body));
        expect(body.model).toBe(id);
        expect(body.aspect_ratio).toBe('1:1');
        expect(body.resolution).toBe(resolutions?.[0]);
        expect(body).not.toHaveProperty('seed');
        expect(body).not.toHaveProperty('size');
        expect(body.quality).toBe(id.startsWith('x-ai/') ? 'low' : undefined);
        expect(body.input_references).toHaveLength(maxCount);
        return Response.json({ data: [{ b64_json: 'aW1hZ2U=' }] });
      });
      const runtime = new LobeOpenRouterAI({ apiKey: 'test', fetch, maxRetries: 0 });
      await expect(
        runtime.createImage({
          model: id,
          params: {
            ...defaults,
            imageUrls: Array.from({ length: maxCount }, () => 'data:image/png;base64,aW1hZ2U='),
            prompt: 'A landscape',
          },
        }),
      ).resolves.toEqual({ imageUrl: 'data:image/png;base64,aW1hZ2U=' });
    },
  );

  it('uses the Chat Completions endpoint for Muse Image, including mapped IDs and reference images', async () => {
    const model = openrouter.find((model) => model.id === 'meta/muse-image');
    expect(model?.type).toBe('image');
    const imageUrl = 'data:image/png;base64,aW1hZ2U=';
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (input, init) => {
      expect(String(input)).toBe('https://openrouter.ai/api/v1/chat/completions');
      const body = JSON.parse(String(init?.body));
      expect(body.model).toBe('meta/muse-image');
      expect(body.messages[0].content).toContainEqual({
        type: 'image_url',
        image_url: { url: imageUrl },
      });
      return Response.json({
        choices: [{ message: { images: [{ image_url: { url: imageUrl } }] } }],
      });
    });
    const runtime = new LobeOpenRouterAI({
      apiKey: 'test',
      fetch,
      maxRetries: 0,
      modelIdMapping: { 'my-muse': 'meta/muse-image' },
    });
    await expect(
      runtime.createImage({
        model: 'my-muse',
        params: { imageUrl, prompt: 'Make this watercolor' },
      }),
    ).resolves.toEqual({ imageUrl });
  });

  it('discovers all added image models without labeling paid image generation as free', async () => {
    const ids = [...addedModels.map(([id]) => id), 'meta/muse-image'];
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        data: ids.map((id) => ({
          architecture: { input_modalities: ['text', 'image'], output_modalities: ['image'] },
          context_length: 0,
          created: 1788916350,
          id,
          name: id,
          pricing: { completion: '0', image_output: '0.00003', prompt: '0' },
          supported_parameters: [],
          top_provider: { context_length: 0, max_completion_tokens: 0 },
        })),
      }),
    );
    const models = await params.models();
    expect(models.map((model) => model.id)).toEqual(ids);
    for (const model of models) {
      expect(model.type).toBe('image');
      expect(model.parameters?.prompt).toBeDefined();
      expect(model.displayName).not.toContain('(free)');
    }
  });

  it('preserves seed zero for models supporting reproducible generation', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (_input, init) => {
      expect(JSON.parse(String(init?.body)).seed).toBe(0);
      return Response.json({ data: [{ b64_json: 'aW1hZ2U=' }] });
    });
    const runtime = new LobeOpenRouterAI({ apiKey: 'test', fetch, maxRetries: 0 });
    await runtime.createImage({
      model: 'qwen/qwen-image-3',
      params: { prompt: 'A landscape', seed: 0 },
    });
  });

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
