export const DEFAULT_HAIR_COLOR = 6504471;
export const DEFAULT_CLOTHES_COLOR = 14540253;
export const DEFAULT_EYE_COLOR = 9682175;
export const DEFAULT_NAME_COLOR = 16777215;



export const APPEARANCE_OPTIONS = {
  clothes: {
    free: [
      1,2,3,4,5,11
    ],
    premium: [
      6,7,8,9,10,12,13,14,15,16
    ],

    cor_free: [
      14540253, 4958277, 7059967
    ]
  },
  body: {
    free: [
      1, 2, 3, 4, 5, 6, 7, 8
    ],
    premium: [
      9
    ],
    cor_free: [
      51, 52, 53
    ]
  },
  hair: {
    free: [
      1,2,3,4,6,7,8,13
    ],
    premium: [
      5,9,10,11,12,14,15,16,17,18,19,20,21,22
    ],
    cor_free: [
      16772694, 2960169, 6504471
    ]
  },

  // adicionado: 3 cores "free" para olhos (brown, blue, green em decimais)
  colors: {
    eyes: {
      free: [
        9682175,
        11700288,
        8843904
      ]
    }
  }
};

// store original copy for reset
const ORIGINAL_APPEARANCE_OPTIONS = JSON.parse(JSON.stringify(APPEARANCE_OPTIONS));

export let FREE_CLOTHES = APPEARANCE_OPTIONS.clothes?.free || [];
export let PREMIUM_CLOTHES = APPEARANCE_OPTIONS.clothes?.premium || [];

export let FREE_BODY = APPEARANCE_OPTIONS.body?.free || [];
export let PREMIUM_BODY = APPEARANCE_OPTIONS.body?.premium || [];

export let FREE_HAIR = APPEARANCE_OPTIONS.hair?.free || [];
export let PREMIUM_HAIR = APPEARANCE_OPTIONS.hair?.premium || [];

export const AVAILABLE_SPRITES = Array.from({length: 148}, (_, i) => i + 1);

const AVAILABLE_SPRITES_SET = new Set(AVAILABLE_SPRITES);

// Added: initialize exported Sets so validation functions can use them immediately
export let FREE_CLOTHES_SET = new Set(FREE_CLOTHES);
export let PREMIUM_CLOTHES_SET = new Set(PREMIUM_CLOTHES);

export let FREE_BODY_SET = new Set(FREE_BODY);
export let PREMIUM_BODY_SET = new Set(PREMIUM_BODY);

export let FREE_HAIR_SET = new Set(FREE_HAIR);
export let PREMIUM_HAIR_SET = new Set(PREMIUM_HAIR);

// make derived color maps mutable so they can be recomputed
export let FREE_COLORS_BY_TYPE = {
  clothes: [
    ...(APPEARANCE_OPTIONS.colors?.clothes?.free || []),
    ...(APPEARANCE_OPTIONS.clothes?.cor_free || [])
  ],
  hair: [
    ...(APPEARANCE_OPTIONS.colors?.hair?.free || []),
    ...(APPEARANCE_OPTIONS.hair?.cor_free || [])
  ],
  body: [
    ...(APPEARANCE_OPTIONS.colors?.body?.free || []),
    ...(APPEARANCE_OPTIONS.body?.cor_free || [])
  ],
  // make eyes access safe
  eyes: APPEARANCE_OPTIONS.colors?.eyes?.free || [],
  name: [16777215] // Restrict free nameColor to only 16777215
};

export let PREMIUM_COLORS_BY_TYPE = {
  clothes: APPEARANCE_OPTIONS.colors?.clothes?.premium || [],
  hair: APPEARANCE_OPTIONS.colors?.hair?.premium || [],
  body: APPEARANCE_OPTIONS.colors?.body?.premium || [],
  eyes: APPEARANCE_OPTIONS.colors?.eyes?.premium || []
};

// global unions kept for compatibility (also mutable)
export let FREE_COLORS = Array.from(new Set([
  ...FREE_COLORS_BY_TYPE.clothes,
  ...FREE_COLORS_BY_TYPE.hair,
  ...FREE_COLORS_BY_TYPE.body,
  ...FREE_COLORS_BY_TYPE.eyes
]));

export let PREMIUM_COLORS = Array.from(new Set([
  ...PREMIUM_COLORS_BY_TYPE.clothes,
  ...PREMIUM_COLORS_BY_TYPE.hair,
  ...PREMIUM_COLORS_BY_TYPE.body,
  ...PREMIUM_COLORS_BY_TYPE.eyes
]));

// helper: deep merge source into target (mutates target)
function mergeDeep(target, source) {
  console.log('Merging options:', { target, source });
  for (const key of Object.keys(source || {})) {
    const srcVal = source[key];
    const tgtVal = target[key];
    if (Array.isArray(srcVal)) {
      target[key] = srcVal.slice();
    } else if (srcVal && typeof srcVal === 'object') {
      if (!tgtVal || typeof tgtVal !== 'object') target[key] = {};
      mergeDeep(target[key], srcVal);
    } else {
      target[key] = srcVal;
    }
  }
}

// recompute derived color exports from APPEARANCE_OPTIONS
function recomputeColorMaps() {
  console.log('Recomputing color maps...');
  FREE_COLORS_BY_TYPE = {
    clothes: [
      ...(APPEARANCE_OPTIONS.colors?.clothes?.free || []),
      ...(APPEARANCE_OPTIONS.clothes?.cor_free || [])
    ],
    hair: [
      ...(APPEARANCE_OPTIONS.colors?.hair?.free || []),
      ...(APPEARANCE_OPTIONS.hair?.cor_free || [])
    ],
    body: [
      ...(APPEARANCE_OPTIONS.colors?.body?.free || []),
      ...(APPEARANCE_OPTIONS.body?.cor_free || [])
    ],
    eyes: APPEARANCE_OPTIONS.colors?.eyes?.free || [],
    name: [16777215] // Restrict free nameColor to only 16777215
  };

  PREMIUM_COLORS_BY_TYPE = {
    clothes: APPEARANCE_OPTIONS.colors?.clothes?.premium || [],
    hair: APPEARANCE_OPTIONS.colors?.hair?.premium || [],
    body: APPEARANCE_OPTIONS.colors?.body?.premium || [],
    eyes: APPEARANCE_OPTIONS.colors?.eyes?.premium || []
  };

  FREE_COLORS = Array.from(new Set([
    ...FREE_COLORS_BY_TYPE.clothes,
    ...FREE_COLORS_BY_TYPE.hair,
    ...FREE_COLORS_BY_TYPE.body,
    ...FREE_COLORS_BY_TYPE.eyes
  ]));

  PREMIUM_COLORS = Array.from(new Set([
    ...PREMIUM_COLORS_BY_TYPE.clothes,
    ...PREMIUM_COLORS_BY_TYPE.hair,
    ...PREMIUM_COLORS_BY_TYPE.body,
    ...PREMIUM_COLORS_BY_TYPE.eyes
  ]));

  // recompute availability lists (mutable exports) so validations always see current options
  FREE_CLOTHES = APPEARANCE_OPTIONS.clothes?.free || [];
  PREMIUM_CLOTHES = APPEARANCE_OPTIONS.clothes?.premium || [];

  FREE_BODY = APPEARANCE_OPTIONS.body?.free || [];
  PREMIUM_BODY = APPEARANCE_OPTIONS.body?.premium || [];

  FREE_HAIR = APPEARANCE_OPTIONS.hair?.free || [];
  PREMIUM_HAIR = APPEARANCE_OPTIONS.hair?.premium || [];

  // recompute sets for fast membership checks
  FREE_CLOTHES_SET = new Set(FREE_CLOTHES);
  PREMIUM_CLOTHES_SET = new Set(PREMIUM_CLOTHES);

  FREE_BODY_SET = new Set(FREE_BODY);
  PREMIUM_BODY_SET = new Set(PREMIUM_BODY);

  FREE_HAIR_SET = new Set(FREE_HAIR);
  PREMIUM_HAIR_SET = new Set(PREMIUM_HAIR);
}

// public: merge custom options into APPEARANCE_OPTIONS and recompute derived maps
export function configureAppearanceOptions(customOptions = {}) {
  console.log('Configuring appearance options with:', customOptions);
  mergeDeep(APPEARANCE_OPTIONS, customOptions);
  recomputeColorMaps();
  console.log('Updated APPEARANCE_OPTIONS:', APPEARANCE_OPTIONS);
  return APPEARANCE_OPTIONS;
}

// public: reset to original defaults
export function resetAppearanceOptions() {
  console.log('Resetting appearance options to defaults...');
  // replace contents of APPEARANCE_OPTIONS with original copy
  // (mutate so references remain valid)
  const original = JSON.parse(JSON.stringify(ORIGINAL_APPEARANCE_OPTIONS));
  // remove existing keys
  Object.keys(APPEARANCE_OPTIONS).forEach(k => delete APPEARANCE_OPTIONS[k]);
  // assign original keys back
  Object.assign(APPEARANCE_OPTIONS, original);
  recomputeColorMaps();
  console.log('Reset APPEARANCE_OPTIONS:', APPEARANCE_OPTIONS);
  return APPEARANCE_OPTIONS;
}

export function isClothesAllowed(clothes, isPremium) {
  if (FREE_CLOTHES_SET.has(clothes)) return true;
  if (isPremium && PREMIUM_CLOTHES_SET.has(clothes)) return true;
  return false;
}

export function isBodyAllowed(body, isPremium) {
  if (FREE_BODY_SET.has(body)) return true;
  if (isPremium && PREMIUM_BODY_SET.has(body)) return true;
  return false;
}

export function isHairAllowed(hair, isPremium) {
  if (FREE_HAIR_SET.has(hair)) return true;
  if (isPremium && PREMIUM_HAIR_SET.has(hair)) return true;
  return false;
}

export function isColorAllowed(color, type, isPremium) {
  // premium users are allowed all colors
  if (isPremium) return true;

  // if no type provided, fallback to global free list (backwards compat)
  if (!type) {
    if (FREE_COLORS.includes(color)) return true;
    return false;
  }

  const freeList = FREE_COLORS_BY_TYPE[type];
  if (!freeList) return false; // unknown type -> deny

  return freeList.includes(color);
}

export function isSpriteAllowed(sprite, isPremium) {
  if (sprite === -1) return true;
  return AVAILABLE_SPRITES_SET.has(sprite);
}

export function hasActivePremium(player) {
  return (player?.premium || 0) > 0;
}

export function validateAppearanceChanges(changes, isPremium) {
  console.log('Validating appearance changes:', { changes, isPremium });
  if (changes.sprite !== undefined && !isSpriteAllowed(changes.sprite, isPremium)) {
    return { 
      valid: false, 
      reason: 'Invalid sprite/costume ID'
    };
  }
  
  if (changes.body !== undefined && !isBodyAllowed(changes.body, isPremium)) {
    return { 
      valid: false, 
      reason: isPremium ? 'Invalid body ID' : 'Body requires premium or is not available'
    };
  }
  
  if (changes.hair !== undefined && !isHairAllowed(changes.hair, isPremium)) {
    return { 
      valid: false, 
      reason: isPremium ? 'Invalid hair ID' : 'Hair requires premium or is not available'
    };
  }
  
  if (changes.clothes !== undefined && !isClothesAllowed(changes.clothes, isPremium)) {
    return { 
      valid: false, 
      reason: isPremium ? 'Invalid clothes ID' : 'Clothes requires premium or is not available'
    };
  }

  if (changes.clothesColor !== undefined && !isColorAllowed(changes.clothesColor, 'clothes', isPremium)) {
    return { 
      valid: false, 
      reason: isPremium ? 'Invalid clothes color' : 'Clothes color requires premium or is not available'
    };
  }

  if (changes.hairColor !== undefined && !isColorAllowed(changes.hairColor, 'hair', isPremium)) {
    return { 
      valid: false, 
      reason: isPremium ? 'Invalid hair color' : 'Hair color requires premium or is not available'
    };
  }

  if (changes.eyeColor !== undefined && !isColorAllowed(changes.eyeColor, 'eyes', isPremium)) {
    return { 
      valid: false, 
      reason: isPremium ? 'Invalid eye color' : 'Eye color requires premium or is not available'
    };
  }

  if (changes.nameColor !== undefined && !isColorAllowed(changes.nameColor, 'name', isPremium)) {
    return { 
      valid: false, 
      reason: isPremium ? 'Invalid name color' : 'Name color requires premium or is not available'
    };
  }

  const result = { valid: true };
  console.log('Validation result:', result);
  return result;
}
