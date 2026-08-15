export type ExternalLink = Readonly<{
  label: string;
  url: `https://${string}`;
  color: string;
}>;

export const primaryCommunityLinks: readonly ExternalLink[] = [
  {
    label: 'GitHub',
    url: 'https://github.com/TechCraft-By-Subrata',
    color: '#24292F',
  },
  {
    label: 'YouTube',
    url: 'https://www.youtube.com/@techcraftclub',
    color: '#FF0000',
  },
  {
    label: 'LinkedIn',
    url: 'https://www.linkedin.com/in/subraatakumar/',
    color: '#0A66C2',
  },
  {
    label: 'Discord',
    url: 'https://discord.gg/cA5fhVT8',
    color: '#5865F2',
  },
  {
    label: 'RN Mastery',
    url: 'https://rnm.subraatakumar.com/',
    color: '#149EAF',
  },
] as const;

export const moreCommunityLinks: readonly ExternalLink[] = [
  {
    label: 'Instagram',
    url: 'https://www.instagram.com/subraatakumar/',
    color: '#C13584',
  },
  {
    label: 'Reddit',
    url: 'https://www.reddit.com/r/ReactNativeMastery/',
    color: '#FF4500',
  },
  {
    label: 'DEV.to',
    url: 'https://dev.to/subraatakumar',
    color: '#3B4856',
  },
  {
    label: 'WhatsApp',
    url: 'https://whatsapp.com/channel/0029VbCz72vFCCoUsMV4K30M',
    color: '#168C46',
  },
  {
    label: 'Topmate',
    url: 'https://topmate.io/subrata',
    color: '#1D4ED8',
  },
] as const;

// Add the verified, published HTTPS pages here. The Home screen enables each
// legal link automatically when its URL is configured.
export const legalLinks: Readonly<{
  privacyPolicy: `https://${string}` | null;
  termsOfUse: `https://${string}` | null;
}> = {
  privacyPolicy: 'https://subraatakumar.com/subra-ai/privacy-policy/',
  termsOfUse: 'https://subraatakumar.com/subra-ai/terms/',
};
