// The icons of the developer screens: the gallery's, and files that test special cases (narrowed
// to a state: lock, coins, rocket; blend modes: flat-24, gradient-3094).
import download from '../icons/download.json';
import morphAccount from '../icons/dev/morph-account.json';
import morphSelect from '../icons/dev/morph-select.json';
import morphShopping from '../icons/dev/morph-shopping.json';
import puzzle from '../icons/puzzle.json';
import trash from '../icons/trash.json';
import coins from '../icons/dev/coins.json';
import lockAlt from '../icons/dev/lock-alt.json';
import lock from '../icons/dev/lock.json';
import flat24 from '../icons/dev/wired-flat-24-approved-checked-hover-pinch.json';
import gradient3094 from '../icons/dev/wired-gradient-3094-marketing-letter-hover-pinch.json';
import rocket from '../icons/dev/wired-outline-489-rocket-space-hover-flying.json';

export const ICONS: Record<string, object> = {
    lock,
    coins,
    trash,
    download,
    puzzle,
    'lock-alt': lockAlt,
    'morph-select': morphSelect,
    'morph-account': morphAccount,
    'morph-shopping': morphShopping,
    rocket,
    'flat-24': flat24,
    'gradient-3094': gradient3094,
};
export const NAMES = Object.keys(ICONS);
