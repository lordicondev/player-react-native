import { sourceOf } from '../props';
import { CACHED_ICONS, IconRegistry } from '../registry';
import type { WebSource } from './models';
import { forgetOnPage } from './renderer';
import { forgetInWorkers } from './workers';

let lastSource = 0;

/**
 * Icons in use, as JSON text with a number: each view loads an icon of it in its runtime (the
 * page's, or a render worker's), from a model the icons of one source share.
 */
export const registry = new IconRegistry<WebSource>(
    {
        register: (icon) => ({ id: ++lastSource, json: sourceOf(icon) }),
        release: ({ id }) => {
            forgetOnPage(id);
            forgetInWorkers(id);
        },
    },
    1000,
    CACHED_ICONS,
);
