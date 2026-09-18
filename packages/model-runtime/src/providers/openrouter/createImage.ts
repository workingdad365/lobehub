import type OpenAI from 'openai';

import type { CreateImagePayload, CreateImageResponse } from '../../types/image';

interface OpenRouterImageResponse {
  data?: { b64_json: string; media_type?: string }[];
  usage?: {
    completion_tokens?: number;
    cost?: number;
    prompt_tokens?: number;
    total_tokens?: number;
  };
}

// https://openrouter.ai/docs/guides/overview/multimodal/image-generation
export const createOpenRouterImage = async (
  client: OpenAI,
  payload: CreateImagePayload,
  requestModel: string,
): Promise<CreateImageResponse> => {
  const { aspectRatio, imageUrl, imageUrls, prompt, quality, resolution, seed, size } =
    payload.params;
  const references = imageUrls?.length ? imageUrls : imageUrl ? [imageUrl] : [];

  const result = await client.post<OpenRouterImageResponse>('/images', {
    body: {
      ...(aspectRatio && aspectRatio !== 'auto' && { aspect_ratio: aspectRatio }),
      ...(references.length > 0 && {
        input_references: references.map((url) => ({ image_url: { url }, type: 'image_url' })),
      }),
      model: requestModel,
      n: 1,
      prompt,
      ...(quality && { quality }),
      ...(resolution && { resolution }),
      ...(seed != null && { seed }),
      ...(size && size !== 'auto' && { size }),
      stream: false,
    },
  });

  const image = result.data?.[0];
  if (!image?.b64_json) throw new Error('Invalid image response: missing image data');

  return {
    imageUrl: `data:${image.media_type || 'image/png'};base64,${image.b64_json}`,
    ...(result.usage && {
      modelUsage: {
        cost: result.usage.cost,
        outputImageTokens: result.usage.completion_tokens,
        totalInputTokens: result.usage.prompt_tokens,
        totalOutputTokens: result.usage.completion_tokens,
        totalTokens: result.usage.total_tokens,
      },
    }),
  };
};
