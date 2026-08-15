import { subraTheme } from '../src/theme';

describe('Subra theme palette', () => {
  it('changes real screen and text tokens between light and dark', () => {
    expect(subraTheme.light.screenBgColor).not.toBe(
      subraTheme.dark.screenBgColor,
    );
    expect(subraTheme.light.textPrimary).not.toBe(
      subraTheme.dark.textPrimary,
    );
  });

  it('uses the requested lime and cyan accent family', () => {
    expect(subraTheme.dark.primaryColor).toBe('#B8F53D');
    expect(subraTheme.dark.accentColor).toBe('#53D6E2');
  });
});
