import { extractDefaultValues } from 'model-bank';
import { describe, expect, it } from 'vitest';

import { processMultiProviderModelList } from './modelParse';

describe('OpenAI GPT Image 2.5 model discovery', () => {
  it.each(['gpt-image-2.5-sunburst', 'gpt-image-2.5-flare'])(
    'retains %s from the models API with usable generation parameters',
    async (id) => {
      // The OpenAI models endpoint supplies IDs, not image parameter schemas.
      const models = await processMultiProviderModelList([{ id }], 'openai');

      expect(models).toHaveLength(1);
      const model = models[0];
      expect(model.id).toBe(id);
      expect(model.type).toBe('image');
      expect(model.parameters).toBeDefined();
      expect(extractDefaultValues(model.parameters!)).toMatchObject({
        prompt: '',
        quality: 'auto',
        size: 'auto',
      });
      expect(model.parameters?.quality?.enum).toEqual([
        'auto',
        'low',
        'medium',
        'high',
        'xhigh',
        'max',
      ]);

      for (const size of model.parameters?.size?.enum ?? []) {
        if (size === 'auto') continue;
        const [width, height] = size.split('x').map(Number);
        expect(width % 16).toBe(0);
        expect(height % 16).toBe(0);
        expect(Math.max(width, height)).toBeLessThanOrEqual(3840);
        expect(width / height).toBeGreaterThanOrEqual(1 / 3);
        expect(width / height).toBeLessThanOrEqual(3);
        expect(width * height).toBeGreaterThanOrEqual(655_360);
        expect(width * height).toBeLessThanOrEqual(8_294_400);
      }
    },
  );
});
