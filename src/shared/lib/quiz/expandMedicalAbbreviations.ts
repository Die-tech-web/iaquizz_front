const MEDICAL_ABBREVIATIONS: Array<{ token: string; definition: string }> = [
  { token: 'IRC', definition: 'insuffisance renale chronique' },
  { token: 'HTA', definition: 'hypertension arterielle' },
  { token: 'DFG', definition: 'debit de filtration glomerulaire' },
  { token: 'EGFR', definition: 'debit de filtration glomerulaire estime' },
];

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toCaseLike = (source: string, replacement: string) => {
  if (source.toUpperCase() === source) {
    return replacement.toUpperCase();
  }

  const [first = ''] = source;
  if (first === first.toUpperCase()) {
    return `${replacement.charAt(0).toUpperCase()}${replacement.slice(1)}`;
  }

  return replacement;
};

const applyFrenchTypography = (value: string) => {
  if (!value) {
    return value;
  }

  let text = value;

  // Restore French elisions (l equipe -> l'equipe, d un -> d'un, etc.).
  text = text.replace(/\b([ldjtmcsn])\s+([aeiouhyàâäéèêëîïôöùûü])/gi, (_, left, right) => {
    const leftToken = String(left);
    return `${leftToken}'${String(right)}`;
  });

  const replacements: Array<[RegExp, string]> = [
    [/\ba l['’]equipe\b/gi, "à l'équipe"],
    [/\bequipe\b/gi, 'équipe'],
    [/\bpresence\b/gi, 'présence'],
    [/\bprevenir\b/gi, 'prévenir'],
    [/\badapte\b/gi, 'adapté'],
    [/\badaptee\b/gi, 'adaptée'],
    [/\badaptes\b/gi, 'adaptés'],
    [/\btherapeutique\b/gi, 'thérapeutique'],
    [/\badherence\b/gi, 'adhérence'],
    [/\bprevention\b/gi, 'prévention'],
    [/\bsecurite\b/gi, 'sécurité'],
    [/\bcontrole\b/gi, 'contrôle'],
    [/\bcontroles\b/gi, 'contrôles'],
    [/\bcontrolee\b/gi, 'contrôlée'],
    [/\breguliers\b/gi, 'réguliers'],
    [/\bregulier\b/gi, 'régulier'],
    [/\bhygiene\b/gi, 'hygiène'],
    [/\bcomorbidite\b/gi, 'comorbidité'],
    [/\beducatif\b/gi, 'éducatif'],
    [/\brenale\b/gi, 'rénale'],
    [/\breno-metabolique\b/gi, 'réno-métabolique'],
    [/\boedeme\b/gi, 'oedème'],
    [/\bdébit de filtration glomerulaire\b/gi, 'débit de filtration glomérulaire'],
    [/\bestime\b/gi, 'estimé'],
    [/\bdyspnee\b/gi, 'dyspnée'],
    [/\bmarquees\b/gi, 'marquées'],
    [/\becart\b/gi, 'écart'],
    [/\belevee\b/gi, 'élevée'],
    [/\bstructur[eé]\b/gi, 'structuré'],
    [/\binsuffisance renale chronique\b/gi, 'insuffisance rénale chronique'],
  ];

  replacements.forEach(([pattern, replacement]) => {
    text = text.replace(pattern, (match: string) => toCaseLike(match, replacement));
  });

  // Fix common French punctuation spacing before question marks.
  return text.replace(/\s+\?/g, ' ?');
};

const expandOneToken = (text: string, token: string, definition: string) => {
  const pattern = new RegExp(`\\b${escapeRegExp(token)}\\b`, 'gi');

  return text.replace(pattern, (...args) => {
    const match = args[0] as string;
    const offset = args[args.length - 2] as number;
    const source = args[args.length - 1] as string;
    const afterMatch = source.slice(offset + match.length).trimStart();
    if (afterMatch.startsWith('(')) {
      return match;
    }

    return `${match} (${definition})`;
  });
};

export const expandMedicalAbbreviations = (
  text: string,
  options?: { language?: 'fr' | 'en' },
) => {
  if (!text) {
    return text;
  }

  const expanded = MEDICAL_ABBREVIATIONS.reduce((acc, item) => {
    return expandOneToken(acc, item.token, item.definition);
  }, text);

  if (options?.language === 'en') {
    return expanded;
  }

  return applyFrenchTypography(expanded);
};
