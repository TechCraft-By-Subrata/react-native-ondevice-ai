const MOCK_DELAY_MS = 700;

function createMockReply(prompt: string) {
  const normalizedPrompt = prompt.toLowerCase();

  if (normalizedPrompt.includes('react native')) {
    return 'React Native lets us build Android and iOS apps using React and native platform components.';
  }

  if (normalizedPrompt.includes('gemma')) {
    return 'Gemma will answer this prompt on the device in a later chapter. For now, this is a mocked response.';
  }

  return `This is a mocked reply to: “${prompt}”`;
}

export function getMockAssistantReply(prompt: string) {
  return new Promise<string>((resolve) => {
    setTimeout(() => {
      resolve(createMockReply(prompt));
    }, MOCK_DELAY_MS);
  });
}