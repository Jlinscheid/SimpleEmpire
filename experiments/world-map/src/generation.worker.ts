import definitions from '../../../data/world-definitions.json';
import { generateWorld } from '../../../src/core/world/generate';
import { validateDefinitions } from '../../../src/core/world/definitions';
import type { GenerationConfig } from '../../../src/core/world/model';

/** Browser adapter only: the generator itself is equally usable on a server. */
self.onmessage = (event: MessageEvent<{ request: number; config: GenerationConfig }>) => {
  const { request, config } = event.data;
  try {
    const start = performance.now(); validateDefinitions(definitions);
    const world = generateWorld(config, definitions);
    self.postMessage({ request, world, duration: performance.now() - start });
  } catch (error) {
    self.postMessage({ request, error: error instanceof Error ? error.message : String(error) });
  }
};
